export function toFirstNameInitial(
  fullName: string | null | undefined,
  fallbackEmail?: string | null
): string {
  const trimmed = (fullName ?? '').trim()
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean)
    const first = parts[0] ?? ''
    const last = parts.length > 1 ? parts[parts.length - 1] : ''
    if (first && last) return `${first} ${last.charAt(0).toUpperCase()}.`
    if (first) return first
  }

  const email = (fallbackEmail ?? '').trim()
  if (email.includes('@')) {
    const local = email.split('@')[0].replace(/[._-]+/g, ' ').trim()
    const localParts = local.split(/\s+/).filter(Boolean)
    if (localParts.length >= 2) {
      return `${localParts[0]} ${localParts[1].charAt(0).toUpperCase()}.`
    }
    if (localParts.length === 1 && localParts[0]) return localParts[0]
  }

  return 'User'
}

export function canRevealFullNameForTask(params: {
  viewerId?: string | null
  taskCreatorId?: string | null
  acceptedBidUserIds?: string[] | null
}): boolean {
  const { viewerId, taskCreatorId, acceptedBidUserIds } = params
  if (!viewerId) return false
  if (taskCreatorId && viewerId === taskCreatorId) return true
  if (Array.isArray(acceptedBidUserIds) && acceptedBidUserIds.includes(viewerId)) return true
  return false
}

export function getDisplayName(params: {
  fullName?: string | null
  email?: string | null
  revealFull?: boolean
}): string {
  const { fullName, email, revealFull } = params
  if (revealFull && (fullName ?? '').trim()) return (fullName ?? '').trim()
  return toFirstNameInitial(fullName, email)
}

