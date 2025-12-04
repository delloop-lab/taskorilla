import { Suspense } from 'react'
import NewTaskClient from './NewTaskClient'

export default function NewTaskPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Create a New Task</h1>
      
      <Suspense
        fallback={
          <div className="bg-white shadow-md rounded-lg p-6">
            <div className="text-center text-gray-600">Loading form...</div>
          </div>
        }
      >
        <NewTaskClient />
      </Suspense>
    </div>
  )
}
