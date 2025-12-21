'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useParams } from 'next/navigation'
import FAQAccordion from '@/components/FAQAccordion'
import GuideFeedbackButtons from '@/components/GuideFeedbackButtons'
import GuideStillNeedHelp from '@/components/GuideStillNeedHelp'
import { getGuideBySlug, getFAQsByCategory, getAllGuides, type Language } from '@/lib/help-utils'
import { useLanguage } from '@/lib/i18n'

export default function GuidePage() {
  const params = useParams()
  const slug = params.slug as string
  const { t, language } = useLanguage()
  const lang = language as Language
  
  // Try to find the guide in the current language first
  let guide = getGuideBySlug(slug, lang)
  
  // If not found, try the other language (for shared slugs from English titles)
  if (!guide) {
    guide = getGuideBySlug(slug, 'en')
    if (!guide) {
      guide = getGuideBySlug(slug, 'pt')
    }
  }

  if (!guide) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {language === 'pt' ? 'Guia não encontrado' : 'Guide not found'}
          </h1>
          <Link href="/help/guides" className="text-primary hover:underline">
            {language === 'pt' ? 'Voltar aos Guias' : 'Back to Guides'}
          </Link>
        </div>
      </div>
    )
  }

  // Get the translated version of the guide if we found it in a different language
  const translatedGuide = getGuideBySlug(slug, lang) || 
    getAllGuides(lang).find(g => g.id === guide!.id) || 
    guide

  // Get related FAQs from the same category in the current language
  const relatedFAQs = getFAQsByCategory(translatedGuide.category, lang).slice(0, 5)

  // Format content for better display
  const formatContent = (content: string) => {
    return content.split('\n\n').map((section, index) => {
      // Check if it's a heading (starts with **)
      if (section.startsWith('**') && section.includes('**')) {
        const headingText = section.match(/\*\*(.*?)\*\*/)?.[1] || section
        const remainingText = section.replace(/\*\*(.*?)\*\*/, '').trim()
        
        return (
          <div key={index} className="mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-3">{headingText}</h3>
            {remainingText && <p className="text-gray-700 leading-relaxed">{remainingText}</p>}
          </div>
        )
      }
      
      return (
        <p key={index} className="text-gray-700 leading-relaxed mb-4">
          {section}
        </p>
      )
    })
  }

  const backToGuidesText = language === 'pt' ? 'Voltar aos Guias' : 'Back to Guides'
  const minReadText = language === 'pt' ? '📖 5 min de leitura' : '📖 5 min read'
  const wasHelpfulText = language === 'pt' ? 'Este guia foi útil?' : 'Was this guide helpful?'
  const relatedFaqsText = language === 'pt' ? 'Perguntas Frequentes Relacionadas' : 'Related FAQs'
  const viewAllFaqsText = language === 'pt' ? 'Ver todas as perguntas frequentes →' : 'View all FAQs →'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-gradient-to-br from-primary to-accent text-white py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <Link href="/help/guides" className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            {backToGuidesText}
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
              {translatedGuide.category}
            </span>
            <span className="text-sm opacity-75">{minReadText}</span>
          </div>
          <h1 className="text-4xl font-bold">{translatedGuide.title}</h1>
        </div>
      </section>

      {/* Guide Content */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <div className="prose prose-lg max-w-none">
              {formatContent(translatedGuide.content)}
            </div>

            {/* Was this helpful? */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                {wasHelpfulText}
              </h3>
              <GuideFeedbackButtons guideTitle={translatedGuide.title} />
            </div>
          </div>

          {/* Related FAQs */}
          {relatedFAQs.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {relatedFaqsText}
              </h2>
              <FAQAccordion items={relatedFAQs} />
              <div className="mt-6 text-center">
                <Link 
                  href="/help/faq"
                  className="text-primary hover:text-primary/80 font-medium"
                >
                  {viewAllFaqsText}
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Still Need Help */}
      <GuideStillNeedHelp />
    </div>
  )
}



