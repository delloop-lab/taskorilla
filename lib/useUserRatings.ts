'use client'

import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export interface UserRatingsSummary {
  reviewee_id: string  // SQL function returns reviewee_id, not id
  tasker_avg_rating: number | null
  tasker_review_count: number
  helper_avg_rating: number | null
  helper_review_count: number
}

/** Normalize one row from RPC (Postgres may return NUMERIC/INT as strings) */
function normalizeRow(r: any): UserRatingsSummary {
  return {
    reviewee_id: r?.reviewee_id != null ? String(r.reviewee_id) : '',
    tasker_avg_rating: r?.tasker_avg_rating != null ? Number(r.tasker_avg_rating) : null,
    tasker_review_count: Number(r?.tasker_review_count) || 0,
    helper_avg_rating: r?.helper_avg_rating != null ? Number(r.helper_avg_rating) : null,
    helper_review_count: Number(r?.helper_review_count) || 0
  }
}

/**
 * Fallback: build ratings summary from reviews + tasks when RPC is missing or returns empty
 */
async function fetchRatingsFallback(): Promise<UserRatingsSummary[]> {
  const { data: reviewsData } = await supabase
    .from('reviews')
    .select('task_id, reviewee_id, rating')
  const reviews = reviewsData || []
  if (reviews.length === 0) return []

  const taskIds = [...new Set(reviews.map((r: any) => r.task_id).filter(Boolean))]
  const { data: tasksData } = await supabase
    .from('tasks')
    .select('id, created_by, assigned_to')
    .in('id', taskIds)
  const tasks = (tasksData || []) as { id: string; created_by: string; assigned_to: string | null }[]
  const taskMap = new Map(tasks.map(t => [t.id, t]))

  const byReviewee: Record<string, { tasker: number[]; helper: number[] }> = {}
  reviews.forEach((r: any) => {
    const revId = r.reviewee_id ? String(r.reviewee_id) : ''
    if (!revId) return
    if (!byReviewee[revId]) byReviewee[revId] = { tasker: [], helper: [] }
    const task = taskMap.get(r.task_id)
    const rating = Number(r.rating)
    if (isNaN(rating)) return
    if (task?.created_by === revId) byReviewee[revId].tasker.push(rating)
    if (task?.assigned_to === revId) byReviewee[revId].helper.push(rating)
  })

  return Object.entries(byReviewee).map(([reviewee_id, { tasker, helper }]) => ({
    reviewee_id,
    tasker_avg_rating: tasker.length ? tasker.reduce((a, b) => a + b, 0) / tasker.length : null,
    tasker_review_count: tasker.length,
    helper_avg_rating: helper.length ? helper.reduce((a, b) => a + b, 0) / helper.length : null,
    helper_review_count: helper.length
  }))
}

/**
 * Hook to fetch all users with their ratings summary from SQL function
 * Uses: SELECT * FROM get_user_ratings_summary();
 * Falls back to reviews + tasks if RPC fails or returns empty.
 */
export function useUserRatings() {
  const [users, setUsers] = useState<UserRatingsSummary[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const fetchRatings = async () => {
        try {
          setLoading(true)
          setError(null)

          const { data, error: fetchError } = await supabase.rpc('get_user_ratings_summary')

          let rows: UserRatingsSummary[] = []
          if (!fetchError && Array.isArray(data) && data.length > 0) {
            rows = data.map(normalizeRow).filter(r => r.reviewee_id)
          }
          if (rows.length === 0) {
            if (fetchError && process.env.NODE_ENV === 'development') {
              console.warn('📊 get_user_ratings_summary failed or empty, using fallback:', fetchError.message)
            }
            rows = await fetchRatingsFallback()
          }

          if (process.env.NODE_ENV === 'development' && rows.length > 0) {
            console.log('📊 Fetched user ratings:', rows.length, 'users')
          }
          setUsers(rows)
        } catch (err: any) {
          setError(err.message || 'Failed to fetch user ratings')
          console.error('Error fetching user ratings:', err)
          try {
            const fallback = await fetchRatingsFallback()
            if (fallback.length > 0) setUsers(fallback)
          } catch (_) {}
        } finally {
          setLoading(false)
        }
      }

      fetchRatings()
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [])

  return { users, loading, error }
}

/**
 * Get ratings for a specific user by ID (keys normalized to string for reliable lookup)
 */
export function getUserRatingsById(
  userId: string,
  ratingsMap: Map<string, UserRatingsSummary>
): UserRatingsSummary | null {
  if (userId == null) return null
  const key = String(userId)
  const rating = ratingsMap.get(key)
  return rating || null
}

/**
 * Get ratings for multiple users by IDs
 */
export function getMultipleUserRatings(
  userIds: string[],
  ratingsMap: Map<string, UserRatingsSummary>
): UserRatingsSummary[] {
  return userIds
    .map(id => ratingsMap.get(String(id)))
    .filter((rating): rating is UserRatingsSummary => rating !== undefined)
}















