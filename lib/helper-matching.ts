export type EmailPreference = 'instant' | 'daily' | 'weekly'

export interface MatchingTask {
  id: string
  title: string
  tags: string[]
  lat?: number
  lon?: number
  amount?: number
  createdBy?: string
  description?: string
  requiredProfessions?: string[]
}

export interface MatchingHelper {
  id: string
  name: string
  skills: string[]
  lat: number
  lon: number
  available: boolean
  email: string
  emailPreference: EmailPreference
  preferredMaxDistanceKm?: number | null
  bio?: string
  professions?: string[]
}

export interface EligibleHelper extends MatchingHelper {
  distanceKm?: number
}

export interface ScoredHelper extends EligibleHelper {
  compositeScore: number
  semanticScore: number
  distanceScore: number
  professionScore: number
  skillScore: number
  profileScore: number
}

export const haversineKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180

  const R = 6371 // Earth radius in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Core matching logic used by both the helper‑match test page and
 * server‑side preview endpoints.
 *
 * - Builds keywords from tags + meaningful title words
 * - Matches helpers by skills / services / professions (exact, substring, fuzzy)
 * - Excludes the task creator from results
 * - Computes distance when both task and helper have coordinates
 * - Applies each helper's preferredMaxDistanceKm (if set)
 */
export const matchHelpersForTask = (
  task: MatchingTask,
  helpers: MatchingHelper[]
): EligibleHelper[] => {
  const { tags, title, lat: taskLat, lon: taskLon, createdBy } = task
  const hasLocation =
    typeof taskLat === 'number' && !Number.isNaN(taskLat) &&
    typeof taskLon === 'number' && !Number.isNaN(taskLon)

  // Build primary match keywords from explicit task tags/required_skills.
  // Only fall back to title words if there are no tags.
  const normalizedTags = (tags || [])
    .map(t => (t ?? '').toString().toLowerCase().trim())
    .filter(Boolean)

  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'from', 'into', 'onto', 'over', 'under',
    'between', 'to', 'in', 'on', 'of', 'a', 'an', 'my', 'your', 'our',
    'their', 'his', 'her', 'at', 'by', 'about', 'as', 'up', 'down', 'out',
  ])

  const rawTitle = (title || '').toLowerCase()

  const titleWords = rawTitle
    .split(/[^a-z0-9]+/)
    .filter(w => w.length >= 4 && !stopWords.has(w))

  // Start with deduped title words
  let titleKeywords = Array.from(new Set(titleWords))

  // Domain-specific synonym expansion:
  // If the task title clearly looks like a plumbing/tap/pipe issue,
  // inject virtual tags like "handyman" and "repairs" so that generic
  // handyman skill sets can still match.
  const plumbingHints = [
    'plumb',
    'pipe',
    'pipes',
    'tap',
    'faucet',
    'leak',
    'leaky',
    'sink',
    'drain',
    'toilet',
    'bathroom',
    'bath',
    'shower',
  ]

  if (plumbingHints.some(h => rawTitle.includes(h))) {
    titleKeywords.push('handyman', 'repairs', 'maintenance', 'plumbing')
    titleKeywords = Array.from(new Set(titleKeywords))
  }

  // If we have explicit tags, use ONLY those for matching.
  // If there are no tags, fall back to cleaned (and possibly enriched) title words.
  const keywords = normalizedTags.length > 0
    ? normalizedTags
    : titleKeywords

  // If there is nothing meaningful to match on, don't match any helpers.
  if (!keywords.length) {
    return []
  }

  const keywordSet = new Set(keywords)

  const hasTagOverlap = (skills: string[]) => {
    if (!skills || skills.length === 0) return false

    const normalizedSkills = skills
      .filter(Boolean)
      .map(s => s.toLowerCase())

    // Tokenize helper skills into individual words for stricter comparison.
    const skillTokens: string[] = []
    for (const skill of normalizedSkills) {
      const parts = skill.split(/[^a-z0-9]+/)
      for (const part of parts) {
        if (part.length >= 2) {
          skillTokens.push(part)
        }
      }
    }

    // 1) Exact token overlap vs task keywords.
    if (skillTokens.some(token => keywordSet.has(token))) {
      return true
    }

    // 2) Conservative substring match where BOTH sides are reasonably specific.
    //    e.g. "housekeeping" vs "deep housekeeping"
    for (const kw of keywords) {
      if (kw.length < 4) continue
      for (const token of skillTokens) {
        if (token.length < 4) continue
        if (token.includes(kw) || kw.includes(token)) {
          return true
        }
      }
    }

    return false
  }

  const baseMatched: EligibleHelper[] = helpers
    .filter(helper => helper.available)
    // Never match the task creator to their own task.
    .filter(helper => !createdBy || helper.id !== createdBy)
    .filter(helper => hasTagOverlap(helper.skills))
    .map<EligibleHelper>(helper => {
      if (!hasLocation) return helper

      const distanceKm = haversineKm(taskLat!, taskLon!, helper.lat, helper.lon)
      return { ...helper, distanceKm }
    })

  // Apply per-helper preferredMaxDistanceKm filter on top of base matching.
  const distanceFiltered = baseMatched.filter(helper => {
    const max = helper.preferredMaxDistanceKm
    const dist = helper.distanceKm

    if (max && max > 0 && typeof dist === 'number') {
      return dist <= max
    }

    // If helper has a max distance but this task has no distance, treat as out of range.
    if (max && max > 0 && typeof dist !== 'number') {
      return false
    }

    // No max distance preference set: allow.
    return true
  })

  return distanceFiltered
}

