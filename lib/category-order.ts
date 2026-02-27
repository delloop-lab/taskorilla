/**
 * Display order for main categories in task create/edit dropdowns.
 * Users see categories in this order. "Other" is always last.
 */
export const CATEGORY_DISPLAY_ORDER: string[] = [
  'personal-lifestyle-services', // Business & Professional Services
  'cleaning-home-services',
  'health-beauty-wellbeing',     // Health & Beauty
  'home-garden',
  'handyman-maintenance',
  'events-photography-media',
  'moving-delivery',
  'tutoring-lessons',
  'tech-it',
  'other',
]

export function sortCategoriesByDisplayOrder<T extends { slug: string }>(categories: T[]): T[] {
  return [...categories].sort((a, b) => {
    const aIdx = CATEGORY_DISPLAY_ORDER.indexOf(a.slug)
    const bIdx = CATEGORY_DISPLAY_ORDER.indexOf(b.slug)
    const aOrder = aIdx === -1 ? 999 : aIdx
    const bOrder = bIdx === -1 ? 999 : bIdx
    return aOrder - bOrder
  })
}
