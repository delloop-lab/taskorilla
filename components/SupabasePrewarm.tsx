'use client'

import { useEffect } from 'react'
import { prewarmSupabaseConnection } from '@/lib/supabase-prewarm'

/**
 * Component that pre-warms the Supabase connection on mount
 * This helps reduce latency for the first real database query
 * 
 * Place this in your layout.tsx to warm the connection as early as possible
 */
export default function SupabasePrewarm() {
  useEffect(() => {
    // Pre-warm connection immediately on app load
    // Use requestIdleCallback if available for better performance
    if (typeof window !== 'undefined') {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => {
          prewarmSupabaseConnection()
        }, { timeout: 1000 })
      } else {
        // Fallback: run after a short delay
        setTimeout(() => {
          prewarmSupabaseConnection()
        }, 100)
      }
    }
  }, [])

  // This component renders nothing
  return null
}
