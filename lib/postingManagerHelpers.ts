import type {
  GroupPostingMeta,
  PostingGroup,
  PostingPost,
  PostingTemplate,
  PostingPlatform,
  PostingComment,
  CommentStats,
} from './postingManagerTypes'

export function calculateGroupPostingMeta(
  group: PostingGroup,
  allPosts: PostingPost[]
): GroupPostingMeta {
  const postsForGroup = allPosts.filter((p) => p.group_id === group.id)

  if (postsForGroup.length === 0) {
    return {
      groupId: group.id,
      lastPost: null,
      nextAllowedDate: null,
      status: 'never',
      canPost: true,
    }
  }

  const sorted = [...postsForGroup].sort(
    (a, b) => new Date(b.date_posted).getTime() - new Date(a.date_posted).getTime()
  )
  const lastPost = sorted[0]

  const days = Number.isFinite(group.days_between_posts)
    ? Math.max(0, group.days_between_posts)
    : 0

  const lastDate = new Date(lastPost.date_posted)
  const nextAllowed = new Date(lastDate)
  if (days > 0) {
    nextAllowed.setDate(nextAllowed.getDate() + days)
  }

  const now = new Date()
  const canPost = days === 0 || now >= nextAllowed

  return {
    groupId: group.id,
    lastPost,
    nextAllowedDate: nextAllowed.toISOString(),
    status: canPost ? 'ready' : 'waiting',
    canPost,
  }
}

export function getStatusColor(status: 'never' | 'ready' | 'waiting'): string {
  if (status === 'ready') return 'green'
  if (status === 'waiting') return 'red'
  return 'orange'
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function exportToCsv(filename: string, rows: Record<string, any>[]): void {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const escape = (v: any) => {
    if (v === null || v === undefined) return ''
    const str = String(v)
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }
  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ].join('\n')

  if (typeof window === 'undefined') return

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (!lines.length) return { headers: [], rows: [] }

  const parseLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
    result.push(current)
    return result
  }

  const headers = parseLine(lines[0])
  const rows = lines.slice(1).map((line) => {
    const values = parseLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? ''
    })
    return row
  })

  return { headers, rows }
}

export function getNextTemplateForGroup(options: {
  groupId: string
  platform: PostingPlatform | string
  templates: PostingTemplate[]
  posts: PostingPost[]
}): PostingTemplate | null {
  const { groupId, platform, templates, posts } = options
  const platformTemplates = templates.filter(
    (t) => t.platform === platform || t.platform === String(platform)
  )
  if (platformTemplates.length === 0) return null

  const usedTemplateIds = new Set(
    posts
      .filter((p) => p.group_id === groupId && p.template_id)
      .map((p) => p.template_id as string)
  )

  const unused = platformTemplates.filter((t) => !usedTemplateIds.has(t.id))
  if (unused.length > 0) {
    return unused.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )[0]
  }

  const postsWithTemplate = posts
    .filter((p) => p.group_id === groupId && p.template_id)
    .sort((a, b) => new Date(a.date_posted).getTime() - new Date(b.date_posted).getTime())

  const oldestTemplateId = postsWithTemplate[0]?.template_id
  const found = platformTemplates.find((t) => t.id === oldestTemplateId)
  return found || platformTemplates[0] || null
}

export function calculateCommentStatsForGroup(
  group: PostingGroup,
  allComments: PostingComment[]
): CommentStats {
  const comments = allComments
    .filter((c) => c.group_id === group.id)
    .sort((a, b) => new Date(b.date_commented).getTime() - new Date(a.date_commented).getTime())

  if (comments.length === 0) {
    return {
      groupId: group.id,
      lastCommentDate: null,
      lastCommentNotes: null,
      totalThisWeek: 0,
      nextAllowedDate: null,
      canComment: true,
    }
  }

  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - 7)

  let totalThisWeek = 0
  for (const c of comments) {
    const d = new Date(c.date_commented)
    if (d >= startOfWeek && d <= now) {
      totalThisWeek += c.number_of_comments || 0
    } else if (d < startOfWeek) {
      break
    }
  }

  const last = comments[0]
  return {
    groupId: group.id,
    lastCommentDate: last.date_commented,
    lastCommentNotes: last.notes || null,
    totalThisWeek,
    nextAllowedDate: (() => {
      const days = Number.isFinite(group.days_between_posts)
        ? Math.max(0, group.days_between_posts)
        : 0
      if (days === 0) return null
      const lastDate = new Date(last.date_commented)
      const next = new Date(lastDate)
      next.setDate(next.getDate() + days)
      return next.toISOString()
    })(),
    canComment: (() => {
      const days = Number.isFinite(group.days_between_posts)
        ? Math.max(0, group.days_between_posts)
        : 0
      if (days === 0) return true
      const lastDate = new Date(last.date_commented)
      const next = new Date(lastDate)
      next.setDate(next.getDate() + days)
      const now = new Date()
      return now >= next
    })(),
  }
}

export function getCommentStatusColor(
  totalThisWeek: number,
  canComment: boolean
): 'green' | 'orange' | 'red' {
  if (!canComment) return 'red'
  if (totalThisWeek >= 30) return 'orange'
  return 'green'
}

