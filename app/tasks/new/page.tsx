import { Suspense } from 'react'
import FormTypeSelector from './FormTypeSelector'

function NewTaskPageLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-0 pb-8">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-40 bg-gray-200 rounded" />
        <div className="h-10 bg-gray-200 rounded" />
      </div>
    </div>
  )
}

export default function NewTaskPage() {
  return (
    <Suspense fallback={<NewTaskPageLoading />}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-0 pb-8">
        <FormTypeSelector />
      </div>
    </Suspense>
  )
}
