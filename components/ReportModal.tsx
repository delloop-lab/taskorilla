'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import StandardModal from './StandardModal'

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  reportType: 'task' | 'user'
  targetId: string
  targetName?: string
  onReportSubmitted?: () => void
}

const REPORT_REASONS = {
  task: [
    'Spam or misleading content',
    'Inappropriate content',
    'Scam or fraud',
    'Duplicate task',
    'Violates platform rules',
    'Other'
  ],
  user: [
    'Harassment or bullying',
    'Inappropriate behavior',
    'Spam or fake profile',
    'Scam or fraud',
    'Violates platform rules',
    'Other'
  ]
}

export default function ReportModal({
  isOpen,
  onClose,
  reportType,
  targetId,
  targetName,
  onReportSubmitted
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState('')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [internalIsOpen, setInternalIsOpen] = useState(isOpen)

  // Sync internal state with prop, but only when not showing success modal
  useEffect(() => {
    if (!showSuccessModal) {
      setInternalIsOpen(isOpen)
    }
  }, [isOpen, showSuccessModal])

  const handleSubmit = async () => {
    if (!selectedReason) {
      return
    }

    setSubmitting(true)
    try {
      // Get the session token for authentication
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch('/api/reports/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && {
            'Authorization': `Bearer ${session.access_token}`
          }),
        },
        body: JSON.stringify({
          reportType,
          targetId,
          reason: selectedReason,
          details: details.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Include details if available for better error messages
        const errorMessage = data.details 
          ? `${data.error || 'Failed to submit report'}: ${data.details}`
          : (data.error || 'Failed to submit report')
        throw new Error(errorMessage)
      }

      // Reset form
      setSelectedReason('')
      setDetails('')
      
      // Hide report form and show success modal
      setInternalIsOpen(false)
      setShowSuccessModal(true)
      
      if (onReportSubmitted) {
        onReportSubmitted()
      }
    } catch (error: any) {
      console.error('Error submitting report:', error)
      setErrorMessage(error.message || 'Please try again later.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!submitting) {
      setSelectedReason('')
      setDetails('')
      onClose()
    }
  }

  if (!internalIsOpen && !showSuccessModal) return null

  return (
    <>
      {/* Report Form Modal */}
      {internalIsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Report {reportType === 'task' ? 'Task' : 'User'}
              </h2>
              <button
                onClick={handleClose}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Close"
                disabled={submitting}
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errorMessage}</p>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="space-y-4">
              {targetName && (
                <p className="text-sm text-gray-600">
                  Reporting: <span className="font-medium">{targetName}</span>
                </p>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for reporting <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {REPORT_REASONS[reportType].map((reason) => (
                    <label
                      key={reason}
                      className="flex items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={reason}
                        checked={selectedReason === reason}
                        onChange={(e) => setSelectedReason(e.target.value)}
                        className="mr-3"
                        disabled={submitting}
                      />
                      <span className="text-sm text-gray-700">{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional details (optional)
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Please provide any additional information that might help us review this report..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={4}
                  disabled={submitting}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleClose}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!selectedReason || submitting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      <StandardModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false)
          // Now close the report modal and clean up parent state
          onClose()
          setInternalIsOpen(false)
          if (onReportSubmitted) {
            onReportSubmitted()
          }
        }}
        type="success"
        title="Report Submitted"
        message="Thank you for your report. We will review it and take appropriate action if necessary."
      />
    </>
  )
}

