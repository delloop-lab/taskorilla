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
      } catch {
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
    if (typeof window !== 'undefined') {
      localStorage.setItem('prelaunch-modal-dismissed', new Date().toISOString())
    }
    setIsOpen(false)
  }

  const handleRegisterClick = () => {
    // Store dismissal when user clicks primary CTA
    if (typeof window !== 'undefined') {
      localStorage.setItem('prelaunch-modal-dismissed', new Date().toISOString())
    }
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
            Taskorilla is live!
            <span className="block">Get things done today</span>
          </h2>

          {/* Body copy */}
          <div className="text-gray-700 mb-6 space-y-3 leading-relaxed">
            <p>
              Post a task, find Helpers nearby, and get it done today. Early users snag perks, give feedback, and help shape Taskorilla from the ground up.
            </p>
            <p>
              Jump in now, be first in line for exclusive bonuses and updates.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <Link
              href="/tasks/new"
              onClick={handleRegisterClick}
              className="flex-1 px-6 py-3.5 bg-gradient-to-r from-[#0185C8] to-[#05A8FF] text-white rounded-full font-semibold shadow-lg shadow-[#0185C8]/40 hover:shadow-xl hover:from-[#0170a8] hover:to-[#0394e0] focus:outline-none focus:ring-2 focus:ring-[#0185C8] focus:ring-offset-2 transition-all duration-150 text-center transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Post a task
            </Link>
            <button
              onClick={handleClose}
              className="flex-1 px-6 py-3 bg-white text-gray-700 rounded-full font-semibold border border-gray-300 shadow-md hover:bg-gray-50 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-all duration-150"
            >
              Explore Site
            </button>
          </div>

          {/* Footer text */}
          <p className="text-xs text-gray-500">
            No spam, just perks and updates for early Helpers.
          </p>
        </div>
      </div>
    </div>
  )
}

