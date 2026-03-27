import OpenAI from 'openai'
import {
  MatchingTask,
  MatchingHelper,
  ScoredHelper,
  haversineKm,
} from './helper-matching'

const EMBEDDING_MODEL = 'text-embedding-3-small'
const CLASSIFIER_MODEL = 'gpt-4o-mini'

const DISTANCE_NORMALIZATION_KM = 100

const WEIGHTS = {
  semantic: 0.40,
  distance: 0.25,
  profession: 0.15,
  skill: 0.10,
  profile: 0.10,
} as const

const MIN_SCORE_THRESHOLD = 25

export interface AiClassification {
  skills: string[]
  professions: string[]
}

export interface ScoreResult {
  helpers: ScoredHelper[]
  aiClassification: AiClassification
}

function inferBrandIntent(task: MatchingTask): AiClassification {
  const haystack = [
    task.title || '',
    task.description || '',
    ...(task.tags || []),
  ]
    .join(' ')
    .toLowerCase()

  const skills: string[] = []
  const professions: string[] = []

  // Brand intent rules: IKEA tasks are usually furniture assembly/mounting.
  if (haystack.includes('ikea')) {
    skills.push('furniture assembly', 'assembly', 'wall mounting', 'drilling', 'handyman', 'repairs')
    professions.push('furniture assembler', 'handyman')
  }

  return {
    skills: Array.from(new Set(skills)),
    professions: Array.from(new Set(professions)),
  }
}

function getOpenAIClient(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] ** 2
    normB += b[i] ** 2
  }
  if (!normA || !normB) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Raw cosine similarity from embeddings typically clusters in the
 * 0.4–0.95 range. Rescale so that 0.50 → 0 and 0.90 → 1 to make
 * the score more discriminating between good and poor matches.
 */
function normalizeSemanticScore(raw: number): number {
  const MIN_COS = 0.50
  const MAX_COS = 0.90
  return Math.max(0, Math.min(1, (raw - MIN_COS) / (MAX_COS - MIN_COS)))
}

async function classifyTaskWithAI(
  client: OpenAI,
  title: string,
  description?: string,
): Promise<AiClassification> {
  const userContent = [
    `You are a helper-task classifier for a local marketplace (like TaskRabbit).`,
    `Given a task, output ONLY a JSON object with two keys: "skills" and "professions".`,
    `- "skills": relevant short skill phrases like ["plumbing", "painting", "delivery", "cooking", "electrical", "web development"].`,
    `- "professions": helper profession labels like ["handyman", "chef", "gardener", "electrician", "software developer"].`,
    ``,
    `Be thorough: include all plausibly relevant skills and professions, including related/adjacent ones.`,
    `For example, a "fix my leaking tap" task should include skills like ["plumbing", "repairs", "maintenance"]`,
    `and professions like ["plumber", "handyman"].`,
    `If the task mentions IKEA, include assembly-related outputs such as "furniture assembly", "wall mounting",`,
    `"drilling", and professions like "furniture assembler" or "handyman" unless context clearly says otherwise.`,
    ``,
    `Task title: ${title || '(none)'}`,
    `Task description: ${description || '(none)'}`,
    ``,
    `Return ONLY JSON like:`,
    `{"skills":["plumbing","repairs"],"professions":["plumber","handyman"]}`,
  ].join('\n')

  try {
    const completion = await client.chat.completions.create({
      model: CLASSIFIER_MODEL,
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: 'You classify tasks into helper skills and professions. Always respond with valid JSON only.',
        },
        { role: 'user', content: userContent },
      ],
    })

    const raw = completion.choices?.[0]?.message?.content ?? ''
    const trimmed = raw.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim()

    let parsed: any
    try {
      parsed = JSON.parse(trimmed || raw)
    } catch {
      parsed = {}
    }

    return {
      skills: Array.isArray(parsed.skills)
        ? parsed.skills.map((s: any) => String(s)).filter(Boolean)
        : [],
      professions: Array.isArray(parsed.professions)
        ? parsed.professions.map((s: any) => String(s)).filter(Boolean)
        : [],
    }
  } catch (err) {
    console.error('[ai-matching] Task classification failed:', err)
    return { skills: [], professions: [] }
  }
}

async function getEmbeddings(client: OpenAI, texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  })
  return response.data.map(d => d.embedding as number[])
}

function buildTaskText(task: MatchingTask, classification: AiClassification): string {
  const parts: string[] = [`Task: ${task.title}`]

  if (task.description?.trim()) {
    parts.push(`Description: ${task.description.trim()}`)
  }

  const tags = (task.tags || []).filter(Boolean)
  if (tags.length > 0) {
    parts.push(`Skills needed: ${tags.join(', ')}`)
  }

  const reqProfs = (task.requiredProfessions || []).filter(Boolean)
  if (reqProfs.length > 0) {
    parts.push(`Professions needed: ${reqProfs.join(', ')}`)
  }

  if (classification.skills.length > 0) {
    parts.push(`Related skills: ${classification.skills.join(', ')}`)
  }
  if (classification.professions.length > 0) {
    parts.push(`Related professions: ${classification.professions.join(', ')}`)
  }

  return parts.join('. ')
}

function buildHelperText(helper: MatchingHelper): string {
  const parts: string[] = [`Helper: ${helper.name}`]

  if (helper.bio?.trim()) {
    parts.push(`Bio: ${helper.bio.trim()}`)
  }

  const skills = (helper.skills || []).filter(Boolean)
  if (skills.length > 0) {
    parts.push(`Skills: ${skills.join(', ')}`)
  }

  const profs = (helper.professions || []).filter(Boolean)
  if (profs.length > 0) {
    parts.push(`Professions: ${profs.join(', ')}`)
  }

  return parts.join('. ')
}

function computeDistanceScore(
  task: MatchingTask,
  helper: MatchingHelper,
): { score: number; distanceKm?: number } {
  const taskHasLocation =
    typeof task.lat === 'number' && !Number.isNaN(task.lat) &&
    typeof task.lon === 'number' && !Number.isNaN(task.lon)
  const helperHasLocation =
    Number.isFinite(helper.lat) && Number.isFinite(helper.lon)

  if (!taskHasLocation || !helperHasLocation) {
    return { score: 0.5 }
  }

  const distanceKm = haversineKm(task.lat!, task.lon!, helper.lat, helper.lon)
  const score = Math.max(0, 1 - distanceKm / DISTANCE_NORMALIZATION_KM)
  return { score, distanceKm }
}

function computeProfessionScore(
  task: MatchingTask,
  helper: MatchingHelper,
  classification: AiClassification,
): number {
  const requiredRaw = [
    ...(task.requiredProfessions || []),
    ...classification.professions,
  ]
  const required = Array.from(new Set(
    requiredRaw.map(p => p.toLowerCase().trim()).filter(Boolean)
  ))

  if (required.length === 0) return 0.5

  const helperProfs = (helper.professions || []).map(p => p.toLowerCase().trim())
  const helperSkills = (helper.skills || []).map(s => s.toLowerCase().trim())
  const helperAll = [...helperProfs, ...helperSkills]

  let matchCount = 0
  for (const req of required) {
    const matched = helperAll.some(hp =>
      hp.includes(req) || req.includes(hp)
    )
    if (matched) matchCount++
  }

  return matchCount / required.length
}

function computeSkillScore(
  task: MatchingTask,
  helper: MatchingHelper,
  classification: AiClassification,
): number {
  const taskKeywordsRaw = [
    ...(task.tags || []),
    ...classification.skills,
  ]
  const taskKeywords = Array.from(new Set(
    taskKeywordsRaw
      .map(k => k.toLowerCase().trim())
      .filter(k => k.length >= 2)
  ))

  if (taskKeywords.length === 0) return 0.5

  const helperSkillTokens: string[] = []
  for (const skill of (helper.skills || [])) {
    const parts = skill.toLowerCase().split(/[^a-z0-9]+/)
    for (const part of parts) {
      if (part.length >= 2) helperSkillTokens.push(part)
    }
  }

  let matchCount = 0
  for (const kw of taskKeywords) {
    const matched = helperSkillTokens.some(token =>
      token.includes(kw) || kw.includes(token)
    )
    if (matched) matchCount++
  }

  return matchCount / taskKeywords.length
}

function computeProfileScore(helper: MatchingHelper): number {
  let score = 0
  if (helper.bio?.trim()) score += 0.25
  if ((helper.skills || []).length > 0) score += 0.25
  if ((helper.professions || []).length > 0) score += 0.25
  if (Number.isFinite(helper.lat) && Number.isFinite(helper.lon)) score += 0.25
  return score
}

/**
 * AI-powered helper matching engine.
 *
 * Uses GPT-4o-mini for task classification and text-embedding-3-small
 * for semantic similarity scoring. Combines with distance, profession
 * match, skill overlap, and profile completeness for a composite score
 * on a 0–100 scale.
 *
 * Returns helpers sorted by composite score (highest first), filtered
 * to a minimum threshold. The caller should catch errors and fall back
 * to the lexical matcher in lib/helper-matching.ts.
 */
export async function scoreHelpersForTask(
  task: MatchingTask,
  helpers: MatchingHelper[],
): Promise<ScoreResult> {
  const client = getOpenAIClient()

  // Step 1: Basic eligibility (available, not the task creator)
  const eligible = helpers.filter(h => {
    if (!h.available) return false
    if (task.createdBy && h.id === task.createdBy) return false
    return true
  })

  // Step 2: Distance pre-filter (respect each helper's preferred max distance)
  const taskHasLocation =
    typeof task.lat === 'number' && !Number.isNaN(task.lat) &&
    typeof task.lon === 'number' && !Number.isNaN(task.lon)

  const distanceEligible = eligible.filter(helper => {
    const max = helper.preferredMaxDistanceKm
    if (!max || max <= 0) return true
    if (!taskHasLocation || !Number.isFinite(helper.lat) || !Number.isFinite(helper.lon)) {
      return false
    }
    const dist = haversineKm(task.lat!, task.lon!, helper.lat, helper.lon)
    return dist <= max
  })

  // Step 3: Classify the task with AI
  const aiClassification = await classifyTaskWithAI(
    client,
    task.title,
    task.description,
  )
  const brandIntent = inferBrandIntent(task)
  const mergedClassification: AiClassification = {
    skills: Array.from(new Set([...aiClassification.skills, ...brandIntent.skills])),
    professions: Array.from(new Set([...aiClassification.professions, ...brandIntent.professions])),
  }

  // Step 4: Build text representations and get embeddings
  const taskText = buildTaskText(task, mergedClassification)
  const helperTexts = distanceEligible.map(h => buildHelperText(h))

  let taskEmbedding: number[] | null = null
  let helperEmbeddings: number[][] = []

  if (distanceEligible.length > 0) {
    try {
      const allEmbeddings = await getEmbeddings(client, [taskText, ...helperTexts])
      taskEmbedding = allEmbeddings[0]
      helperEmbeddings = allEmbeddings.slice(1)
    } catch (err) {
      console.error('[ai-matching] Embedding call failed, proceeding without semantic scores:', err)
    }
  }

  // Step 5: Compute scores for each helper
  const scored: ScoredHelper[] = distanceEligible.map((helper, idx) => {
    let semanticScore = 0.5
    if (taskEmbedding && helperEmbeddings[idx]) {
      const rawCosine = cosineSimilarity(taskEmbedding, helperEmbeddings[idx])
      semanticScore = normalizeSemanticScore(rawCosine)
    }

    const { score: distanceScore, distanceKm } = computeDistanceScore(task, helper)

    const professionScore = computeProfessionScore(task, helper, mergedClassification)
    const skillScore = computeSkillScore(task, helper, mergedClassification)
    const profileScore = computeProfileScore(helper)

    const compositeScore = Math.round(
      (
        WEIGHTS.semantic * semanticScore +
        WEIGHTS.distance * distanceScore +
        WEIGHTS.profession * professionScore +
        WEIGHTS.skill * skillScore +
        WEIGHTS.profile * profileScore
      ) * 100
    )

    return {
      ...helper,
      distanceKm,
      compositeScore,
      semanticScore: Math.round(semanticScore * 100) / 100,
      distanceScore: Math.round(distanceScore * 100) / 100,
      professionScore: Math.round(professionScore * 100) / 100,
      skillScore: Math.round(skillScore * 100) / 100,
      profileScore: Math.round(profileScore * 100) / 100,
    }
  })

  // Step 6: Sort by composite score descending, apply threshold
  scored.sort((a, b) => b.compositeScore - a.compositeScore)
  const filtered = scored.filter(h => h.compositeScore >= MIN_SCORE_THRESHOLD)

  return {
    helpers: filtered,
    aiClassification: mergedClassification,
  }
}
