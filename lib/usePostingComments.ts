import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { PostingComment } from './postingManagerTypes'

const TABLE = 'posting_comments'

export function usePostingComments() {
  const [comments, setComments] = useState<PostingComment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchComments = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('date_commented', { ascending: false })

    if (error) {
      console.error('Error loading posting comments', error)
      setError(error.message)
    } else {
      setComments((data || []) as PostingComment[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  const addComment = useCallback(
    async (payload: Omit<PostingComment, 'id' | 'created_at'>) => {
      const insertPayload: any = { ...payload }
      if (!insertPayload.date_commented) {
        insertPayload.date_commented = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from(TABLE)
        .insert(insertPayload)
        .select('*')
        .single()

      if (error) throw error
      setComments((prev) => [data as PostingComment, ...prev])
      return data as PostingComment
    },
    []
  )

  return {
    comments,
    loading,
    error,
    refresh: fetchComments,
    addComment,
  }
}

