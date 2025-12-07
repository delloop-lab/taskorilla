import { Suspense } from 'react'
import FormTypeSelector from '../FormTypeSelector'

export default function TrialPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create a New Task</h1>
          <p className="text-gray-600">
            Choose between the traditional form or the new SurveyJS form builder.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="bg-white shadow-md rounded-lg p-6">
              <div className="text-center text-gray-600">Loading form...</div>
            </div>
          }
        >
          <FormTypeSelector />
        </Suspense>
      </div>
    </div>
  )
}

