export function slugify(value: string | null | undefined): string {
  if (!value) return ''
  const trimmed = value.trim()
  if (!trimmed) return ''

  return trimmed
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

export function slugifyTitle(title: string): string {
  return slugify(title) || 'task'
}

export function slugifyLocationCity(city: string | null | undefined): string {
  return slugify(city || '') || 'portugal'
}

export function deriveLocationCity(location: string | null | undefined): string | null {
  if (!location) return null
  const trimmed = location.trim()
  if (!trimmed) return null
  if (trimmed.includes(',')) {
    return trimmed.split(',')[0].trim() || null
  }
  return trimmed
}

export function buildTaskSlug(task: { id: string | number; title: string; locationCity: string | null }): string {
  const titlePart = slugifyTitle(task.title)
  const cityPart = slugifyLocationCity(task.locationCity)
  const idPart = String(task.id)
  // Use a double-hyphen separator before the id so that
  // UUIDs containing hyphens are preserved correctly.
  // Example: need-a-plumber-lagos--b308ecc7-268e-4b0d-9c86-18cf9e0c0378
  return `${titlePart}-${cityPart}--${idPart}`
}

export function parseTaskIdFromSlug(slug: string): string | null {
  if (!slug) return null
  const marker = '--'
  const idx = slug.lastIndexOf(marker)
  if (idx === -1) return null
  const idPart = slug.slice(idx + marker.length).trim()
  return idPart || null
}

