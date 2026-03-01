import helpDataEn from './help-content.json'
import helpDataPt from './help-content-pt.json'

export interface HelpItem {
  id: string
  category: string
  type: 'faq' | 'guide'
  title: string
  content: string
  guideSlug?: string
  tags: string[]
}

export type Language = 'en' | 'pt'

const getHelpData = (language: Language = 'en'): HelpItem[] => {
  return language === 'pt' ? helpDataPt as HelpItem[] : helpDataEn as HelpItem[]
}

export const getAllHelpContent = (language: Language = 'en'): HelpItem[] => {
  return getHelpData(language)
}

export const getCategories = (language: Language = 'en'): string[] => {
  const data = getHelpData(language)
  const categories = new Set(data.map((item: HelpItem) => item.category))
  return Array.from(categories)
}

export const getFAQsByCategory = (category: string, language: Language = 'en'): HelpItem[] => {
  const data = getHelpData(language)
  return data.filter((item: HelpItem) => 
    item.category === category && item.type === 'faq'
  )
}

export const getGuidesByCategory = (category: string, language: Language = 'en'): HelpItem[] => {
  const data = getHelpData(language)
  return data.filter((item: HelpItem) => 
    item.category === category && item.type === 'guide'
  )
}

export const getAllFAQs = (language: Language = 'en'): HelpItem[] => {
  const data = getHelpData(language)
  return data.filter((item: HelpItem) => item.type === 'faq')
}

export const getAllGuides = (language: Language = 'en'): HelpItem[] => {
  const data = getHelpData(language)
  return data.filter((item: HelpItem) => item.type === 'guide')
}

export const getGuideBySlug = (slug: string, language: Language = 'en'): HelpItem | undefined => {
  const data = getHelpData(language)
  return data.find((item: HelpItem) => 
    item.type === 'guide' && slugify(item.title) === slug
  )
}

export const searchHelpContent = (query: string, language: Language = 'en'): HelpItem[] => {
  const data = getHelpData(language)
  const lowerQuery = query.toLowerCase()
  return data.filter((item: HelpItem) => {
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
    // English
    'Getting Started': '🚀',
    'Posting Tasks': '📝',
    'Helper Guide': '💼',
    'Payment Guide': '💰',
    'Safety Guide': '🛡️',
    'Platform & Technical': '⚙️',
    'Legal & Privacy': '⚖️',
    // Portuguese
    'Primeiros Passos': '🚀',
    'Publicar Tarefas': '📝',
    'Guia do Ajudante': '💼',
    'Guia de Pagamento': '💰',
    'Guia de Segurança': '🛡️',
    'Plataforma e Técnico': '⚙️',
    'Legal e Privacidade': '⚖️'
  }
  return icons[category] || '📚'
}

export const getCategoryDescription = (category: string, language: Language = 'en'): string => {
  const descriptionsEn: Record<string, string> = {
    'Getting Started': 'New to Taskorilla? Start here to learn the basics.',
    'Posting Tasks': 'Learn how to post, edit, and manage your tasks.',
    'Helper Guide': 'Everything you need to know about earning as a Helper.',
    'Payment Guide': 'Understand payments, fees, and how to get paid.',
    'Safety Guide': 'Stay safe and protect yourself on the platform.',
    'Platform & Technical': 'Technical help, account issues, and troubleshooting.',
    'Legal & Privacy': 'Policies, data protection, and compliance information.'
  }
  
  const descriptionsPt: Record<string, string> = {
    'Primeiros Passos': 'Novo no Taskorilla? Comece aqui para aprender o básico.',
    'Publicar Tarefas': 'Aprenda a publicar, editar e gerir as suas tarefas.',
    'Guia do Ajudante': 'Tudo o que precisa saber para ganhar como Ajudante.',
    'Guia de Pagamento': 'Compreenda pagamentos, taxas e como receber.',
    'Guia de Segurança': 'Mantenha-se seguro e proteja-se na plataforma.',
    'Plataforma e Técnico': 'Ajuda técnica, problemas de conta e resolução de problemas.',
    'Legal e Privacidade': 'Políticas, proteção de dados e informações de conformidade.'
  }
  
  const descriptions = language === 'pt' ? descriptionsPt : descriptionsEn
  return descriptions[category] || ''
}



