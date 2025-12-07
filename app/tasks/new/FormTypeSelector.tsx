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
          <label className="text-sm font-medium text-gray-700 text-center md:text-left">Form Type:</label>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <label className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
              <input
                type="radio"
                name="formType"
                value="quick"
                checked={formType === 'quick'}
                onChange={(e) => setFormType(e.target.value as 'quick' | 'full')}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 focus:ring-2 mt-0.5"
              />
              <span className="text-sm text-gray-700">
                <span className="font-semibold">Quick Form</span>
                <span className="text-gray-500 ml-1 block sm:inline">a fast step by step flow</span>
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
              <input
                type="radio"
                name="formType"
                value="full"
                checked={formType === 'full'}
                onChange={(e) => setFormType(e.target.value as 'quick' | 'full')}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 focus:ring-2 mt-0.5"
              />
              <span className="text-sm text-gray-700">
                <span className="font-semibold">Full Form</span>
                <span className="text-gray-500 ml-1 block sm:inline">a detailed version with tags etc.</span>
              </span>
            </label>
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

