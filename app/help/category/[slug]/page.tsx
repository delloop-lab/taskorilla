'use client'

import Link from 'next/link'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { useParams } from 'next/navigation'
import FAQAccordion from '@/components/FAQAccordion'
import { getCategories, getFAQsByCategory, getGuidesByCategory, getCategoryIcon, getCategoryDescription, slugify, type Language } from '@/lib/help-utils'
import { useLanguage } from '@/lib/i18n'

export default function CategoryPage() {
  const params = useParams()
  const slug = params.slug as string
  const { t, language } = useLanguage()
  const lang = language as Language
  
  const categories = getCategories(lang)
  let category = categories.find(cat => slugify(cat) === slug)
  
  // If not found, try to find from English categories (for shared slugs)
  if (!category) {
    const enCategories = getCategories('en')
    const enCategory = enCategories.find(cat => slugify(cat) === slug)
    if (enCategory) {
      // Map English category to Portuguese equivalent
      const categoryMap: Record<string, string> = {
        'Getting Started': 'Primeiros Passos',
        'Posting Tasks': 'Publicar Tarefas',
        'Helper Guide': 'Guia do Ajudante',
        'Payment Guide': 'Guia de Pagamento',
        'Safety Guide': 'Guia de Segurança',
        'Platform & Technical': 'Plataforma e Técnico',
        'Legal & Privacy': 'Legal e Privacidade'
      }
      category = lang === 'pt' ? categoryMap[enCategory] || enCategory : enCategory
    }
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {language === 'pt' ? 'Categoria não encontrada' : 'Category not found'}
          </h1>
          <Link href="/help" className="text-primary hover:underline">
            {t('help.backToHelpCenter')}
          </Link>
        </div>
      </div>
    )
  }

  const faqs = getFAQsByCategory(category, lang)
  const guides = getGuidesByCategory(category, lang)
  
  const guidesText = language === 'pt' ? 'Guias' : 'Guides'
  const faqsText = language === 'pt' ? 'Perguntas Frequentes' : 'Frequently Asked Questions'
  const noContentText = language === 'pt' ? 'Ainda não há conteúdo disponível para esta categoria.' : 'No content available for this category yet.'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-gradient-to-br from-primary to-accent text-white py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <Link href="/help" className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            {t('help.backToHelpCenter')}
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl">{getCategoryIcon(category)}</span>
            <div>
              <h1 className="text-4xl font-bold">{category}</h1>
              <p className="text-xl opacity-90 mt-2">
                {getCategoryDescription(category, lang)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Guides Section */}
          {guides.length > 0 && (
            <div className="mb-12">
              <h2 className="text-3xl font-bold mb-6 text-gray-900">{guidesText}</h2>
              <div className="grid gap-6 mb-8">
                {guides.map((guide) => (
                  <Link 
                    key={guide.id}
                    href={`/help/guides/${slugify(guide.title)}`}
                    className="block bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-primary hover:shadow-lg transition-all group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <BookOpen className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors mb-2">
                          {guide.title}
                        </h3>
                        <p className="text-gray-600 line-clamp-2">
                          {guide.content.substring(0, 150)}...
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* FAQs Section */}
          {faqs.length > 0 && (
            <div>
              <h2 className="text-3xl font-bold mb-6 text-gray-900">{faqsText}</h2>
              <FAQAccordion items={faqs} />
            </div>
          )}

          {/* Empty State */}
          {faqs.length === 0 && guides.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg mb-6">
                {noContentText}
              </p>
              <Link 
                href="/help"
                className="text-primary hover:text-primary/80 font-medium"
              >
                ← {t('help.backToHelpCenter')}
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}




