'use client'

import Link from 'next/link'
import { Facebook } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLanguage } from '@/lib/i18n'

interface FooterProps {
  variant?: 'default' | 'centered'
}

export default function Footer({ variant = 'default' }: FooterProps) {
  const { t } = useLanguage()
  const [version, setVersion] = useState<string>('Beta V0.0.0')

  useEffect(() => {
    // Fetch version dynamically from API to avoid caching issues
    fetch('/api/version', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => setVersion(`Beta V${data.version}`))
      .catch(() => {
        // Fallback to static import if fetch fails
        import('@/version.json').then(versionData => {
          setVersion(`Beta V${versionData.default.version}`)
        })
      })
  }, [])

  if (variant === 'centered') {
    return (
      <footer className="py-4 px-4 bg-muted/50 border-t border-border">
        <div className="container mx-auto max-w-6xl text-center text-muted-foreground text-sm">
          <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1">
            <span>{t('footer.rights')}</span>
            <span className="text-xs opacity-75">{version}</span>
            <a 
              href="https://www.facebook.com/profile.php?id=61584791914940" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center"
              aria-label="Follow us on Facebook"
            >
              <Facebook className="w-6 h-6" />
            </a>
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer className="py-4 px-4 bg-muted/50 border-t border-border">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <Link href="/about" className="hover:text-foreground transition-colors">{t('footer.aboutUs')}</Link>
          <span className="text-muted-foreground/30">|</span>
          <Link href="/help" className="hover:text-foreground transition-colors">{t('footer.helpCenter')}</Link>
          <span className="text-muted-foreground/30">|</span>
          <Link href="/privacy" className="hover:text-foreground transition-colors">{t('footer.privacyPolicy')}</Link>
          <span className="text-muted-foreground/30">|</span>
          <Link href="/terms" className="hover:text-foreground transition-colors">{t('footer.termsOfService')}</Link>
          <span className="text-muted-foreground/30">|</span>
          <a href="mailto:tee@taskorilla.com" className="hover:text-foreground transition-colors">{t('footer.contact')}</a>
          <span className="text-muted-foreground/30">|</span>
          <a 
            href="https://www.facebook.com/profile.php?id=61584791914940" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center"
            aria-label="Follow us on Facebook"
          >
            <Facebook className="w-6 h-6" />
          </a>
        </div>
        <div className="flex justify-center items-center gap-2 mt-2 text-xs text-muted-foreground/70">
          <span>{t('footer.rights')}</span>
          <span>•</span>
          <span>{version}</span>
        </div>
      </div>
    </footer>
  )
}




