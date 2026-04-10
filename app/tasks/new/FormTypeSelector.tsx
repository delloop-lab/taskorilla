'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import NewTaskClient from './NewTaskClient'
import SurveyJSTrialForm from '@/components/SurveyJSTrialForm'
import { useLanguage } from '@/lib/i18n'

const FORM_TYPE_STORAGE_KEY = 'newTaskFormType'

export default function FormTypeSelector() {
  const searchParams = useSearchParams()
  const hasRequestedHelper = Boolean(searchParams?.get('helperId'))

  const [formType, setFormType] = useState<'quick' | 'full'>(() => {
    if (typeof window === 'undefined') return 'quick'
    // URL param overrides stored preference (used by service card prefill links)
    const urlParam = searchParams?.get('formType')
    if (urlParam === 'quick' || urlParam === 'full') return urlParam
    const stored = localStorage.getItem(FORM_TYPE_STORAGE_KEY)
    if (stored === 'quick' || stored === 'full') return stored
    return 'quick'
  })
  const { t } = useLanguage()

  // When requesting a specific helper, always use the Full form: it skips "Helper vs Professional"
  // and handles assigned_to + optional budget. The Quick form does not support helperId.
  if (hasRequestedHelper) {
    return (
      <div className="w-full">
        <div className="h-[10px] bg-gray-100 mb-0" />
        <NewTaskClient />
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Background color above Form Type box */}
      <div className="h-[10px] bg-gray-100 mb-0"></div>

      {/* Form Type Selector - Card UI */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-4">
          <p className="text-base font-semibold text-gray-900">How do you want to start?</p>
          <p className="mt-1 text-xs text-gray-500">You can switch anytime</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setFormType('quick')}
            className={`group w-full rounded-xl border p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
              formType === 'quick'
                ? 'border-primary-500 bg-primary-50/60'
                : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-gray-900">Quick</h3>
              <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[11px] font-semibold text-primary-700">
                Recommended
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Just the essentials. Done in under a minute.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setFormType('full')}
            className={`group w-full rounded-xl border p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
              formType === 'full'
                ? 'border-primary-500 bg-primary-50/60'
                : 'border-gray-200 bg-white'
            }`}
          >
            <h3 className="text-base font-semibold text-gray-900">Full</h3>
            <p className="mt-2 text-sm text-gray-600">
              Add more detail for better matches.
            </p>
          </button>
        </div>
      </div>

      {/* Render Selected Form */}
      {formType === 'quick' ? (
        <SurveyJSTrialForm />
      ) : (
        <NewTaskClient />
      )}

      {/* Quick task browsing callout */}
      <div className="mt-6 rounded-xl border border-primary-200 bg-gradient-to-r from-white via-primary-50/40 to-orange-50/40 p-4 shadow-sm">
        <p className="text-sm font-semibold text-gray-900">Want a faster way?</p>
        <p className="mt-1 text-sm text-gray-600">
          Skip the form and choose a task in seconds.
        </p>
        <Link
          href="/#service-cards-grid"
          className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          👉 Browse common tasks
        </Link>
      </div>
    </div>
  )
}

