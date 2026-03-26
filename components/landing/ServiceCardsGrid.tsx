import Link from 'next/link'
import { ServiceCard } from '@/components/landing/ServiceCard'

type CardItem = {
  emoji: string
  title: string
  subtitle: string
  prefillTaskType: 'helper' | 'professional'
  prefillTitle: string
  prefillCategory?: string
}

const CARDS: CardItem[] = [
  {
    emoji: '🧹',
    title: 'I need a cleaner',
    subtitle: 'Keep your home spotless',
    prefillTaskType: 'helper',
    prefillTitle: 'I need a cleaner to ',
    prefillCategory: 'Cleaning & Home Care',
  },
  {
    emoji: '🔧',
    title: 'I need a plumber',
    subtitle: 'Fix leaks & taps fast',
    prefillTaskType: 'helper',
    prefillTitle: 'I need a plumber to ',
    prefillCategory: 'Electrical & Plumbing',
  },
  {
    emoji: '🛠️',
    title: 'I need a handyman',
    subtitle: 'Small jobs, big help',
    prefillTaskType: 'helper',
    prefillTitle: 'I need a handyman to ',
    prefillCategory: 'Furniture Assembly & DIY',
  },
  {
    emoji: '🛋️',
    title: 'I need furniture moved',
    subtitle: 'Help with heavy lifting',
    prefillTaskType: 'helper',
    prefillTitle: 'I need furniture moved to ',
    prefillCategory: 'Moving & Lifting Help',
  },
  {
    emoji: '🌿',
    title: 'I need a gardener',
    subtitle: 'Lawn & garden care',
    prefillTaskType: 'helper',
    prefillTitle: 'I need a gardener to ',
    prefillCategory: 'Gardening & Outdoor Maintenance',
  },
  {
    emoji: '📊',
    title: 'I need a professional',
    subtitle: 'Get insights fast',
    prefillTaskType: 'professional',
    prefillTitle: 'I need a professional to ',
    prefillCategory: 'Business professionals',
  },
  {
    emoji: '🪑',
    title: 'Assemble furniture',
    subtitle: 'Flat-pack? No problem',
    prefillTaskType: 'helper',
    prefillTitle: 'I need furniture assembled — ',
    prefillCategory: 'Furniture Assembly & DIY',
  },
  {
    emoji: '⚡',
    title: 'I need an electrician',
    subtitle: 'Wiring, sockets & more',
    prefillTaskType: 'helper',
    prefillTitle: 'I need an electrician to ',
    prefillCategory: 'Electrical & Plumbing',
  },
  {
    emoji: '📋',
    title: 'I need general assistance',
    subtitle: 'In-person or remote errands, admin',
    prefillTaskType: 'helper',
    prefillTitle: 'I need general assistance with ',
    prefillCategory: 'Errands & Deliveries',
  },
  {
    emoji: '💻',
    title: 'I need tech support',
    subtitle: 'Expert help with devices',
    prefillTaskType: 'helper',
    prefillTitle: 'I need tech support with ',
    prefillCategory: 'Tech Help & Setup',
  },
]

export function ServiceCardsGrid() {
  return (
    <section className="py-10 md:py-14 px-4 bg-white">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">What do you need help with?</h2>
          <p className="mt-2 text-sm md:text-base text-gray-500">
            Tap a card to start — we'll prefill your task for you.
          </p>
        </div>

        {/* Outer card container matching reference image */}
        <div className="bg-[#ececec] rounded-2xl p-4 md:p-6 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CARDS.map((card) => {
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
                <p className="text-[15px] font-bold text-gray-900 leading-snug">I need help with...</p>
                <p className="text-[13px] text-gray-500 mt-0.5">Create your own custom task and details.</p>
              </div>
            </Link>

            {/* Helper registration card — full width, accent tint */}
            <Link
              href="/register?role=helper"
              className="sm:col-span-2 flex items-center gap-4 rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40 cursor-pointer"
            >
              <span className="text-4xl flex-shrink-0 w-11 text-center" role="img" aria-hidden="true">
                🤝
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-blue-900 leading-snug">I want to become a Taskorilla Helper</p>
                <p className="text-[13px] text-blue-600/80 mt-0.5">Join our community of experts and start earning on your own schedule.</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
