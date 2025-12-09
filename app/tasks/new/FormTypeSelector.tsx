'use client'

import { useState } from 'react'
import NewTaskClient from './NewTaskClient'
import SurveyJSTrialForm from '@/components/SurveyJSTrialForm'

export default function FormTypeSelector() {
  const [formType, setFormType] = useState<'quick' | 'full'>('quick')
  
  return (
    <div className="w-full">
      {/* Background color above Form Type box */}
      <div className="h-[10px] bg-gray-100 mb-0"></div>
      
      {/* Form Type Selector */}
      <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-center gap-4">
          <label className="text-sm font-medium text-gray-700 text-center md:text-left">
            How would you like to fill out the form?
          </label>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Quick Button */}
            <button
              type="button"
              onClick={() => setFormType('quick')}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                formType === 'quick'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>Quick</span>
              <div className="relative group">
                <svg
                  className={`w-4 h-4 ${
                    formType === 'quick' ? 'text-white' : 'text-gray-500'
                  }`}
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
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  Fast and simple, just the essentials.
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              </div>
            </button>

            {/* Full Button */}
            <button
              type="button"
              onClick={() => setFormType('full')}
              style={formType === 'full' ? { backgroundColor: '#F99723' } : {}}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                formType === 'full'
                  ? 'text-white hover:opacity-90'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>Full</span>
              <div className="relative group">
                <svg
                  className={`w-4 h-4 ${
                    formType === 'full' ? 'text-white' : 'text-gray-500'
                  }`}
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
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  Detailed version with all fields and tags
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Render Selected Form */}
      {formType === 'quick' ? (
        <SurveyJSTrialForm />
      ) : (
        <NewTaskClient />
      )}
    </div>
  )
}

