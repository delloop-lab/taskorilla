'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Language = 'en' | 'pt'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')
  const [translations, setTranslations] = useState<Record<string, any>>({})

  // Load translations when language changes
  useEffect(() => {
    import(`@/locales/${language}.json`)
      .then((mod) => {
        setTranslations(mod.default)
      })
      .catch((err) => {
        console.error('Failed to load translations:', err)
        // Fallback to empty object
        setTranslations({})
      })
  }, [language])

  // Load saved language preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('language') as Language
    if (saved === 'en' || saved === 'pt') {
      setLanguageState(saved)
    }
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('language', lang)
  }

  // Simple translation function - gets nested keys like "common.welcome"
  const t = (key: string): string => {
    const keys = key.split('.')
    let value: any = translations
    for (const k of keys) {
      value = value?.[k]
      if (value === undefined) return key // Return key if translation not found
    }
    return typeof value === 'string' ? value : key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}






