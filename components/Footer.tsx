'use client'

import Link from 'next/link'
import { Facebook } from 'lucide-react'
import versionData from '@/version.json'
import { useLanguage } from '@/lib/i18n'

interface FooterProps {
  variant?: 'default' | 'centered'
}

export default function Footer({ variant = 'default' }: FooterProps) {
  const { t } = useLanguage()
  const version = `Beta V${versionData.version}`

  if (variant === 'centered') {
    return (
      <footer className="py-8 px-4 bg-muted/50 border-t border-border">
        <div className="container mx-auto max-w-6xl text-center text-muted-foreground">
          <p>{t('footer.rights')}</p>
          <p className="mt-2 text-xs opacity-75">{version}</p>
          <div className="mt-4 flex justify-center">
            <a 
              href="https://www.facebook.com/profile.php?id=61584791914940" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors"
              aria-label="Follow us on Facebook"
            >
              <Facebook className="w-5 h-5 text-white" />
            </a>
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer className="py-8 px-4 bg-muted/50 border-t border-border">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-muted-foreground">
          <div className="flex flex-col gap-1">
            <p>{t('footer.rights')}</p>
            <p className="text-xs opacity-75">{version}</p>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-6 text-sm">
            <Link href="/about" className="hover:text-foreground transition-colors">
              {t('footer.aboutUs')}
            </Link>
            <Link href="/help" className="hover:text-foreground transition-colors">
              {t('footer.helpCenter')}
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              {t('footer.privacyPolicy')}
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              {t('footer.termsOfService')}
            </Link>
            <a href="mailto:tee@taskorilla.com" className="hover:text-foreground transition-colors">
              {t('footer.contact')}
            </a>
            <a 
              href="https://www.facebook.com/profile.php?id=61584791914940" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors"
              aria-label="Follow us on Facebook"
            >
              <Facebook className="w-5 h-5 text-white" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}




