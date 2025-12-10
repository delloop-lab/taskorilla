'use client'

import Link from 'next/link'
import { MessageCircle, Search as SearchIcon } from 'lucide-react'
import HelpSearchBar from '@/components/HelpSearchBar'
import HelpCategoryCard from '@/components/HelpCategoryCard'
import { getCategories, getFAQsByCategory, getGuidesByCategory, getCategoryIcon, getCategoryDescription, slugify } from '@/lib/help-utils'
import { useLanguage } from '@/lib/i18n'

export default function HelpCenter() {
  const { t } = useLanguage()
  const categories = getCategories()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-accent text-white py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-4 mb-4">
              <h1 className="text-5xl font-bold">How can we help you?</h1>
              <img 
                src="/images/tee_on_fence.png" 
                alt="Tee on fence" 
                className="w-[200px]"
              />
            </div>
            <p className="text-xl opacity-90 mb-8">
              Find answers, guides, and tips to get the most out of Taskorilla
            </p>
          </div>
          <HelpSearchBar placeholder="Search for help articles, guides, and FAQs..." />
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
              📋 Browse All FAQs
            </Link>
            <Link 
              href="/help/guides"
              className="px-6 py-3 bg-gray-100 hover:bg-primary hover:text-white rounded-lg font-medium transition-colors"
            >
              📚 View All Guides
            </Link>
            <a 
              href="mailto:tee@taskorilla.com"
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
          <h2 className="text-3xl font-bold text-center mb-10">Browse by Category</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => {
              const faqCount = getFAQsByCategory(category).length
              const guideCount = getGuidesByCategory(category).length
              const totalCount = faqCount + guideCount
              
              return (
                <HelpCategoryCard
                  key={category}
                  title={category}
                  icon={getCategoryIcon(category)}
                  description={getCategoryDescription(category)}
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
          <h2 className="text-3xl font-bold text-center mb-10">Popular Questions</h2>
          <div className="space-y-4">
            <Link href="/help/faq#getting-started-1" className="block p-6 border-2 border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all">
              <h3 className="font-semibold text-lg text-gray-900 mb-2">How do I create a Taskorilla account?</h3>
              <p className="text-gray-600 text-sm">Get started in just a few clicks</p>
            </Link>
            <Link href="/help/faq#posting-tasks-1" className="block p-6 border-2 border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all">
              <h3 className="font-semibold text-lg text-gray-900 mb-2">How do I post a task?</h3>
              <p className="text-gray-600 text-sm">Learn how to create your first task</p>
            </Link>
            <Link href="/help/faq#payment-guide-1" className="block p-6 border-2 border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all">
              <h3 className="font-semibold text-lg text-gray-900 mb-2">How does payment work?</h3>
              <p className="text-gray-600 text-sm">Understand our secure payment system</p>
            </Link>
            <Link href="/help/faq#tasker-guide-1" className="block p-6 border-2 border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all">
              <h3 className="font-semibold text-lg text-gray-900 mb-2">How do I become a Helper?</h3>
              <p className="text-gray-600 text-sm">Start earning money helping others</p>
            </Link>
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
            href="mailto:tee@taskorilla.com"
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
    </div>
  )
}




