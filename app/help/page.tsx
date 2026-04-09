'use client'
 
import Link from 'next/link'
import { MessageCircle, Search as SearchIcon, Sparkles, ArrowRightCircle } from 'lucide-react'
import HelpSearchBar from '@/components/HelpSearchBar'
import HelpCategoryCard from '@/components/HelpCategoryCard'
import Footer from '@/components/Footer'
import { getCategories, getFAQsByCategory, getGuidesByCategory, getCategoryIcon, getCategoryDescription, slugify, getAllFAQs, getAllGuides, type Language } from '@/lib/help-utils'
import { useLanguage } from '@/lib/i18n'

export default function HelpCenter() {
  const { t, language } = useLanguage()
  const lang = language as Language
  const categories = getCategories(lang)
  const allFaqs = getAllFAQs(lang)
  const allGuides = getAllGuides(lang)
  const allGuidesEn = getAllGuides('en')

  const quickStartGuideIds = ['guide-quick-start-tasker', 'guide-quick-start-helper']
  const quickStartGuides = quickStartGuideIds
    .map((id) => allGuides.find((g) => g.id === id) || allGuidesEn.find((g) => g.id === id))
    .filter(Boolean)
  const pricingGuideV2 =
    allGuides.find((g) => g.id === 'guide-official-pricing-portugal-2026') ||
    allGuidesEn.find((g) => g.id === 'guide-official-pricing-portugal-2026')
  
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
      <section className="bg-[#F8F9FA] py-12 md:py-16 px-4 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.10),transparent_40%)]" />
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 mb-4">{t('help.heroTitle')}</h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-8">
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
            {pricingGuideV2 && (
              <Link
                href={`/help/guides/${slugify(pricingGuideV2.title)}`}
                className="px-6 py-3 bg-slate-700 text-white hover:bg-slate-800 rounded-lg font-medium transition-colors"
              >
                {language === 'pt' ? '📘 Guia Oficial de Preços 2026' : '📘 Taskorilla Service Price Index'}
              </Link>
            )}
            <a 
              href="mailto:support@taskorilla.com?subject=Support%20Request"
              className="px-6 py-3 bg-gray-100 hover:bg-primary hover:text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              {t('help.contactSupport')}
            </a>
          </div>
        </div>
      </section>

      {/* Start Here */}
      {quickStartGuides.length > 0 && (
        <section className="py-12 px-4 bg-gradient-to-r from-primary/10 via-amber-50 to-blue-50 border-y-2 border-primary/20">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary text-white text-sm font-semibold mb-4">
                <Sparkles className="w-4 h-4" />
                {language === 'pt' ? 'Mais Popular' : 'Most Popular'}
              </div>
              <h2 className="text-4xl font-extrabold text-gray-900">
                {language === 'pt' ? 'Comece Aqui em 5 Minutos' : 'Start Here in 5 Minutes'}
              </h2>
              <p className="text-gray-700 mt-3 text-lg">
                {language === 'pt'
                  ? 'Guias rápidos para começar em poucos minutos.'
                  : 'Quick-start guides to get going in minutes.'}
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {quickStartGuides.map((guide) => guide && (
                <Link
                  key={guide.id}
                  href={`/help/guides/${slugify(guide.title)}`}
                  className="group block bg-white border-2 border-primary/30 rounded-2xl p-6 hover:border-primary hover:shadow-xl hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-2xl font-bold text-gray-900 leading-tight">{guide.title}</h3>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold whitespace-nowrap">
                      {language === 'pt' ? 'Guia Rápido' : 'Quick Start'}
                    </span>
                  </div>
                  <p className="text-base text-gray-700 mt-3 line-clamp-2">
                    {guide.content.substring(0, 120)}...
                  </p>
                  <div className="mt-5 inline-flex items-center gap-2 text-primary font-semibold group-hover:gap-3 transition-all">
                    <span>{language === 'pt' ? 'Abrir guia rápido' : 'Open quick start guide'}</span>
                    <ArrowRightCircle className="w-5 h-5" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

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
            href="mailto:support@taskorilla.com?subject=Support%20Request"
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




