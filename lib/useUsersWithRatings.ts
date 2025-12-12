'use client'

import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export interface UserWithRatings {
  id: string
  name: string
  tasker_avg_rating: number | null
  tasker_review_count: number
  helper_avg_rating: number | null
  helper_review_count: number
}

export function useUsersWithRatings() {
  const [users, setUsers] = useState<UserWithRatings[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data, error: fetchError } = await supabase
          .from('user_ratings_summary')
          .select('*')
          .order('name', { ascending: true })

        if (fetchError) {
          throw fetchError
        }

        setUsers(data || [])
      } catch (err: any) {
        setError(err.message || 'Failed to fetch users with ratings')
        console.error('Error fetching users with ratings:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  return { users, loading, error }
}


