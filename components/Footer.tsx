'use client'

import Link from 'next/link'
import { FaFacebookF, FaInstagram, FaTiktok, FaYoutube } from 'react-icons/fa6'
import { useEffect, useState } from 'react'
import { useLanguage } from '@/lib/i18n'

interface FooterProps {
  variant?: 'default' | 'centered'
}

export default function Footer({ variant = 'default' }: FooterProps) {
  const { t } = useLanguage()
  const [version, setVersion] = useState<string>('V0.000')

  const formatVersionLabel = (rawVersion: string): string => {
    const [majorRaw = '0', minorRaw = '0', patchRaw = '0'] = String(rawVersion || '').split('.')
    const major = Number.parseInt(majorRaw, 10) || 0
    const minor = Number.parseInt(minorRaw, 10) || 0
    const patch = Number.parseInt(patchRaw, 10) || 0
    return `V${major}.${String(minor).padStart(1, '0')}${String(patch).padStart(2, '0')}`
  }

  useEffect(() => {
    const versionUrl = `/api/version?v=${Date.now()}`
    // Fetch version dynamically from API to avoid caching issues
    fetch(versionUrl, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => setVersion(formatVersionLabel(data.version)))
      .catch(() => {
        // Fallback to static import if fetch fails
        import('@/version.json').then(versionData => {
          setVersion(formatVersionLabel(versionData.default.version))
        })
      })
  }, [])

  if (variant === 'centered') {
    return (
      <footer className="py-4 px-4 bg-muted/50 border-t border-border">
        <div className="container mx-auto max-w-6xl text-center text-muted-foreground text-sm">
          <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1">
            <span>{t('footer.rights')}</span>
            <span className="text-xs opacity-75 font-medium">{version}</span>
            <a
              href="https://www.facebook.com/groups/taskorilla/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center"
              aria-label="Follow us on Facebook"
            >
              <FaFacebookF className="w-4 h-4 sm:w-5 sm:h-5" />
            </a>
            <a
              href="https://www.instagram.com/taskorilla"
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-600 hover:text-pink-700 transition-colors inline-flex items-center"
              aria-label="Follow us on Instagram"
            >
              <FaInstagram className="w-4 h-4 sm:w-5 sm:h-5" />
            </a>
            <a
              href="https://www.tiktok.com/@taskorilla"
              target="_blank"
              rel="noopener noreferrer"
              className="text-black hover:text-gray-800 dark:text-gray-100 dark:hover:text-white transition-colors inline-flex items-center"
              aria-label="Follow us on TikTok"
            >
              <FaTiktok className="w-4 h-4 sm:w-5 sm:h-5" />
            </a>
            <a
              href="https://www.youtube.com/@gettaskorilla"
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-600 hover:text-red-700 transition-colors inline-flex items-center"
              aria-label="Follow us on YouTube"
            >
              <FaYoutube className="w-4 h-4 sm:w-5 sm:h-5" />
            </a>
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer className="py-4 px-4 bg-muted/50 border-t border-border">
      <div className="container mx-auto max-w-6xl">
        <div className="hidden md:flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <Link href="/about" className="hover:text-foreground transition-colors">{t('footer.aboutUs')}</Link>
          <span className="text-muted-foreground/30">|</span>
          <Link href="/privacy" className="hover:text-foreground transition-colors">{t('footer.privacyPolicy')}</Link>
          <span className="text-muted-foreground/30">|</span>
          <Link href="/terms" className="hover:text-foreground transition-colors">{t('footer.termsOfService')}</Link>
          <span className="text-muted-foreground/30">|</span>
          <Link href="/advertising-opportunities" className="hover:text-foreground transition-colors">
            {t('footer.advertising')}
          </Link>
          <span className="text-muted-foreground/30">|</span>
          <Link href="/partnerships" className="hover:text-foreground transition-colors">
            {t('footer.partner')}
          </Link>
          <span className="text-muted-foreground/30">|</span>
          <Link href="/blog" className="hover:text-foreground transition-colors">{t('footer.blog')}</Link>
          <span className="text-muted-foreground/30">|</span>
          <Link href="/contact" className="hover:text-foreground transition-colors">{t('footer.contact')}</Link>
          <span className="text-muted-foreground/30">|</span>
          <a
            href="https://www.facebook.com/groups/taskorilla/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center"
            aria-label="Follow us on Facebook"
          >
            <FaFacebookF className="w-4 h-4 sm:w-5 sm:h-5" />
          </a>
          <a
            href="https://www.instagram.com/taskorilla"
            target="_blank"
            rel="noopener noreferrer"
            className="text-pink-600 hover:text-pink-700 transition-colors inline-flex items-center"
            aria-label="Follow us on Instagram"
          >
            <FaInstagram className="w-4 h-4 sm:w-5 sm:h-5" />
          </a>
          <a
            href="https://www.tiktok.com/@taskorilla"
            target="_blank"
            rel="noopener noreferrer"
            className="text-black hover:text-gray-800 dark:text-gray-100 dark:hover:text-white transition-colors inline-flex items-center"
            aria-label="Follow us on TikTok"
          >
            <FaTiktok className="w-4 h-4 sm:w-5 sm:h-5" />
          </a>
          <a
            href="https://www.youtube.com/@gettaskorilla"
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-600 hover:text-red-700 transition-colors inline-flex items-center"
            aria-label="Follow us on YouTube"
          >
            <FaYoutube className="w-4 h-4 sm:w-5 sm:h-5" />
          </a>
        </div>
        <div className="flex justify-center items-center gap-2 mt-2 text-xs text-muted-foreground/70">
          <span>{t('footer.rights')}</span>
          <span className="font-medium">{version}</span>
        </div>
      </div>
    </footer>
  )
}




