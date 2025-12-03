'use client'

import { useEffect } from 'react'
import { trackPageVisit } from '@/lib/traffic'

interface TrafficTrackerProps {
  pageName: string
}

/**
 * Client component to track page visits
 * Add this to any page to track traffic
 */
export default function TrafficTracker({ pageName }: TrafficTrackerProps) {
  useEffect(() => {
    trackPageVisit(pageName)
  }, [pageName])

  return null // This component doesn't render anything
}


