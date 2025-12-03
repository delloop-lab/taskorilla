import helpData from './help-content.json'

export interface HelpItem {
  id: string
  category: string
  type: 'faq' | 'guide'
  title: string
  content: string
  tags: string[]
}

export const getAllHelpContent = (): HelpItem[] => {
  return helpData as HelpItem[]
}

export const getCategories = (): string[] => {
  const categories = new Set((helpData as HelpItem[]).map((item: HelpItem) => item.category))
  return Array.from(categories)
}

export const getFAQsByCategory = (category: string): HelpItem[] => {
  return (helpData as HelpItem[]).filter((item: HelpItem) => 
    item.category === category && item.type === 'faq'
  )
}

export const getGuidesByCategory = (category: string): HelpItem[] => {
  return (helpData as HelpItem[]).filter((item: HelpItem) => 
    item.category === category && item.type === 'guide'
  )
}

export const getAllFAQs = (): HelpItem[] => {
  return (helpData as HelpItem[]).filter((item: HelpItem) => item.type === 'faq')
}

export const getAllGuides = (): HelpItem[] => {
  return (helpData as HelpItem[]).filter((item: HelpItem) => item.type === 'guide')
}

export const getGuideBySlug = (slug: string): HelpItem | undefined => {
  return (helpData as HelpItem[]).find((item: HelpItem) => 
    item.type === 'guide' && slugify(item.title) === slug
  )
}

export const searchHelpContent = (query: string): HelpItem[] => {
  const lowerQuery = query.toLowerCase()
  return (helpData as HelpItem[]).filter((item: HelpItem) => {
    return (
      item.title.toLowerCase().includes(lowerQuery) ||
      item.content.toLowerCase().includes(lowerQuery) ||
      item.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    )
  })
}

export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim()
}

export const getCategoryIcon = (category: string): string => {
  const icons: Record<string, string> = {
    'Getting Started': '🚀',
    'Posting Tasks': '📝',
    'Helper Guide': '💼',
    'Payment Guide': '💰',
    'Safety Guide': '🛡️',
    'Platform & Technical': '⚙️',
    'Legal & Privacy': '⚖️'
  }
  return icons[category] || '📚'
}

export const getCategoryDescription = (category: string): string => {
  const descriptions: Record<string, string> = {
    'Getting Started': 'New to Taskorilla? Start here to learn the basics.',
    'Posting Tasks': 'Learn how to post, edit, and manage your tasks.',
    'Helper Guide': 'Everything you need to know about earning as a Helper.',
    'Payment Guide': 'Understand payments, fees, and how to get paid.',
    'Safety Guide': 'Stay safe and protect yourself on the platform.',
    'Platform & Technical': 'Technical help, account issues, and troubleshooting.',
    'Legal & Privacy': 'Policies, data protection, and compliance information.'
  }
  return descriptions[category] || ''
}



