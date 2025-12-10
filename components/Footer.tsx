'use client'

import Link from 'next/link'
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
          <div className="flex flex-wrap justify-center gap-6 text-sm">
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
          </div>
        </div>
      </div>
    </footer>
  )
}




