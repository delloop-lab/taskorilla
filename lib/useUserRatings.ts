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

/**
 * Hook to fetch all users with their ratings summary from SQL function
 * Uses: SELECT * FROM get_user_ratings_summary();
 */
export function useUserRatings() {
  const [users, setUsers] = useState<UserRatingsSummary[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRatings = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data, error: fetchError } = await supabase
          .rpc('get_user_ratings_summary')

        if (fetchError) {
          throw fetchError
        }

        console.log('📊 Fetched user ratings:', data?.length || 0, 'users')
        if (data && data.length > 0) {
          console.log('📊 Sample ratings:', data.slice(0, 3))
          console.log('📊 First rating keys:', Object.keys(data[0]))
          console.log('📊 First rating full object:', JSON.stringify(data[0], null, 2))
        }
        setUsers(data || [])
      } catch (err: any) {
        setError(err.message || 'Failed to fetch user ratings')
        console.error('Error fetching user ratings:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchRatings()
  }, [])

  return { users, loading, error }
}

/**
 * Get ratings for a specific user by ID
 */
export function getUserRatingsById(
  userId: string,
  ratingsMap: Map<string, UserRatingsSummary>
): UserRatingsSummary | null {
  const rating = ratingsMap.get(userId)
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
    .map(id => ratingsMap.get(id))
    .filter((rating): rating is UserRatingsSummary => rating !== undefined)
}


