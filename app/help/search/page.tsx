'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search, BookOpen, HelpCircle } from 'lucide-react'
import HelpSearchBar from '@/components/HelpSearchBar'
import { searchHelpContent, slugify, type Language } from '@/lib/help-utils'
import { useLanguage } from '@/lib/i18n'

function SearchResults() {
  const searchParams = useSearchParams()
  const { t, language } = useLanguage()
  const lang = language as Language
  const query = searchParams.get('q') || ''
  const results = query ? searchHelpContent(query, lang) : []

  const resultText = language === 'pt' 
    ? `${results.length} ${results.length === 1 ? 'resultado encontrado' : 'resultados encontrados'} para "${query}"`
    : `${results.length} ${results.length === 1 ? 'result' : 'results'} found for "${query}"`
  const tryAnotherText = language === 'pt' ? 'Tente outra pesquisa...' : 'Try another search...'
  const guideText = language === 'pt' ? 'Guia' : 'Guide'
  const faqText = 'FAQ'

  return (
    <>
      <section className="bg-gradient-to-br from-primary to-accent text-white py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <Link href="/help" className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            {t('help.backToHelpCenter')}
          </Link>
          <h1 className="text-4xl font-bold mb-4">{t('help.searchResults')}</h1>
          <p className="text-xl opacity-90 mb-6">
            {resultText}
          </p>
          <HelpSearchBar placeholder={tryAnotherText} />
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          {results.length > 0 ? (
            <div className="space-y-6">
              {results.map((item) => {
                const href = item.type === 'guide' 
                  ? `/help/guides/${slugify(item.title)}`
                  : `/help/faq#${item.id}`
                
                return (
                  <Link 
                    key={item.id}
                    href={href}
                    className="block bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-primary hover:shadow-lg transition-all group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        {item.type === 'guide' ? (
                          <BookOpen className="w-5 h-5 text-primary" />
                        ) : (
                          <HelpCircle className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            {item.type === 'guide' ? guideText : faqText}
                          </span>
                          <span className="text-xs text-gray-500">{item.category}</span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors mb-2">
                          {item.title}
                        </h3>
                        <p className="text-gray-600 line-clamp-2">
                          {item.content.substring(0, 200)}...
                        </p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('help.noResults')}</h2>
              <p className="text-gray-600 mb-6">
                {t('help.tryDifferentSearch')}
              </p>
              <Link 
                href="/help"
                className="inline-block px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                {t('help.backToHelpCenter')}
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  )
}

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Searching...</p>
          </div>
        </div>
      }>
        <SearchResults />
      </Suspense>
    </div>
  )
}




