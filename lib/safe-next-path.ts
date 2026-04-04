/**
 * Validates an internal redirect path for post-auth flows (email confirm, OAuth).
 * Prevents open redirects and protocol-relative URLs.
 */
export function getSafeInternalPath(
  raw: string | null | undefined,
  fallback: string
): string {
  if (!raw || typeof raw !== 'string') return fallback
  const trimmed = raw.trim()
  if (!trimmed.startsWith('/')) return fallback
  if (trimmed.startsWith('//')) return fallback
  if (trimmed.includes('://')) return fallback
  if (trimmed.length > 512) return fallback
  if (/[\x00-\x1f\x7f]/.test(trimmed)) return fallback
  return trimmed
}
