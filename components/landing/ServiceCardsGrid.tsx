import Link from 'next/link'
import { ServiceCard } from '@/components/landing/ServiceCard'
import { useLanguage } from '@/lib/i18n'

type CardItem = {
  emoji: string
  title: string
  subtitle: string
  prefillTaskType: 'helper' | 'professional'
  prefillTitle: string
  prefillCategory?: string
}

export function ServiceCardsGrid() {
  const { t } = useLanguage()

  const cards: CardItem[] = [
    {
      emoji: '🧹',
      title: t('serviceGrid.cards.cleaner.title'),
      subtitle: t('serviceGrid.cards.cleaner.subtitle'),
      prefillTaskType: 'helper',
      prefillTitle: t('serviceGrid.cards.cleaner.prefillTitle'),
      prefillCategory: t('serviceGrid.cards.cleaner.prefillCategory'),
    },
    {
      emoji: '🔧',
      title: t('serviceGrid.cards.plumber.title'),
      subtitle: t('serviceGrid.cards.plumber.subtitle'),
      prefillTaskType: 'helper',
      prefillTitle: t('serviceGrid.cards.plumber.prefillTitle'),
      prefillCategory: t('serviceGrid.cards.plumber.prefillCategory'),
    },
    {
      emoji: '🛠️',
      title: t('serviceGrid.cards.handyman.title'),
      subtitle: t('serviceGrid.cards.handyman.subtitle'),
      prefillTaskType: 'helper',
      prefillTitle: t('serviceGrid.cards.handyman.prefillTitle'),
      prefillCategory: t('serviceGrid.cards.handyman.prefillCategory'),
    },
    {
      emoji: '🛋️',
      title: t('serviceGrid.cards.furnitureMoved.title'),
      subtitle: t('serviceGrid.cards.furnitureMoved.subtitle'),
      prefillTaskType: 'helper',
      prefillTitle: t('serviceGrid.cards.furnitureMoved.prefillTitle'),
      prefillCategory: t('serviceGrid.cards.furnitureMoved.prefillCategory'),
    },
    {
      emoji: '🌿',
      title: t('serviceGrid.cards.gardener.title'),
      subtitle: t('serviceGrid.cards.gardener.subtitle'),
      prefillTaskType: 'helper',
      prefillTitle: t('serviceGrid.cards.gardener.prefillTitle'),
      prefillCategory: t('serviceGrid.cards.gardener.prefillCategory'),
    },
    {
      emoji: '📊',
      title: t('serviceGrid.cards.professional.title'),
      subtitle: t('serviceGrid.cards.professional.subtitle'),
      prefillTaskType: 'professional',
      prefillTitle: t('serviceGrid.cards.professional.prefillTitle'),
      prefillCategory: t('serviceGrid.cards.professional.prefillCategory'),
    },
    {
      emoji: '🪑',
      title: t('serviceGrid.cards.assembleFurniture.title'),
      subtitle: t('serviceGrid.cards.assembleFurniture.subtitle'),
      prefillTaskType: 'helper',
      prefillTitle: t('serviceGrid.cards.assembleFurniture.prefillTitle'),
      prefillCategory: t('serviceGrid.cards.assembleFurniture.prefillCategory'),
    },
    {
      emoji: '⚡',
      title: t('serviceGrid.cards.electrician.title'),
      subtitle: t('serviceGrid.cards.electrician.subtitle'),
      prefillTaskType: 'helper',
      prefillTitle: t('serviceGrid.cards.electrician.prefillTitle'),
      prefillCategory: t('serviceGrid.cards.electrician.prefillCategory'),
    },
    {
      emoji: '📋',
      title: t('serviceGrid.cards.generalAssistance.title'),
      subtitle: t('serviceGrid.cards.generalAssistance.subtitle'),
      prefillTaskType: 'helper',
      prefillTitle: t('serviceGrid.cards.generalAssistance.prefillTitle'),
      prefillCategory: t('serviceGrid.cards.generalAssistance.prefillCategory'),
    },
    {
      emoji: '💻',
      title: t('serviceGrid.cards.techSupport.title'),
      subtitle: t('serviceGrid.cards.techSupport.subtitle'),
      prefillTaskType: 'helper',
      prefillTitle: t('serviceGrid.cards.techSupport.prefillTitle'),
      prefillCategory: t('serviceGrid.cards.techSupport.prefillCategory'),
    },
  ]

  return (
    <section className="py-10 md:py-14 px-4 bg-white">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{t('serviceGrid.title')}</h2>
          <p className="mt-2 text-sm md:text-base text-gray-500">
            {t('serviceGrid.subtitle')}
          </p>
        </div>

        {/* Outer card container matching reference image */}
        <div className="bg-[#ececec] rounded-2xl p-4 md:p-6 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cards.map((card) => {
              const href = `/tasks/new?formType=quick&prefill=1&prefillTaskType=${card.prefillTaskType}&prefillTitle=${encodeURIComponent(card.prefillTitle)}${card.prefillCategory ? `&prefillCategory=${encodeURIComponent(card.prefillCategory)}` : ''}`
              return (
                <ServiceCard
                  key={card.title}
                  emoji={card.emoji}
                  title={card.title}
                  subtitle={card.subtitle}
                  href={href}
                />
              )
            })}

            {/* Generic "anything" card — no prefill, spans full width */}
            <Link
              href="/tasks/new?formType=quick"
              className="sm:col-span-2 flex items-center gap-4 rounded-xl border-2 border-dashed border-gray-300 bg-white px-4 py-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
            >
              <span className="text-4xl flex-shrink-0 w-11 text-center" role="img" aria-hidden="true">
                ✏️
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-gray-900 leading-snug">{t('serviceGrid.customTask.title')}</p>
                <p className="text-[13px] text-gray-500 mt-0.5">{t('serviceGrid.customTask.subtitle')}</p>
              </div>
            </Link>

            {/* Helper registration card — full width, accent tint */}
            <Link
              href="/become-a-helper"
              className="sm:col-span-2 flex items-center gap-4 rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40 cursor-pointer"
            >
              <span className="text-4xl flex-shrink-0 w-11 text-center" role="img" aria-hidden="true">
                🤝
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-blue-900 leading-snug">{t('serviceGrid.becomeHelper.title')}</p>
                <p className="text-[13px] text-blue-600/80 mt-0.5">{t('serviceGrid.becomeHelper.subtitle')}</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
