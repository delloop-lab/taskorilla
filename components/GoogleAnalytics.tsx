'use client'

import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

interface GoogleAnalyticsProps {
  measurementId?: string
}

declare global {
  interface Window {
    dataLayer: any[]
    gtag: (...args: any[]) => void
  }
}

/**
 * Google Analytics 4 (GA4) component for Next.js App Router
 * 
 * Features:
 * - Loads GA4 script using Next.js optimized Script component
 * - Automatically tracks pageviews on route changes
 * - Only loads in production environment
 * - Provides trackEvent helper for custom event tracking
 * 
 * @param measurementId - Your GA4 Measurement ID (e.g., G-XXXXXXXXXX)
 */
export default function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  const pathname = usePathname()

  // Track pageviews on route changes
  useEffect(() => {
    if (!measurementId || process.env.NODE_ENV !== 'production') return
    if (typeof window === 'undefined' || !window.gtag) return

    // Track pageview on route change
    window.gtag('config', measurementId, {
      page_path: pathname,
    })
  }, [pathname, measurementId])

  // Don't load GA in development or if measurement ID is missing
  if (!measurementId || process.env.NODE_ENV !== 'production') {
    return null
  }

  return (
    <>
      {/* Load Google Analytics script */}
      <Script
        id="ga-script"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      />
      {/* Initialize Google Analytics */}
      <Script
        id="ga-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${measurementId}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  )
}

/**
 * Helper function to track custom events in Google Analytics
 * 
 * @example
 * trackEvent({
 *   action: 'click',
 *   category: 'button',
 *   label: 'Subscribe',
 *   value: 1
 * })
 */
export const trackEvent = ({
  action,
  category,
  label,
  value,
}: {
  action: string
  category: string
  label?: string
  value?: number
}) => {
  if (typeof window === 'undefined' || !window.gtag) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Google Analytics not loaded - event not tracked:', { action, category, label, value })
    }
    return
  }

  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value,
  })
}
