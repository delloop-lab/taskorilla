import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { PostingGroup } from './postingManagerTypes'

const TABLE = 'posting_groups'

export function usePostingGroups() {
  const [groups, setGroups] = useState<PostingGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchGroups = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading posting groups', error)
      setError(error.message)
    } else {
      setGroups((data || []) as PostingGroup[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  const addGroup = useCallback(
    async (payload: Omit<PostingGroup, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from(TABLE)
        .insert(payload as any)
        .select('*')
        .single()

      if (error) throw error
      setGroups((prev) => [data as PostingGroup, ...prev])
      return data as PostingGroup
    },
    []
  )

  const updateGroup = useCallback(
    async (id: string, updates: Partial<Omit<PostingGroup, 'id' | 'created_at'>>) => {
      const { data, error } = await supabase
        .from(TABLE)
        .update(updates as any)
        .eq('id', id)
        .select('*')
        .single()

      if (error) throw error
      setGroups((prev) => prev.map((g) => (g.id === id ? (data as PostingGroup) : g)))
      return data as PostingGroup
    },
    []
  )

  const deleteGroup = useCallback(async (id: string) => {
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) throw error
    setGroups((prev) => prev.filter((g) => g.id !== id))
  }, [])

  return {
    groups,
    loading,
    error,
    refresh: fetchGroups,
    addGroup,
    updateGroup,
    deleteGroup,
  }
}

