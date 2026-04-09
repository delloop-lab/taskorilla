'use client'

import { useEffect, useState } from 'react'

export default function ServiceWorkerUpdatePrompt() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // PWA/service workers are only active in production builds for this app.
    if (typeof window === 'undefined') return

    // Manual QA trigger: append ?swUpdateTest=1 to any URL to preview this banner.
    // This avoids waiting for a real service worker update during acceptance testing.
    const params = new URLSearchParams(window.location.search)
    if (params.get('swUpdateTest') === '1') {
      setUpdateAvailable(true)
      return
    }

    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    let cancelled = false

    const markUpdateAvailable = () => {
      if (!cancelled) setUpdateAvailable(true)
    }

    const watchRegistration = (registration: ServiceWorkerRegistration) => {
      // If a worker is already waiting, show prompt immediately.
      if (registration.waiting) {
        markUpdateAvailable()
      }

      // When a new worker installs while this tab is controlled, a new version is ready.
      registration.addEventListener('updatefound', () => {
        const installing = registration.installing
        if (!installing) return

        installing.addEventListener('statechange', () => {
          if (
            installing.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            markUpdateAvailable()
          }
        })
      })
    }

    navigator.serviceWorker
      .getRegistration()
      .then((registration) => {
        if (registration) {
          watchRegistration(registration)
        }
      })
      .catch(() => {
        // Non-fatal: if registration lookup fails, we simply skip the prompt.
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleRefreshNow = async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      window.location.reload()
      return
    }

    setRefreshing(true)

    let didReload = false
    const safeReload = () => {
      if (didReload) return
      didReload = true
      window.location.reload()
    }

    // If a new worker takes control, reload once so the user gets fresh assets.
    navigator.serviceWorker.addEventListener('controllerchange', safeReload, {
      once: true,
    })

    try {
      const registration = await navigator.serviceWorker.getRegistration()

      if (registration?.waiting) {
        // Ask waiting SW to activate now; reload happens on controllerchange.
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        setTimeout(safeReload, 2000)
        return
      }

      // Fallback: if no waiting worker is found, reload directly on user action.
      safeReload()
    } catch {
      safeReload()
    }
  }

  if (!updateAvailable || dismissed) {
    return null
  }

  return (
    <div
      className="fixed inset-x-3 bottom-3 z-[120] sm:inset-x-auto sm:right-4 sm:left-4 sm:max-w-xl sm:mx-auto"
      role="status"
      aria-live="polite"
    >
      <div className="rounded-xl border border-orange-200 bg-white shadow-sm px-4 py-3">
        <p className="text-sm font-semibold" style={{ color: '#8B4513' }}>
          New version available - refresh now.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefreshNow}
            disabled={refreshing}
            className="inline-flex items-center justify-center rounded-md bg-primary-600 text-white px-3 py-2 text-sm font-medium hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {refreshing ? 'Refreshing...' : 'Refresh now'}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="inline-flex items-center justify-center rounded-md border border-orange-200 bg-orange-100 text-gray-800 px-3 py-2 text-sm font-medium hover:bg-orange-200 transition-colors"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  )
}

