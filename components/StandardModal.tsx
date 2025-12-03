'use client'

import React from 'react'

export type ModalType = 'success' | 'error' | 'warning' | 'info' | 'confirm'

interface StandardModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm?: () => void
  type: ModalType
  title: string
  message: string
  confirmText?: string
  cancelText?: string
}

export default function StandardModal({
  isOpen,
  onClose,
  onConfirm,
  type,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
}: StandardModalProps) {
  if (!isOpen) return null

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        )
      case 'error':
        return (
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        )
      case 'warning':
      case 'confirm':
        return (
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
            <svg
              className="h-6 w-6 text-yellow-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        )
      case 'info':
        return (
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
            <svg
              className="h-6 w-6 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        )
    }
  }

  const getButtonColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-600 hover:bg-green-700'
      case 'error':
        return 'bg-red-600 hover:bg-red-700'
      case 'warning':
      case 'confirm':
        return 'bg-yellow-600 hover:bg-yellow-700'
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700'
      default:
        return 'bg-primary-600 hover:bg-primary-700'
    }
  }

  const isConfirmType = type === 'confirm' || (onConfirm !== undefined && type !== 'success' && type !== 'error' && type !== 'info')

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        {getIcon()}

        <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
          {title}
        </h3>

        <p className="text-sm text-gray-600 text-center mb-6 whitespace-pre-line">
          {message}
        </p>

        <div className={`flex gap-3 ${isConfirmType ? 'justify-center' : 'justify-center'}`}>
          {isConfirmType && (
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={() => {
              if (isConfirmType && onConfirm) {
                onConfirm()
              }
              onClose()
            }}
            className={`px-6 py-2 ${getButtonColor()} text-white rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
              type === 'success' || type === 'error' || type === 'info'
                ? 'focus:ring-primary-500'
                : 'focus:ring-yellow-500'
            }`}
          >
            {isConfirmType ? confirmText : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}




