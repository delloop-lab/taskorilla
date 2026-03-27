'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { normalizePageName, trackPageVisit } from '@/lib/traffic'

export default function RouteTrafficTracker() {
  const pathname = usePathname()
  const lastTrackedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname) return
    const pageName = normalizePageName(pathname)
    if (!pageName || lastTrackedRef.current === pageName) return

    lastTrackedRef.current = pageName
    trackPageVisit(pageName)
  }, [pathname])

  return null
}
