import Link from 'next/link'
import Footer from '@/components/Footer'
import { ServiceCardsGrid } from '@/components/landing/ServiceCardsGrid'
import LandingV3FloatingCta from '@/components/landing/LandingV3FloatingCta'

type Step = {
  title: string
  description: string
}

type Feature = {
  title: string
  description: string
}

function SectionContainer({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return <section className={`px-4 py-12 sm:py-16 ${className}`}>{children}</section>
}

function HeroSection() {
  return (
    <SectionContainer className="pt-12 sm:pt-16">
      <div className="mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-2 md:gap-10">
        <div className="space-y-6">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900">
            Get things done in Portugal. Fast.
          </h1>
          <p className="max-w-2xl text-base sm:text-lg text-gray-600">
            Post a task for free and get offers from trusted local helpers. Pay only when the job is done.
          </p>
          <div className="flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row">
            <Link
              href="/tasks/new"
              className="inline-flex items-center justify-center rounded-2xl bg-primary-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary-600/25 transition hover:scale-[1.01] hover:bg-primary-700"
            >
              Post a Task
            </Link>
            <Link
              href="/become-a-helper"
              className="inline-flex items-center justify-center rounded-2xl border border-gray-300 bg-white px-7 py-3.5 text-base font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50"
            >
              Earn Money as a Helper
            </Link>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-md md:max-w-sm lg:max-w-md">
          <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-primary-100 to-orange-100 blur-2xl opacity-55" />
          <div className="relative overflow-hidden rounded-3xl">
            <img
              src="/images/gorilla-mascot-newer.png"
              alt="Taskorilla helper assisting a customer"
              className="h-[320px] w-full object-contain sm:h-[360px] md:h-[340px] lg:h-[380px]"
            />
          </div>
        </div>
      </div>
    </SectionContainer>
  )
}

function HowItWorksSection() {
  const steps: Step[] = [
    { title: 'Post your task', description: 'Tell us what you need' },
    { title: 'Get offers', description: 'Helpers send bids fast' },
    { title: 'Choose and relax', description: "Pay when it's done" },
  ]

  return (
    <SectionContainer className="bg-gray-100/70">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">How it works</h2>
        </div>
        <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title} className="group relative rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
              {index < 2 && (
                <div className="absolute -right-6 top-8 hidden h-px w-12 border-t border-dashed border-gray-300 md:block" />
              )}
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-lg text-primary-700 transition-transform duration-300 group-hover:scale-110">
                {index === 0 ? '📝' : index === 1 ? '⚡' : '✅'}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </SectionContainer>
  )
}

function TrustStripSection() {
  const trustItems = [
    'No upfront payments',
    'Pay only on completion',
    'Ratings and reviews',
    'Local helpers across Portugal',
  ]

  return (
    <SectionContainer className="py-8 sm:py-10">
      <div className="mx-auto max-w-6xl rounded-2xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
        <ul className="grid gap-3 text-sm text-gray-700 sm:grid-cols-2 lg:grid-cols-4">
          {trustItems.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-primary-600" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </SectionContainer>
  )
}

function FeatureCardsSection() {
  const features: Feature[] = [
    {
      title: 'Get it done without the hassle',
      description: 'Post once. Get matched fast. Keep moving.',
    },
    {
      title: 'Built for real life',
      description: 'From quick fixes to bigger jobs, it all fits.',
    },
    {
      title: "You're in control",
      description: 'Choose your helper. Approve only when happy.',
    },
  ]

  return (
    <SectionContainer className="bg-gray-100/70">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Why Taskorilla</h2>
        </div>
        <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
              <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </SectionContainer>
  )
}

function DualAudienceSection() {
  return (
    <SectionContainer className="bg-[#F8F9FA]">
      <div className="mx-auto max-w-6xl grid gap-4 sm:gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="mb-3 text-3xl" aria-hidden>✨</div>
          <h3 className="text-xl font-semibold text-gray-900">Need something done?</h3>
          <Link
            href="/tasks/new"
            className="mt-5 inline-flex items-center justify-center rounded-2xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-primary-700"
          >
            Post a Task
          </Link>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="mb-3 text-3xl" aria-hidden>🧰</div>
          <h3 className="text-xl font-semibold text-gray-900">Want to earn money?</h3>
          <Link
            href="/become-a-helper"
            className="mt-5 inline-flex items-center justify-center rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-800 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-gray-50"
          >
            Become a Helper
          </Link>
        </div>
      </div>
    </SectionContainer>
  )
}

function SocialProofSection() {
  const latestTaskCards = [
    {
      title: 'house painting job',
      price: 'EUR10,000',
      status: '1 Bid',
      statusStyle: 'bg-blue-100 text-blue-700',
      location: 'Lisbon',
      timeAgo: '2 mins ago',
      icon: '🖌️',
      profile: '/images/sue-brimacombe.png',
      name: 'Maria S.',
      rating: '4.9',
    },
    {
      title: 'renovation task live',
      price: 'EUR12,000',
      status: 'Live',
      statusStyle: 'bg-green-100 text-green-700',
      location: 'Porto',
      timeAgo: 'Just posted',
      icon: '🔨',
      profile: '/images/victoria-bradley.png',
      name: 'Joao R.',
      rating: '5.0',
    },
    {
      title: 'plumbing fix',
      price: 'EUR250',
      status: 'New',
      statusStyle: 'bg-purple-100 text-purple-700',
      location: 'Faro',
      timeAgo: '6 mins ago',
      icon: '🔧',
      profile: '/images/gail-smith.png',
      name: 'Ana P.',
      rating: '4.8',
    },
    {
      title: 'garden clean-up',
      price: 'EUR180',
      status: 'Open',
      statusStyle: 'bg-amber-100 text-amber-700',
      location: 'Braga',
      timeAgo: '11 mins ago',
      icon: '🌿',
      profile: '/images/sue-brimacombe.png',
      name: 'Rui T.',
      rating: '4.9',
    },
  ]

  return (
    <SectionContainer>
      <div className="mx-auto max-w-6xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Happening right now on Taskorilla</h2>
        <div className="mt-5 flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {latestTaskCards.map((task) => (
            <article key={`${task.title}-${task.location}`} className="min-w-[280px] snap-start rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xl" aria-hidden>{task.icon}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${task.statusStyle}`}>
                  {task.status}
                </span>
              </div>
              <p className="text-base font-bold text-gray-900">{task.price}</p>
              <p className="text-sm font-medium text-gray-800">{task.title}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>📍 {task.location}</span>
                <span>{task.timeAgo}</span>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-white px-3 py-2 border border-gray-200">
                <div className="flex items-center gap-2">
                  <img src={task.profile} alt={task.name} className="h-7 w-7 rounded-full object-cover" />
                  <span className="text-xs font-medium text-gray-700">{task.name}</span>
                </div>
                <span className="text-xs text-gray-600">{task.rating}/5 ★</span>
              </div>
            </article>
          ))}
        </div>
        <Link
          href="/tasks"
          className="mt-6 inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50"
        >
          View Tasks
        </Link>
      </div>
    </SectionContainer>
  )
}

function TestimonialsSection() {
  const testimonials = [
    { quote: 'I was very impressed with how thorough the Helper was.', name: 'Sue B.', avatar: '/images/sue-brimacombe.png', rating: '★★★★★' },
    { quote: 'It was super simple to create the task and find help.', name: 'Victora B.', avatar: '/images/victoria-bradley.png', rating: '★★★★★' },
    { quote: 'Taskorilla made it incredibly easy to find help when I needed it', name: 'Gail S.', avatar: '/images/gail-smith.png', rating: '★★★★★' },
  ]

  return (
    <SectionContainer className="pt-0">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">What people are saying</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {testimonials.map((item, index) => (
            <blockquote
              key={item.quote}
              className={`relative rounded-2xl border border-gray-200 px-4 py-4 text-sm text-gray-700 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${index === 1 ? 'bg-primary-50 md:scale-[1.03]' : 'bg-white'}`}
            >
              <span className="absolute right-3 top-2 text-3xl font-bold text-primary-200">“</span>
              <div className="mb-2 flex items-center gap-2">
                <img src={item.avatar} alt={item.name} className="h-8 w-8 rounded-full object-cover" />
                <div>
                  <p className="text-xs font-semibold text-gray-900">{item.name}</p>
                  <p className="text-[11px] text-amber-500">{item.rating}</p>
                </div>
              </div>
              "{item.quote}"
            </blockquote>
          ))}
        </div>
      </div>
    </SectionContainer>
  )
}

function FinalCtaSection() {
  return (
    <SectionContainer className="pb-16 sm:pb-20">
      <div className="mx-auto max-w-5xl rounded-2xl border border-primary-100 bg-primary-50 p-7 text-center shadow-sm sm:p-10">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Stop waiting. Get it done.</h2>
        <Link
          href="/tasks/new"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-primary-600/30 transition hover:bg-primary-700"
        >
          Post a Task
        </Link>
      </div>
    </SectionContainer>
  )
}

export default function LandingV3Page() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] bg-[radial-gradient(#c9d2dc_0.8px,transparent_0.8px)] [background-size:16px_16px]">
      <HeroSection />
      <ServiceCardsGrid integrated />
      <HowItWorksSection />
      <TrustStripSection />
      <FeatureCardsSection />
      <DualAudienceSection />
      <SocialProofSection />
      <TestimonialsSection />
      <FinalCtaSection />
      <LandingV3FloatingCta />
      <Footer />
    </div>
  )
}

