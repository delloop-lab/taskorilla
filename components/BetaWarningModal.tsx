'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function BetaWarningModal() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Check sessionStorage to see if modal has been dismissed in this session
    const dismissed = sessionStorage.getItem('beta-warning-dismissed')
    if (!dismissed) {
      // Small delay to ensure page is loaded
      setTimeout(() => {
        setIsOpen(true)
      }, 500)
    }
  }, [])

  const handleDismiss = () => {
    // Mark as dismissed in sessionStorage
    sessionStorage.setItem('beta-warning-dismissed', 'true')
    setIsOpen(false)
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
        {/* Icon */}
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-100 mb-4">
          <AlertTriangle className="h-6 w-6 text-amber-600" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
          BETA TEST
        </h2>

        {/* Message */}
        <p className="text-gray-700 text-center mb-6 leading-relaxed">
          This site is currently in beta. All tasks, bids, and transactions are just for testing, no real jobs or payments will take place.
        </p>

        {/* Button */}
        <div className="flex justify-center">
          <button
            onClick={handleDismiss}
            className="px-6 py-2 bg-primary-600 text-white rounded-md font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  )
}









