'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Review } from '@/lib/types'
import Link from 'next/link'

export default function ReviewPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = params.id as string

  const [task, setTask] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [taskId])

  const loadData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/login')
        return
      }
      setUser(authUser)

      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('*, created_by, assigned_to')
        .eq('id', taskId)
        .single()

      if (taskError) throw taskError

      if (!taskData) {
        setError('Task not found')
        return
      }

      // Determine who to review
      const revieweeId = taskData.created_by === authUser.id 
        ? taskData.assigned_to 
        : taskData.created_by

      if (!revieweeId) {
        setError('No one to review for this task')
        return
      }

      // Check if review already exists
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('*')
        .eq('task_id', taskId)
        .eq('reviewer_id', authUser.id)
        .single()

      if (existingReview) {
        setError('You have already reviewed this task')
        return
      }

      setTask({ ...taskData, revieweeId })
    } catch (error: any) {
      console.error('Error loading data:', error)
      setError(error.message || 'Error loading task')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !task) return

    setSubmitting(true)
    setError(null)

    try {
      const { error: reviewError } = await supabase
        .from('reviews')
        .insert({
          task_id: taskId,
          reviewer_id: user.id,
          reviewee_id: task.revieweeId,
          rating,
          comment: comment.trim() || null,
        })

      if (reviewError) throw reviewError

      router.push(`/tasks/${taskId}`)
    } catch (error: any) {
      setError(error.message || 'Error submitting review')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (error && !task) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <Link href="/tasks" className="text-primary-600 hover:text-primary-700">
          ← Back to tasks
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href={`/tasks/${taskId}`}
        className="text-primary-600 hover:text-primary-700 mb-4 inline-block"
      >
        ← Back to task
      </Link>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Leave a Review</h1>
        <p className="text-gray-600 mb-6">
          How was your experience with this task?
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rating *
            </label>
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`text-4xl focus:outline-none ${
                    star <= rating
                      ? 'text-yellow-400'
                      : 'text-gray-300'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {rating === 5 && 'Excellent'}
              {rating === 4 && 'Good'}
              {rating === 3 && 'Average'}
              {rating === 2 && 'Poor'}
              {rating === 1 && 'Very Poor'}
            </p>
          </div>

          <div>
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
              Comment (Optional)
            </label>
            <textarea
              id="comment"
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="Share your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-4">
            <Link
              href={`/tasks/${taskId}`}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}





