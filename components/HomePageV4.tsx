'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, ClipboardList, Hammer, ChevronDown } from 'lucide-react'
import Footer from '@/components/Footer'
import { useLanguage } from '@/lib/i18n'
import { SocialBar } from '@/components/SocialBar'
import { ServiceCardsGrid } from '@/components/landing/ServiceCardsGrid'

export default function HomePageV4() {
  const { t } = useLanguage()
  const [openHowItWorks, setOpenHowItWorks] = useState<number | null>(null)
  const [openWhyCard, setOpenWhyCard] = useState<number | null>(null)
  const stripDashes = (value: string) => value.replace(/[-–—]/g, ' ').replace(/\s{2,}/g, ' ').trim()

  const howItWorksItems = [
    {
      id: 0,
      icon: '📝',
      title: 'Post your task',
      summary: 'Tell us what you need',
      details:
        t('landing.step1Text'),
    },
    {
      id: 1,
      icon: '⚡',
      title: 'Get offers',
      summary: 'Helpers send bids fast',
      details:
        `${t('landing.step2Text')} ${t('landing.step2NewText')}`,
    },
    {
      id: 2,
      icon: '✅',
      title: 'Choose and relax',
      summary: "Pay when it's done",
      details:
        t('landing.step3Text'),
    },
  ]

  return (
    <div className="min-h-screen bg-[#F8F9FA] bg-[radial-gradient(#c9d2dc_0.8px,transparent_0.8px)] [background-size:16px_16px]">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-4 md:pt-16 md:pb-8 px-4">
        <div className="container mx-auto max-w-6xl relative">
          <SocialBar className="absolute right-0 top-[-1.5rem] sm:top-[-2rem] md:top-[-3rem] md:right-2 lg:right-0" />
          {/* Mobile asymmetric mascot peek */}
          <div className="pointer-events-none absolute -right-6 top-6 z-20 md:hidden">
            <img
              src="/images/gorilla-mascot-newer.png"
              alt=""
              aria-hidden="true"
              className="h-44 w-44 object-contain drop-shadow-sm"
            />
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 pr-24 md:pr-0 animate-fade-in">
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-foreground leading-[0.98]">
                Get things done in Portugal. Fast.
              </h1>
              <p className="max-w-2xl text-lg sm:text-xl md:text-2xl leading-relaxed text-muted-foreground">
                Post a task for free and get offers from trusted local helpers. Pay only when the job is done.
              </p>
              <div className="flex flex-col items-center justify-center gap-3 pt-1 sm:flex-row sm:items-stretch sm:justify-start">
                <Link href="#service-cards-grid">
                  <Button size="lg" className="w-full sm:w-auto min-w-[220px]">
                    Post a Task
                  </Button>
                </Link>
                <Link href="/become-a-helper">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto min-w-[220px] bg-white border-gray-300 text-foreground hover:bg-gray-100"
                  >
                    Earn Money as a Helper
                  </Button>
                </Link>
              </div>
            </div>
            <div className="hidden animate-fade-in md:block">
              <div className="relative mx-auto w-full max-w-sm md:max-w-xs lg:max-w-sm">
                <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-primary-100 to-orange-100 blur-2xl opacity-55" />
                <div className="relative overflow-hidden rounded-3xl">
                  <img
                    src="/images/gorilla-mascot-newer.png"
                    alt="Taskorilla helper assisting a customer"
                    className="h-[260px] w-full object-contain md:h-[280px] lg:h-[300px]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="service-cards-grid">
        <ServiceCardsGrid polka />
      </section>

      {/* Why Use Taskorilla */}
      <section className="pt-8 md:pt-12 pb-10 md:pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl sm:text-4xl font-bold mb-8 md:mb-10 text-foreground">
            Why Taskorilla
          </h2>
          <div className="grid items-start gap-4 md:grid-cols-3">
            {[
              {
                id: 0,
                title: 'Helpers You Can Trust',
                summary: 'Skilled, reliable helpers for any task. Earn badges, collect reviews, and get noticed.',
                full:
                  "Our helpers tackle tasks big and small - from everyday errands like moving furniture or running errands, to professional services like coaching, repairs, or home improvements. Helpers can earn badges, collect reviews, and build a shareable profile so taskers know they're skilled, trustworthy, and ready to get things done.",
              },
              {
                id: 1,
                title: 'Fast, Local & Connected',
                summary: 'Tasks are seen instantly by nearby helpers. Chat and coordinate in real time.',
                full:
                  "When you post a task, helpers nearby who match your needs see it instantly. They can submit offers, message you in real time, and coordinate directly. This makes it easy to get things done quickly - often the same day - without endless searching or waiting for quotes.",
              },
              {
                id: 2,
                title: 'Simple, Secure & Transparent',
                summary: 'Set your budget, compare offers, and pay only when happy.',
                full:
                  "Set your budget, review multiple offers, and pay only when you're satisfied with the work. Track progress, upload photos, and leave and receive verified reviews so everyone knows who's reliable. Taskorilla keeps you in control, your information private, and the process fair, simple, and secure.",
              },
            ].map((item) => {
              const isOpen = openWhyCard === item.id
              return (
                <Card key={item.id} className="self-start rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <CardContent className="p-4 md:p-5">
                    <button
                      type="button"
                      onClick={() => setOpenWhyCard(isOpen ? null : item.id)}
                      className="w-full text-left"
                      aria-expanded={isOpen}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-lg md:text-xl font-semibold text-foreground">
                            {item.title}
                          </h3>
                          <p className="mt-1 md:min-h-[60px] text-sm md:text-base text-muted-foreground">{item.summary}</p>
                        </div>
                        <ChevronDown
                          className={`mt-1 h-5 w-5 flex-shrink-0 text-gray-500 transition-transform ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </button>
                    {isOpen && (
                      <div className="mt-4 border-t border-gray-100 pt-4 text-sm leading-relaxed text-gray-700">
                        {item.full}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Trust Strip */}
      <section className="py-4 md:py-5 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
            <ul className="grid gap-3 text-sm text-gray-700 sm:grid-cols-2 lg:grid-cols-4">
              <li className="flex items-center gap-2">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-primary-600" aria-hidden />
                <span>No upfront payments</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-primary-600" aria-hidden />
                <span>Pay only on completion</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-primary-600" aria-hidden />
                <span>Ratings and reviews</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-primary-600" aria-hidden />
                <span>Local helpers across Portugal</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-10 md:py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-8 md:mb-10">
            How it works
          </h2>
          <div className="grid items-start gap-4 md:grid-cols-3">
            {howItWorksItems.map((item, index) => {
              const isOpen = openHowItWorks === item.id
              return (
                <Card key={item.id} className="self-start rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <CardContent className="p-4 md:p-5">
                    <button
                      type="button"
                      onClick={() => setOpenHowItWorks(isOpen ? null : item.id)}
                      className="w-full text-left"
                      aria-expanded={isOpen}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="inline-flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-sm md:text-base">
                            {item.icon}
                          </span>
                          <h3 className="mt-2 text-lg md:text-xl font-semibold text-foreground">
                            {item.title}
                          </h3>
                          <p className="mt-1 whitespace-pre-line text-sm md:text-base text-muted-foreground">{item.summary}</p>
                        </div>
                        <ChevronDown
                          className={`mt-1 h-5 w-5 flex-shrink-0 text-gray-500 transition-transform ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </button>

                    {isOpen && (
                      <div className="mt-4 border-t border-gray-100 pt-4 text-sm leading-relaxed text-gray-700">
                        {item.details}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-8 md:py-10 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-3xl bg-white border border-gray-200 shadow-sm px-5 md:px-6 py-6 md:py-7 relative overflow-hidden">
            <h2 className="text-3xl sm:text-4xl font-bold mb-5 md:mb-6 text-foreground relative z-10">
              What people are saying
            </h2>
            <div className="grid md:grid-cols-3 gap-3 md:gap-4 relative z-10">
              <Card className="bg-gray-50 border border-gray-200 shadow-sm">
                <CardContent className="p-3 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-gray-200">
                      <img
                        src="/images/sue-brimacombe.png"
                        alt="Sue Brimacombe"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm leading-tight">Sue B.</h3>
                      <p className="text-[11px] leading-tight text-amber-500">★★★★★</p>
                    </div>
                  </div>
                  <p className="text-sm text-foreground/90 leading-snug">
                    "I was very impressed with how thorough the Helper was."
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-50 border border-gray-200 shadow-sm">
                <CardContent className="p-3 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-gray-200">
                      <img
                        src="/images/victoria-bradley.png"
                        alt="Victoria Bradley"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm leading-tight">Victora B.</h3>
                      <p className="text-[11px] leading-tight text-amber-500">★★★★★</p>
                    </div>
                  </div>
                  <p className="text-sm text-foreground/90 leading-snug">
                    "It was super simple to create the task and find help."
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-50 border border-gray-200 shadow-sm">
                <CardContent className="p-3 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-gray-200">
                      <img
                        src="/images/gail-smith.png"
                        alt="Gail Smith"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm leading-tight">Gail S.</h3>
                      <p className="text-[11px] leading-tight text-amber-500">★★★★★</p>
                    </div>
                  </div>
                  <p className="text-sm text-foreground/90 leading-snug">
                    "Taskorilla made it incredibly easy to find help when I needed it."
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Post Free / Earn Money Highlight */}
      <section className="py-10 md:py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-4 md:gap-5">
            <Link href="/tasks/new" className="group">
              <div className="h-full rounded-2xl border border-blue-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-blue-300">
                <div className="mb-3 flex items-start gap-3">
                  <div className="rounded-lg bg-blue-500 p-2.5 transition-transform duration-300 group-hover:scale-105">
                    <ClipboardList className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="mb-1 text-xs font-bold uppercase tracking-wide text-blue-700">{t('roles.taskerTitle')}</h2>
                    <h3 className="mb-1 text-xl font-bold text-gray-900">{stripDashes(t('roles.taskerDescription'))}</h3>
                    <p className="text-sm leading-relaxed text-gray-700">
                      {stripDashes(t('roles.taskerText'))}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
            <Link href="/become-a-helper" className="group">
              <div className="h-full rounded-2xl border border-[#FFD4A3] bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-[#FD9212]">
                <div className="mb-3 flex items-start gap-3">
                  <div className="rounded-lg bg-[#FD9212] p-2.5 transition-transform duration-300 group-hover:scale-105">
                    <Hammer className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="mb-1 text-xs font-bold uppercase tracking-wide text-[#D97706]">{t('roles.helperTitle')}</h2>
                    <h3 className="mb-1 text-xl font-bold text-gray-900">{stripDashes(t('roles.helperDescription'))}</h3>
                    <p className="text-sm leading-relaxed text-gray-700">
                      {stripDashes(t('roles.helperText')).replace(/\s*while helping others\.?/i, '')}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-6 md:py-8 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-2xl border border-[#d9e3eb] bg-[#eef4fa] px-5 py-7 md:px-6 md:py-10 text-center shadow-sm">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
              Stop waiting. Get it done.
            </h2>
            <Link
              href="#service-cards-grid"
              className="mt-4 md:mt-6 inline-flex items-center justify-center rounded-xl bg-primary-600 px-6 py-2.5 md:py-3 text-base font-semibold text-white shadow-md shadow-primary-600/25 transition hover:bg-primary-700"
            >
              Post a Task
            </Link>
          </div>
        </div>
      </section>

      <div className="bg-white">
        <Footer />
      </div>
    </div>
  )
}

