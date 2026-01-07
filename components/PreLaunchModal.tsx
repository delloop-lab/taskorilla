'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'

export default function PreLaunchModal() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Check localStorage to see if modal has been dismissed within the last 7 days
    const checkShouldShow = () => {
      if (typeof window === 'undefined') return false

      const dismissedData = localStorage.getItem('prelaunch-modal-dismissed')
      if (!dismissedData) return true

      try {
        const dismissedDate = new Date(dismissedData)
        const now = new Date()
        const daysSinceDismissed = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
        
        // Show again if 7 days have passed
        return daysSinceDismissed >= 7
      } catch (error) {
        // If there's an error parsing, show the modal
        return true
      }
    }

    if (checkShouldShow()) {
      // Show modal after 2.5 second delay
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 2500)

      return () => clearTimeout(timer)
    }
  }, [])

  const handleClose = () => {
    // Store current date in localStorage
    localStorage.setItem('prelaunch-modal-dismissed', new Date().toISOString())
    setIsOpen(false)
  }

  const handleRegisterClick = () => {
    // Store dismissal when user clicks register
    localStorage.setItem('prelaunch-modal-dismissed', new Date().toISOString())
    setIsOpen(false)
    // Navigation will happen via Link component
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative animate-slide-up">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full p-1"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Content */}
        <div className="text-center">
          {/* Headline */}
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            Taskorilla is almost here
          </h2>

          {/* Body copy */}
          <div className="text-gray-700 mb-6 space-y-3 leading-relaxed">
            <p>
              We're officially launching on <strong className="text-gray-900">1 February</strong>.
            </p>
            <p>
              If you've got jobs that need doing, now's the perfect time to register and be ready from day one.
            </p>
            <p>
              Early sign ups get first access when we go live.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <Link
              href="/register"
              onClick={handleRegisterClick}
              className="flex-1 px-6 py-3 bg-[#0185C8] text-white rounded-lg font-semibold hover:bg-[#0170a8] focus:outline-none focus:ring-2 focus:ring-[#0185C8] focus:ring-offset-2 transition-colors text-center"
            >
              Register now
            </Link>
            <button
              onClick={handleClose}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors"
            >
              Take a look around
            </button>
          </div>

          {/* Footer text */}
          <p className="text-xs text-gray-500">
            No spam. Just a heads up when we launch.
          </p>
        </div>
      </div>
    </div>
  )
}

