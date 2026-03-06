import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { PostingTemplate } from './postingManagerTypes'

const TABLE = 'posting_templates'

export function usePostingTemplates() {
  const [templates, setTemplates] = useState<PostingTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error loading posting templates', error)
      setError(error.message)
    } else {
      setTemplates((data || []) as PostingTemplate[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const addTemplate = useCallback(
    async (
      payload: Omit<PostingTemplate, 'id' | 'created_at'> & {
        id?: string
      }
    ) => {
      const { data, error } = await supabase
        .from(TABLE)
        .insert(payload as any)
        .select('*')
        .single()

      if (error) throw error
      setTemplates((prev) => [...prev, data as PostingTemplate])
      return data as PostingTemplate
    },
    []
  )

  const updateTemplate = useCallback(
    async (id: string, updates: Partial<Omit<PostingTemplate, 'id' | 'created_at'>>) => {
      const { data, error } = await supabase
        .from(TABLE)
        .update(updates as any)
        .eq('id', id)
        .select('*')
        .single()

      if (error) throw error
      setTemplates((prev) => prev.map((t) => (t.id === id ? (data as PostingTemplate) : t)))
      return data as PostingTemplate
    },
    []
  )

  const deleteTemplate = useCallback(async (id: string) => {
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) throw error
    setTemplates((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return {
    templates,
    loading,
    error,
    refresh: fetchTemplates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
  }
}

