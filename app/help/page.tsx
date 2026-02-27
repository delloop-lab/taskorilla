'use client'
 
import Link from 'next/link'
import { MessageCircle, Search as SearchIcon } from 'lucide-react'
import HelpSearchBar from '@/components/HelpSearchBar'
import HelpCategoryCard from '@/components/HelpCategoryCard'
import Footer from '@/components/Footer'
import { getCategories, getFAQsByCategory, getGuidesByCategory, getCategoryIcon, getCategoryDescription, slugify, getAllFAQs, type Language } from '@/lib/help-utils'
import { useLanguage } from '@/lib/i18n'

export default function HelpCenter() {
  const { t, language } = useLanguage()
  const lang = language as Language
  const categories = getCategories(lang)
  const allFaqs = getAllFAQs(lang)
  
  // Get first FAQ from each main category for popular questions
  const popularFaqs = [
    allFaqs.find(f => f.id === 'getting-started-1'),
    allFaqs.find(f => f.id === 'posting-tasks-1'),
    allFaqs.find(f => f.id === 'payment-guide-1'),
    allFaqs.find(f => f.id === 'tasker-guide-1')
  ].filter(Boolean)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-accent text-white py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-4 mb-4">
              <h1 className="text-5xl font-bold">{t('help.heroTitle')}</h1>
              <img 
                src="/images/tee_on_fence.png" 
                alt="Tee on fence" 
                className="w-[200px]"
              />
            </div>
            <p className="text-xl opacity-90 mb-8">
              {t('help.findAnswers')}
            </p>
          </div>
          <HelpSearchBar placeholder={t('help.searchPlaceholder')} />
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-8 px-4 bg-white border-b border-gray-200">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-wrap justify-center gap-4">
            <Link 
              href="/help/faq"
              className="px-6 py-3 bg-gray-100 hover:bg-primary hover:text-white rounded-lg font-medium transition-colors"
            >
              📋 {t('help.browseAllFaqs')}
            </Link>
            <Link 
              href="/help/guides"
              className="px-6 py-3 bg-gray-100 hover:bg-primary hover:text-white rounded-lg font-medium transition-colors"
            >
              📚 {t('help.viewAllGuides')}
            </Link>
            <a 
              href="mailto:tee@taskorilla.com?subject=Support%20Request"
              className="px-6 py-3 bg-gray-100 hover:bg-primary hover:text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              {t('help.contactSupport')}
            </a>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-10">{t('help.browseByCategory')}</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => {
              const faqCount = getFAQsByCategory(category, lang).length
              const guideCount = getGuidesByCategory(category, lang).length
              const totalCount = faqCount + guideCount
              
              return (
                <HelpCategoryCard
                  key={category}
                  title={category}
                  icon={getCategoryIcon(category)}
                  description={getCategoryDescription(category, lang)}
                  itemCount={totalCount}
                  href={`/help/category/${slugify(category)}`}
                />
              )
            })}
          </div>
        </div>
      </section>

      {/* Popular Questions */}
      <section className="py-12 px-4 bg-white">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-10">
            {language === 'pt' ? 'Perguntas Populares' : 'Popular Questions'}
          </h2>
          <div className="space-y-4">
            {popularFaqs.map((faq) => faq && (
              <Link 
                key={faq.id}
                href={`/help/faq#${faq.id}`} 
                className="block p-6 border-2 border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all"
              >
                <h3 className="font-semibold text-lg text-gray-900 mb-2">{faq.title}</h3>
                <p className="text-gray-600 text-sm line-clamp-1">{faq.content.substring(0, 80)}...</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Support CTA */}
      <section className="py-12 px-4 bg-gradient-to-r from-blue-50 to-green-50">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-4">{t('help.stillNeedHelp')}</h2>
          <p className="text-lg text-gray-600 mb-6">
            {t('help.cantFindMessage')}
          </p>
          <a 
            href="mailto:tee@taskorilla.com?subject=Support%20Request"
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors text-lg"
          >
            <MessageCircle className="w-6 h-6" />
            {t('help.contactSupport')}
          </a>
          <p className="text-sm text-gray-500 mt-4">
            {t('help.responseTime')}
          </p>
        </div>
      </section>

      <Footer />
    </div>
  )
}




