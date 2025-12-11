'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, MessageSquare, Star, ClipboardList, Wallet } from 'lucide-react'
import { TransparentGorillaImage } from '@/components/TransparentGorillaImage'
import TrafficTracker from '@/components/TrafficTracker'
import Footer from '@/components/Footer'
import { useLanguage } from '@/lib/i18n'

export default function Home() {
  const { t } = useLanguage()
  return (
    <div className="min-h-screen bg-background">
      <TrafficTracker pageName="home" />
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10 pt-14 md:pt-20 pb-8 md:pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 animate-fade-in">
              <h1 className="text-5xl md:text-6xl font-bold text-foreground leading-tight">
                {t('homepage.tagline')}
              </h1>
              <div className="text-xl text-muted-foreground">
                <p>
                  {t('homepage.description1')}
                </p>
                <p>
                  {t('homepage.description2')}
                </p>
              </div>
              <div className="flex flex-wrap gap-4 pt-[10px] mb-0">
                <Link href="/tasks/new" className="action-button post-button">
                  <div className="button-icon">
                    🆘
                  </div>
                  <div className="button-text">
                    <h2 className="button-title">{t('homepage.postTask')}</h2>
                    <p className="button-subtitle">{t('homepage.postTaskSubtitle')}</p>
                  </div>
                </Link>
                <Link href="/tasks" className="action-button browse-button">
                  <div className="button-icon">
                    💵
                  </div>
                  <div className="button-text">
                    <h2 className="button-title">{t('homepage.browseTasks')}</h2>
                    <p className="button-subtitle">{t('homepage.browseTasksSubtitle')}</p>
                  </div>
                </Link>
              </div>
            </div>
            <div className="animate-fade-in">
              <TransparentGorillaImage />
            </div>
          </div>
        </div>
      </section>

      {/* Subheadline */}
      <section className="pt-4 md:pt-6 pb-8 md:pb-12 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl text-center">
          <p className="text-lg text-muted-foreground">
            {t('landing.heroSubtitle')}
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl font-bold text-center mb-16 text-foreground">
            {t('landing.howItWorksTitle')}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="hover-scale">
              <CardContent className="p-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                  1
                </div>
                <h3 className="text-2xl font-semibold text-foreground">
                  {t('landing.step1Title')}
                </h3>
                <p className="text-muted-foreground">
                  {t('landing.step1Text')}
                </p>
              </CardContent>
            </Card>

            <Card className="hover-scale">
              <CardContent className="p-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center text-secondary text-2xl font-bold">
                  2
                </div>
                <h3 className="text-2xl font-semibold text-foreground">
                  {t('landing.step2Title')}
                </h3>
                <p className="text-muted-foreground">
                  {t('landing.step2Text')}
                </p>
              </CardContent>
            </Card>

            <Card className="hover-scale">
              <CardContent className="p-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-accent text-2xl font-bold">
                  3
                </div>
                <h3 className="text-2xl font-semibold text-foreground">
                  {t('landing.step3Title')}
                </h3>
                <p className="text-muted-foreground">
                  {t('landing.step3Text')}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Why Use Taskorilla */}
      <section className="pt-12 md:pt-20 pb-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl font-bold text-center mb-16 text-foreground">
            {t('landing.whyUseTitle')}
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="hover-scale">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-secondary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-foreground text-lg mb-2">{t('landing.brainyBrawnyTitle')}</h3>
                    <p className="text-muted-foreground">
                      {t('landing.brainyBrawnyText')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-scale">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-6 h-6 text-secondary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-foreground text-lg mb-2">{t('landing.fastLocalTitle')}</h3>
                    <p className="text-muted-foreground">
                      {t('landing.fastLocalText')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-scale">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-start gap-3">
                  <Star className="w-6 h-6 text-secondary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-foreground text-lg mb-2">{t('landing.trustTitle')}</h3>
                    <p className="text-muted-foreground">
                      {t('landing.trustText')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-scale">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-secondary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-foreground text-lg mb-2">{t('landing.flexibleTitle')}</h3>
                    <p className="text-muted-foreground">
                      {t('landing.flexibleText')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-scale md:col-span-2">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-secondary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-foreground text-lg mb-2">{t('landing.communityTitle')}</h3>
                    <p className="text-muted-foreground">
                      {t('landing.communityText')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Fun Taglines */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            <div className="p-6 rounded-lg bg-muted">
              <p className="text-xl font-bold text-foreground">"{t('landing.slogan1')}"</p>
            </div>
            <div className="p-6 rounded-lg bg-muted">
              <p className="text-xl font-bold text-foreground">"{t('landing.slogan2')}"</p>
            </div>
            <div className="p-6 rounded-lg bg-muted">
              <p className="text-xl font-bold text-foreground">"{t('landing.slogan3')}"</p>
            </div>
            <div className="p-6 rounded-lg bg-muted">
              <p className="text-xl font-bold text-foreground">"{t('landing.slogan4')}"</p>
            </div>
          </div>
        </div>
      </section>

      {/* Post Free / Earn Money Highlight */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8">
            <Link href="/tasks/new" className="group">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-8 shadow-lg border-2 border-blue-300 hover:shadow-xl hover:border-blue-400 transition-all duration-300 hover:-translate-y-1 h-full">
                <div className="flex items-start gap-4 mb-4">
                  <div className="bg-blue-500 rounded-lg p-3 group-hover:scale-110 transition-transform duration-300">
                    <ClipboardList className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-sm font-bold text-blue-700 uppercase mb-2">{t('roles.taskerTitle')}</h2>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('roles.taskerDescription')}</h3>
                    <p className="text-sm text-blue-700 font-medium mb-3">{t('roles.taskerText')}</p>
                    <p className="text-gray-700">
                      {t('roles.taskerText')}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
            <Link href="/tasks" className="group">
              <div className="bg-gradient-to-br from-[#FFF4E6] to-[#FFE5CC] rounded-xl p-8 shadow-lg border-2 border-[#FFD4A3] hover:shadow-xl hover:border-[#FD9212] transition-all duration-300 hover:-translate-y-1 h-full">
                <div className="flex items-start gap-4 mb-4">
                  <div className="bg-[#FD9212] rounded-lg p-3 group-hover:scale-110 transition-transform duration-300">
                    <Wallet className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-sm font-bold text-[#D97706] uppercase mb-2">{t('roles.helperTitle')}</h2>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('roles.helperDescription')}</h3>
                    <p className="text-gray-700">
                      {t('roles.helperText')}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pt-12 md:pt-20 pb-8 md:pb-20 px-4 bg-gradient-to-br from-primary to-accent text-primary-foreground">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-4 items-center">
            <div className="flex justify-center md:justify-end order-2 md:order-1">
              <img 
                src="/images/taskorilla-mascot.png" 
                alt="Taskorilla mascot" 
                className="h-56 w-56 md:h-72 md:w-72 object-contain"
                style={{ backgroundColor: 'transparent' }}
              />
            </div>
            <div className="text-center space-y-6 order-1 md:order-2">
              <h2 className="text-4xl md:text-5xl font-bold">
                {t('landing.mascotTitle')}
              </h2>
              <p className="text-xl opacity-90">
                {t('landing.mascotText')}
              </p>
              <div className="flex flex-col items-center gap-4">
                <Link href="/tasks/new" className="action-button post-button">
                  <div className="button-icon">
                    🆘
                  </div>
                  <div className="button-text">
                    <div className="button-title">{t('homepage.postTask')}</div>
                    <div className="button-subtitle">{t('homepage.postTaskSubtitle')}</div>
                  </div>
                </Link>
                <Link href="/tasks" className="action-button browse-button">
                  <div className="button-icon">
                    💵
                  </div>
                  <div className="button-text">
                    <div className="button-title">{t('homepage.browseTasks')}</div>
                    <div className="button-subtitle">{t('homepage.browseTasksSubtitle')}</div>
                  </div>
                </Link>
              </div>
            </div>
            <div className="flex justify-center md:justify-start order-3">
              <img 
                src="/images/tee_on_laptop.png" 
                alt="Tee on laptop" 
                className="h-[300px] w-[300px] object-contain"
                style={{ backgroundColor: 'transparent' }}
              />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
