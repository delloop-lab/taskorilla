export type TaskTypeSource = {
  required_professions?: unknown
  required_skills?: unknown
}

function normalizeToken(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function toSortedUniqueTokens(values: unknown[]): string[] {
  const tokens = values
    .map(normalizeToken)
    .filter(Boolean)
  return Array.from(new Set(tokens)).sort()
}

export function buildTaskTypeKey(task: TaskTypeSource, tagNames: string[] = []): string {
  const professions = toSortedUniqueTokens(
    Array.isArray(task.required_professions) ? task.required_professions : []
  )
  const skillHints = toSortedUniqueTokens(
    Array.isArray(task.required_skills) ? task.required_skills : []
  )
  const tags = toSortedUniqueTokens(tagNames)

  const professionPart = professions.length > 0 ? professions.join('|') : 'none'
  const tagPart = toSortedUniqueTokens([...skillHints, ...tags]).join('|') || 'none'
  return `prof:${professionPart};tags:${tagPart}`
}

