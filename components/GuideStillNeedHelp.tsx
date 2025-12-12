'use client'

import { useLanguage } from '@/lib/i18n'

export default function GuideStillNeedHelp() {
  const { t } = useLanguage()

  return (
    <section className="py-12 px-4 bg-white border-t border-gray-200">
      <div className="container mx-auto max-w-4xl text-center">
        <h2 className="text-2xl font-bold mb-4">{t('help.stillHaveQuestions')}</h2>
        <p className="text-gray-600 mb-6">
          {t('help.supportTeamHere')}
        </p>
        <a 
          href="mailto:tee@taskorilla.com"
          className="inline-block px-8 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
        >
          {t('help.contactSupport')}
        </a>
      </div>
    </section>
  )
}






