import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { PostingPost } from './postingManagerTypes'

const TABLE = 'posting_posts'

export function usePostingPosts() {
  const [posts, setPosts] = useState<PostingPost[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('date_posted', { ascending: false })

    if (error) {
      console.error('Error loading posting posts', error)
      setError(error.message)
    } else {
      setPosts((data || []) as PostingPost[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const addPost = useCallback(
    async (
      payload: Omit<PostingPost, 'id' | 'created_at'> & {
        id?: string
      }
    ) => {
      const insertPayload: any = { ...payload }
      if (!insertPayload.date_posted) {
        insertPayload.date_posted = new Date().toISOString()
      }
       if (typeof insertPayload.pending_approval === 'undefined') {
        insertPayload.pending_approval = false
      }

      const { data, error } = await supabase
        .from(TABLE)
        .insert(insertPayload)
        .select('*')
        .single()

      if (error) throw error
      setPosts((prev) => [data as PostingPost, ...prev])
      return data as PostingPost
    },
    []
  )

  const deletePost = useCallback(async (id: string) => {
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) throw error
    setPosts((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const updatePost = useCallback(
    async (id: string, updates: Partial<Omit<PostingPost, 'id'>>) => {
      const { data, error } = await supabase
        .from(TABLE)
        .update(updates as any)
        .eq('id', id)
        .select('*')
        .single()

      if (error) throw error
      setPosts((prev) => prev.map((p) => (p.id === id ? (data as PostingPost) : p)))
      return data as PostingPost
    },
    []
  )

  return {
    posts,
    loading,
    error,
    refresh: fetchPosts,
    addPost,
    deletePost,
    updatePost,
  }
}

