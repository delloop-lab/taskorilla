'use client'

import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '@/lib/i18n'

// Debug logging - only in development, and only for important events
const isDev = process.env.NODE_ENV === 'development'
const debugLog = (...args: any[]) => isDev && console.log(...args)
const debugWarn = (...args: any[]) => {
  // Only show warnings once per session to reduce noise
  if (isDev && !(window as any).__pwaWarningsShown) {
    (window as any).__pwaWarningsShown = true
    console.warn(...args)
  }
}

// Translations for the install modal
const translations = {
  en: {
    title: 'Install Taskorilla',
    subtitle: 'Get the full app experience!',
    description: 'Install our app for quick access, offline support, and a better experience.',
    worksOffline: 'Works offline',
    fasterLoading: 'Faster loading',
    homeScreenAccess: 'Home screen access',
    notNow: 'Not Now',
    install: 'Install'
  },
  pt: {
    title: 'Instalar Taskorilla',
    subtitle: 'Tenha a experiência completa!',
    description: 'Instale a nossa app para acesso rápido, suporte offline e uma melhor experiência.',
    worksOffline: 'Funciona offline',
    fasterLoading: 'Carregamento mais rápido',
    homeScreenAccess: 'Acesso no ecrã inicial',
    notNow: 'Agora Não',
    install: 'Instalar'
  }
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPromptModal() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [browserPromptDetected, setBrowserPromptDetected] = useState(false)
  const [modalLanguage, setModalLanguage] = useState<'en' | 'pt'>('en') // Default to English
  const { setLanguage } = useLanguage()
  const effectRunRef = useRef(false)
  
  // Get translations based on modal language
  const t = translations[modalLanguage]
  
  // Toggle language for modal and also update global language
  const toggleLanguage = () => {
    const newLang = modalLanguage === 'pt' ? 'en' : 'pt'
    setModalLanguage(newLang)
    setLanguage(newLang)
  }

  useEffect(() => {
    // Prevent duplicate runs (React StrictMode causes double renders in dev)
    if (effectRunRef.current) return
    effectRunRef.current = true
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Clean up old localStorage/sessionStorage entries if they exist (from previous implementation)
    if (localStorage.getItem('pwa-install-dismissed')) {
      localStorage.removeItem('pwa-install-dismissed')
    }
    if (sessionStorage.getItem('pwa-install-dismissed')) {
      sessionStorage.removeItem('pwa-install-dismissed')
    }

    // Detect if browser is showing its native prompt
    // Check periodically if browser showed its prompt (we can't directly detect it, but we can infer)
    const checkForBrowserPrompt = () => {
      // If browserPromptShown flag is set, browser likely showed its own prompt
      if ((window as any).browserPromptShown) {
        setBrowserPromptDetected(true)
        return true
      }
      
      // If beforeinstallprompt fired but wasn't prevented, browser likely showed its prompt
      // Check if our script didn't successfully block it
      if ((window as any).deferredPrompt && !(window as any).nativePromptBlocked) {
        setBrowserPromptDetected(true)
        return true
      }
      
      return false
    }

    // Check if prompt was already captured by global script
    const checkExistingPrompt = () => {
      // First check if browser is showing its prompt
      if (checkForBrowserPrompt()) {
        debugLog('⚠️ Browser native prompt detected, hiding custom modal')
        return
      }

      // Only show our custom modal if we successfully blocked the native prompt
      if ((window as any).deferredPrompt && (window as any).nativePromptBlocked) {
        setDeferredPrompt((window as any).deferredPrompt as BeforeInstallPromptEvent)
        // Show modal after a delay, but check again before showing
        setTimeout(() => {
          // Double-check that browser didn't show its prompt in the meantime
          if (!checkForBrowserPrompt()) {
            setShowModal(true)
          }
        }, 3000)
      } else {
        // If native prompt wasn't blocked, don't show our custom modal
        debugWarn('⚠️ Native prompt not blocked, hiding custom modal')
        setBrowserPromptDetected(true)
      }
    }

    // Check immediately
    checkExistingPrompt()

    // Listen for custom event from global script
    const handlePWAInstallAvailable = () => {
      // Check if browser showed its prompt
      if (checkForBrowserPrompt()) {
        return
      }

      // Only show if we successfully blocked the native prompt
      if ((window as any).deferredPrompt && (window as any).nativePromptBlocked) {
        setDeferredPrompt((window as any).deferredPrompt as BeforeInstallPromptEvent)
        // Show modal after a delay
        setTimeout(() => {
          if (!checkForBrowserPrompt()) {
            setShowModal(true)
          }
        }, 3000)
      }
    }

    // Also listen for beforeinstallprompt as fallback (in case global script didn't catch it)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      e.stopImmediatePropagation()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Store globally for consistency
      ;(window as any).deferredPrompt = e
      ;(window as any).nativePromptBlocked = true
      
      // Show modal after a delay
      setTimeout(() => {
        if (!checkForBrowserPrompt()) {
          setShowModal(true)
        }
      }, 3000)
    }

    // Monitor for browser showing its prompt (check every 500ms for first 5 seconds)
    let checkCount = 0
    const monitorInterval = setInterval(() => {
      checkCount++
      if (checkForBrowserPrompt()) {
        setShowModal(false) // Hide our modal if browser shows its prompt
      }
      if (checkCount >= 10) { // Stop after 5 seconds (10 * 500ms)
        clearInterval(monitorInterval)
      }
    }, 500)

    window.addEventListener('pwa-install-available', handlePWAInstallAvailable)
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt, true) // Use capture phase

    return () => {
      clearInterval(monitorInterval)
      window.removeEventListener('pwa-install-available', handlePWAInstallAvailable)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    try {
      // Show the install prompt
      await deferredPrompt.prompt()

      // Wait for the user to respond
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        debugLog('User accepted the install prompt')
        setIsInstalled(true)
      } else {
        debugLog('User dismissed the install prompt')
      }
    } catch (error) {
      console.error('Error showing install prompt:', error)
    }

    // Clear the prompt
    setDeferredPrompt(null)
    ;(window as any).deferredPrompt = null
    setShowModal(false)
  }

  const handleDismiss = () => {
    setShowModal(false)
    setIsDismissed(true)
    // Note: We don't persist dismissal - modal will show again on refresh (F5)
  }

  // Don't show if already installed, dismissed, browser prompt detected, or no prompt available
  if (isInstalled || isDismissed || browserPromptDetected || !showModal || !deferredPrompt) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
        {/* Language toggle - Portuguese flag */}
        <button
          onClick={toggleLanguage}
          className="absolute top-4 left-4 w-7 h-5 overflow-hidden hover:opacity-80 transition-opacity"
          aria-label={modalLanguage === 'pt' ? 'Switch to English' : 'Mudar para Português'}
          title={modalLanguage === 'pt' ? 'Switch to English' : 'Mudar para Português'}
        >
          {modalLanguage === 'pt' ? (
            // UK flag for English
            <svg viewBox="0 0 60 30" className="w-full h-full">
              <clipPath id="s"><path d="M0,0 v30 h60 v-30 z"/></clipPath>
              <clipPath id="t"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/></clipPath>
              <g clipPath="url(#s)">
                <path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
                <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
                <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#t)" stroke="#C8102E" strokeWidth="4"/>
                <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/>
                <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/>
              </g>
            </svg>
          ) : (
            // Portuguese flag
            <svg viewBox="0 0 60 40" className="w-full h-full">
              <rect width="60" height="40" fill="#FF0000"/>
              <rect width="24" height="40" fill="#006600"/>
              <circle cx="24" cy="20" r="8" fill="#FFCC00"/>
              <circle cx="24" cy="20" r="6" fill="#FF0000"/>
              <circle cx="24" cy="20" r="5" fill="#fff"/>
              <circle cx="24" cy="20" r="3" fill="#002FA7"/>
            </svg>
          )}
        </button>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-[#FD9212] to-[#f59e0b] rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t.title}
          </h2>
          <p className="text-gray-600 mb-1">
            {t.subtitle}
          </p>
          <p className="text-sm text-gray-500">
            {t.description}
          </p>
        </div>

        {/* Features list */}
        <div className="mb-6 space-y-2">
          <div className="flex items-center text-sm text-gray-700">
            <svg className="w-5 h-5 text-[#FD9212] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {t.worksOffline}
          </div>
          <div className="flex items-center text-sm text-gray-700">
            <svg className="w-5 h-5 text-[#FD9212] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {t.fasterLoading}
          </div>
          <div className="flex items-center text-sm text-gray-700">
            <svg className="w-5 h-5 text-[#FD9212] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {t.homeScreenAccess}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleDismiss}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            {t.notNow}
          </button>
          <button
            onClick={handleInstall}
            className="flex-1 px-4 py-2 bg-[#FD9212] text-white rounded-lg font-medium hover:bg-[#e8820f] transition-colors shadow-sm"
          >
            {t.install}
          </button>
        </div>
      </div>
    </div>
  )
}

