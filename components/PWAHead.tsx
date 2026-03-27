'use client'

import { useEffect } from 'react'

export default function PWAHead() {
  useEffect(() => {
    // In development, proactively unregister any previously installed service workers
    // to avoid stale chunk/CSS cache issues during HMR.
    if (process.env.NODE_ENV !== 'production') {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            registration.unregister().catch(() => {})
          })
        })
        if ('caches' in window) {
          caches.keys().then((keys) => {
            keys.forEach((key) => {
              caches.delete(key).catch(() => {})
            })
          })
        }
      }
      return
    }

    // Register service worker manually if next-pwa auto-registration doesn't work
    // Service workers are disabled in dev mode, so only register in production builds
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Check if already registered
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        const isRegistered = registrations.some(
          (reg) => reg.active && reg.active.scriptURL.includes('/sw.js')
        )

        if (!isRegistered) {
          // Register the service worker
          navigator.serviceWorker
            .register('/sw.js', { scope: '/' })
            .then((registration) => {
              console.log('✅ Service Worker registered:', registration.scope)
              
              // Check for updates
              registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing
                if (newWorker) {
                  newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                      console.log('🔄 New service worker available')
                    }
                  })
                }
              })
            })
            .catch((error) => {
              console.error('❌ Service Worker registration failed:', error)
            })
        } else {
          console.log('✅ Service Worker already registered')
        }
      })
    }
  }, [])

  return null
}


















