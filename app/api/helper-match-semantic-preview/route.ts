import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import {
  EmailPreference,
  MatchingTask,
  MatchingHelper,
  EligibleHelper,
  matchHelpersForTask,
} from '@/lib/helper-matching'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const MODEL = 'text-embedding-3-small'

// Toggle between AI helper classifier vs pure lexical matcher
const USE_AI_HELPER_CLASSIFIER = true as const

// Optional: toggle use of the original lexical matcher for comparison.
// When false, we do not call matchHelpersForTask at all.
const USE_LEXICAL_MATCHER = false as const

function cosineSimilarity(a: number[], b: number[]) {
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

async function getEmbeddings(texts: string[]) {
  const response = await client.embeddings.create({
    model: MODEL,
    input: texts,
  })
  return response.data.map(d => d.embedding as number[])
}

// === handyman / household synonyms map ===
const HANDYMAN_SYNONYMS: Record<string, string[]> = {
  plumbing: [
    'plumber',
    'tap',
    'faucet',
    'pipe',
    'kitchen plumbing',
    'bathroom plumbing',
    'leak',
    'drain',
    'toilet repair',
    'sink repair',
    'water heater',
    'boiler repair',
  ],
  painting: [
    'paint',
    'painting',
    'decorating',
    'walls',
    'ceiling',
    'wall repair',
    'exterior painting',
    'interior painting',
    'stain',
    'varnish',
    'roller',
    'brush',
  ],
  electrical: [
    'electrician',
    'wiring',
    'socket',
    'switch',
    'light',
    'lighting',
    'circuit',
    'outlet',
    'breaker',
    'fan installation',
    'electrical repair',
  ],
  carpentry: [
    'carpenter',
    'woodwork',
    'cabinet',
    'shelves',
    'doors',
    'furniture assembly',
    'desk',
    'drawer',
    'table',
    'chair',
    'wood repair',
    'trim',
    'moulding',
  ],
  flooring: [
    'flooring',
    'tile',
    'tiles',
    'laminate',
    'parquet',
    'hardwood',
    'carpet',
    'floor repair',
    'grout',
    'installation',
  ],
  general_repair: [
    'handyman',
    'repairs',
    'maintenance',
    'odd jobs',
    'general fix',
    'fix',
    'assemble',
    'mount',
    'install',
    'hang',
    'patch',
    'adjust',
  ],
  gardening: [
    'gardening',
    'lawn',
    'mowing',
    'hedge',
    'pruning',
    'plants',
    'trees',
    'bush',
    'garden maintenance',
    'weeding',
    'watering',
  ],
  cleaning: [
    'cleaning',
    'housekeeping',
    'window cleaning',
    'sofa cleaning',
    'chimney cleaning',
    'deep clean',
    'organising',
    'tidy',
    'dusting',
  ],
  appliance: [
    'appliance repair',
    'fridge',
    'oven',
    'microwave',
    'washing machine',
    'dryer',
    'dishwasher',
    'install appliance',
    'fix appliance',
  ],
  moving: [
    'moving',
    'heavy lifting',
    'furniture moving',
    'transport',
    'load',
    'unload',
    'carry',
    'relocate',
  ],
  exterior: [
    'roof',
    'gutter',
    'deck',
    'patio',
    'fence',
    'wall repair',
    'exterior repair',
    'driveway',
    'paving',
  ],
  miscellaneous: [
    'odd jobs',
    'miscellaneous',
    'task',
    'errand',
    'personal assistance',
    'assemble furniture',
    'set up',
    'mount',
    'hang picture',
    'hook',
    'shelf installation',
  ],
  // keep food for cooking / delivery style tasks
  food: [
    'food',
    'meal',
    'meals',
    'cook',
    'cooking',
    'chef',
    'catering',
    'food delivery',
    'meal delivery',
    'takeaway',
    'kitchen help',
  ],
}

// Canonical keywords we expect to see in helper skills for each category.
// We use these (not the long phrases) when matching helpers.
const CATEGORY_SKILL_KEYWORDS: Record<string, string[]> = {
  plumbing: ['plumb', 'plumbing', 'handyman', 'repairs', 'maintenance'],
  painting: ['paint', 'painting', 'decorating'],
  electrical: ['electric', 'electrical', 'electrician', 'wiring'],
  carpentry: ['carpenter', 'carpentry', 'woodwork', 'furniture assembly'],
  flooring: ['flooring', 'tile', 'tiles', 'laminate', 'hardwood', 'carpet'],
  general_repair: ['handyman', 'repairs', 'maintenance', 'odd jobs'],
  gardening: ['garden', 'gardening', 'lawn', 'hedge', 'pruning'],
  cleaning: ['clean', 'cleaning', 'housekeeping'],
  appliance: ['appliance', 'appliance repair', 'repair'],
  moving: ['moving', 'heavy lifting', 'transport'],
  exterior: ['roof', 'gutter', 'deck', 'patio', 'fence', 'exterior'],
  miscellaneous: ['odd jobs', 'miscellaneous', 'general'],
  food: ['food', 'meal', 'meals', 'cook', 'cooking', 'chef', 'catering'],
}

function expandTaskKeywords(taskTitle: string, taskDescription?: string) {
  const text = `${taskTitle} ${taskDescription ?? ''}`.toLowerCase()
  const keywords: Set<string> = new Set()
  Object.entries(HANDYMAN_SYNONYMS).forEach(([category, synonyms]) => {
    const matched = synonyms.some(syn => text.includes(syn.toLowerCase()))
    if (matched) {
      // Add the category itself as a keyword
      keywords.add(category.toLowerCase())
      // And any canonical skill keywords we expect in helper skills
      const skillKws = CATEGORY_SKILL_KEYWORDS[category] || []
      skillKws.forEach(kw => keywords.add(kw.toLowerCase()))
    }
  })
  return Array.from(keywords)
}

function helperMatchesKeywords(helper: MatchingHelper, keywords: string[]) {
  const skillsText = (helper.skills || []).join(' ').toLowerCase()
  return keywords.some(kw => skillsText.includes(kw))
}

type AiClassification = {
  skills: string[]
  professions: string[]
}

async function classifyTaskWithAI(params: {
  title: string
  description?: string
  imageCaption?: string
}): Promise<AiClassification> {
  const { title, description, imageCaption } = params

  // Build a compact, explicit prompt for classification
  const userContent = [
    `You are a helper-task classifier for a local marketplace (like TaskRabbit).`,
    `Given a task, output ONLY a JSON object with two keys: "skills" and "professions".`,
    `- "skills": short phrases like ["plumbing", "painting", "delivery", "cooking", "electrical", "web development"].`,
    `- "professions": short labels like ["handyman", "chef", "gardener", "electrician", "software developer"].`,
    ``,
    `Task title: ${title || '(none)'}`,
    `Task description: ${description || '(none)'}`,
    `Image caption: ${imageCaption || '(none)'}`,
    ``,
    `Return ONLY JSON like:`,
    `{"skills":["plumbing"],"professions":["handyman"]}`,
  ].join('\n')

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      messages: [
        {
          role: 'system',
          content:
            'You classify tasks into helper skills and professions. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: userContent,
        },
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

    const skills = Array.isArray(parsed.skills)
      ? parsed.skills.map((s: any) => String(s)).filter(Boolean)
      : []
    const professions = Array.isArray(parsed.professions)
      ? parsed.professions.map((s: any) => String(s)).filter(Boolean)
      : []

    return { skills, professions }
  } catch (err) {
    console.error('AI helper classifier failed:', err)
    return { skills: [], professions: [] }
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    const url = new URL(request.url)
    const taskId = url.searchParams.get('taskId')
    const imageCaption = url.searchParams.get('imageCaption') || undefined
    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 })
    }

    // Load the task (read-only for this test helper)
    const { data: taskRow, error: taskError } = await supabase
      .from('tasks')
      .select(
        'id, title, description, required_skills, latitude, longitude, is_sample_task, status, hidden_by_admin'
      )
      .eq('id', taskId)
      .single()

    if (taskError || !taskRow) {
      return NextResponse.json(
        { error: 'Task not found', details: taskError?.message },
        { status: 404 }
      )
    }

    const taskDescription: string = (taskRow.description ?? '') as string

    const matchingTask: MatchingTask = {
      id: taskRow.id,
      title: taskRow.title ?? '(no title)',
      tags: Array.isArray(taskRow.required_skills) ? taskRow.required_skills : [],
      lat: typeof taskRow.latitude === 'number' ? taskRow.latitude : undefined,
      lon: typeof taskRow.longitude === 'number' ? taskRow.longitude : undefined,
      amount: undefined,
      createdBy: undefined,
    }

    // Load helpers (read-only)
    const { data: helpersData, error: helpersError } = await supabase
      .from('profiles')
      .select(
        'id, full_name, email, skills, services_offered, professions, preferred_max_distance_km, email_preference, latitude, longitude, is_helper'
      )
      .eq('is_helper', true)
      .limit(200)

    if (helpersError) {
      return NextResponse.json(
        { error: 'Failed to load helpers', details: helpersError.message },
        { status: 500 }
      )
    }

    const helpers: MatchingHelper[] =
      (helpersData as any[] | null)?.map(row => {
        const helperLat =
          row.latitude !== null && row.latitude !== undefined
            ? Number(row.latitude)
            : NaN
        const helperLon =
          row.longitude !== null && row.longitude !== undefined
            ? Number(row.longitude)
            : NaN

        const email = (row.email ?? '').trim()

        const baseSkills = Array.isArray(row.skills) ? row.skills : []
        const serviceSkills = Array.isArray(row.services_offered) ? row.services_offered : []
        const professionSkills = Array.isArray(row.professions) ? row.professions : []
        const skills = Array.from(new Set([...baseSkills, ...serviceSkills, ...professionSkills]))

        const prefDistanceRaw = row.preferred_max_distance_km
        const preferredMaxDistanceKm =
          prefDistanceRaw === null || prefDistanceRaw === undefined
            ? null
            : Number(prefDistanceRaw)

        const emailPrefRaw = (row.email_preference ?? '').toLowerCase()
        const emailPreference: EmailPreference =
          emailPrefRaw === 'daily' || emailPrefRaw === 'weekly'
            ? emailPrefRaw
            : 'instant'

        return {
          id: row.id,
          name: row.full_name ?? '(no name)',
          skills,
          lat: helperLat,
          lon: helperLon,
          available:
            !!row.is_helper &&
            Number.isFinite(helperLat) &&
            Number.isFinite(helperLon),
          email,
          emailPreference,
          preferredMaxDistanceKm,
        } as MatchingHelper
      }) ?? []

    // Optionally compute lexical matches using existing logic for comparison
    const lexicalMatches: EligibleHelper[] = USE_LEXICAL_MATCHER
      ? matchHelpersForTask(matchingTask, helpers)
      : []

    let aiCandidates: MatchingHelper[] = []

    if (USE_AI_HELPER_CLASSIFIER) {
      const classification = await classifyTaskWithAI({
        title: matchingTask.title,
        description: taskDescription,
        imageCaption,
      })

      const labels = new Set(
        [...classification.skills, ...classification.professions].map(s => s.toLowerCase())
      )

      if (labels.size > 0) {
        aiCandidates = helpers.filter(helper => {
          const skillsText = (helper.skills || []).join(' ').toLowerCase()
          return Array.from(labels).some(lbl => skillsText.includes(lbl))
        })
      }
    }

    // If AI classifier turned off or produced nothing useful, fall back to lexical candidates
    if (!USE_AI_HELPER_CLASSIFIER || aiCandidates.length === 0) {
      aiCandidates = lexicalMatches.length
        ? lexicalMatches.map(h => h as MatchingHelper)
        : []
    }

    let aiMatches: (MatchingHelper & { semanticScore?: number })[] = []

    if (aiCandidates.length > 0) {
      // Semantic re‑ranking using OpenAI embeddings (title + description + tags)
      const tagsText = (matchingTask.tags || []).join(', ')
      const descText = taskDescription?.trim()
        ? ` Description: ${taskDescription.trim()}`
        : ''
      const taskText = `Task: ${matchingTask.title}. Tags: ${tagsText}.${descText}`

      const helperTexts = aiCandidates.map(
        h => `Helper: ${h.name}. Skills: ${(h.skills || []).join(', ')}`
      )

      const allTexts = [taskText, ...helperTexts]
      const embeddings = await getEmbeddings(allTexts)
      const taskEmb = embeddings[0]
      const helperEmbs = embeddings.slice(1)

      const scored = aiCandidates.map((helper, idx) => ({
        helper,
        score: cosineSimilarity(taskEmb, helperEmbs[idx]),
      }))

      scored.sort((a, b) => b.score - a.score)

      aiMatches = scored.map(s => ({
        ...s.helper,
        semanticScore: s.score,
      }))
    }

    // For backward compatibility with the existing test page, expose `matches`
    // as whichever set we're currently focusing on (AI when enabled, otherwise lexical).
    const matchesForUi =
      USE_AI_HELPER_CLASSIFIER && aiMatches.length > 0
        ? aiMatches
        : lexicalMatches

    return NextResponse.json({
      task: matchingTask,
      matches: matchesForUi,
      aiMatches,
      lexicalMatches,
    })
  } catch (error: any) {
    console.error('Error in helper-match-semantic-preview API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

