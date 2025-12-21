'use client'

import Link from 'next/link'
import { ArrowLeft, BookOpen } from 'lucide-react'
import HelpSearchBar from '@/components/HelpSearchBar'
import { getAllGuides, slugify, type Language } from '@/lib/help-utils'
import { useLanguage } from '@/lib/i18n'

export default function GuidesPage() {
  const { t, language } = useLanguage()
  const lang = language as Language
  const guides = getAllGuides(lang)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-gradient-to-br from-primary to-accent text-white py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <Link href="/help" className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            {t('help.backToHelpCenter')}
          </Link>
          <h1 className="text-4xl font-bold mb-4">{t('help.guidesTitle')}</h1>
          <p className="text-xl opacity-90 mb-6">
            {t('help.guidesSubtitle')}
          </p>
          <HelpSearchBar placeholder={t('help.searchGuides')} />
        </div>
      </section>

      {/* Guides List */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="grid gap-6">
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
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors">
                        {guide.title}
                      </h3>
                      <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full whitespace-nowrap">
                        {guide.category}
                      </span>
                    </div>
                    <p className="text-gray-600 line-clamp-2">
                      {guide.content.substring(0, 150)}...
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}




