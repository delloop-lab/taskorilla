'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function UpdateLocationsPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleUpdate = async () => {
    if (!confirm('This will update all tasks with municipality and district. This may take several minutes. Continue?')) {
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('You must be logged in')
      }

      const response = await fetch('/api/update-tasks-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update locations')
      }

      const data = await response.json()
      setResult(data)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      console.error('Update error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Update Task Locations</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <p className="text-gray-700 mb-4">
          This tool will update all existing tasks to include municipality and district 
          in their location field. For example: "Lagos, Faro, 8600-545, Portugal"
        </p>
        <p className="text-gray-600 mb-4 text-sm">
          The update uses reverse geocoding to get municipality and district from coordinates.
          This process respects rate limits and may take several minutes for many tasks.
        </p>
        
        <button
          onClick={handleUpdate}
          disabled={loading}
          className={`px-6 py-3 rounded-lg font-semibold ${
            loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-primary-600 hover:bg-primary-700 text-white'
          }`}
        >
          {loading ? 'Updating...' : 'Update All Task Locations'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="text-red-800 font-semibold mb-2">Error</h3>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-green-800 font-semibold mb-2">Update Complete</h3>
          <div className="text-green-700 space-y-1">
            <p><strong>Total tasks:</strong> {result.total}</p>
            <p><strong>Updated:</strong> {result.updated}</p>
            <p><strong>Failed:</strong> {result.failed}</p>
          </div>
          
          {result.errors && result.errors.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Errors:</h4>
              <ul className="list-disc list-inside text-sm space-y-1">
                {result.errors.map((err: string, idx: number) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

