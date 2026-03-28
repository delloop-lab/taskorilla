'use client'

import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '@/lib/i18n'

interface HowBidsWorkModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function HowBidsWorkModal({ isOpen, onClose }: HowBidsWorkModalProps) {
  const { t } = useLanguage()
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return

    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="how-bids-title"
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[85vh] overflow-y-auto relative z-[100000] mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white rounded-t-lg border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <h2 id="how-bids-title" className="text-lg font-semibold text-gray-900">
            {t('bidding.howBidsWorkTitle')}
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 -mr-1"
            aria-label={t('common.close')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold shrink-0">1</span>
              <h3 className="font-semibold text-gray-900 text-sm">{t('bidding.step1Title')}</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed ml-8">
              {t('bidding.step1Body')}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold shrink-0">2</span>
              <h3 className="font-semibold text-gray-900 text-sm">{t('bidding.step2Title')}</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed ml-8">
              {t('bidding.step2Intro')}
            </p>
            <ul className="mt-1.5 ml-8 space-y-1">
              <li className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-primary-500 mt-0.5 shrink-0">&#10003;</span>
                {t('bidding.step2Li1')}
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-primary-500 mt-0.5 shrink-0">&#10003;</span>
                {t('bidding.step2Li2')}
              </li>
            </ul>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold shrink-0">3</span>
              <h3 className="font-semibold text-gray-900 text-sm">{t('bidding.step3Title')}</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed ml-8">
              {t('bidding.step3Body')}
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2.5">
            <p className="text-sm text-amber-800 leading-relaxed">
              <span className="font-semibold">{t('bidding.tipLabel')}</span> {t('bidding.tipBody')}
            </p>
          </div>
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full bg-primary-600 text-white px-4 py-2.5 rounded-md text-sm font-medium hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            {t('bidding.gotIt')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
