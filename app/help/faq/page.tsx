'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import HelpSearchBar from '@/components/HelpSearchBar'
import FAQAccordion from '@/components/FAQAccordion'
import { getCategories, getFAQsByCategory, type Language } from '@/lib/help-utils'
import { useLanguage } from '@/lib/i18n'

export default function FAQPage() {
  const { t, language } = useLanguage()
  const lang = language as Language
  const categories = getCategories(lang)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-gradient-to-br from-primary to-accent text-white py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <Link href="/help" className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            {t('help.backToHelpCenter')}
          </Link>
          <h1 className="text-4xl font-bold mb-4">{t('help.faqTitle')}</h1>
          <p className="text-xl opacity-90 mb-6">
            {t('help.faqSubtitle')}
          </p>
          <HelpSearchBar placeholder={t('help.searchFaqs')} />
        </div>
      </section>

      {/* FAQ Categories */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          {categories.map((category) => {
            const faqs = getFAQsByCategory(category, lang)
            if (faqs.length === 0) return null

            return (
              <div key={category} className="mb-12">
                <h2 className="text-3xl font-bold mb-6 text-gray-900">
                  {category}
                </h2>
                <FAQAccordion items={faqs} />
              </div>
            )
          })}
        </div>
      </section>

      {/* Still Need Help */}
      <section className="py-12 px-4 bg-white border-t border-gray-200">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-bold mb-4">{t('help.didntFindAnswer')}</h2>
          <p className="text-gray-600 mb-6">
            {t('help.checkGuidesOrContact')}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link 
              href="/help/guides"
              className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              {t('help.viewAllGuides')}
            </Link>
            <a 
              href="mailto:tee@taskorilla.com"
              className="px-6 py-3 border-2 border-primary text-primary rounded-lg font-medium hover:bg-primary hover:text-white transition-colors"
            >
              {t('help.contactSupport')}
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}




