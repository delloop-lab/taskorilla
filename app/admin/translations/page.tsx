'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import StandardModal from '@/components/StandardModal'

type TranslationPair = {
  key: string
  en: string
  pt: string
}

export default function TranslationsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pairs, setPairs] = useState<TranslationPair[]>([])
  const [filteredPairs, setFilteredPairs] = useState<TranslationPair[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    type: 'success' | 'error' | 'warning' | 'info'
    title: string
    message: string
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  })

  useEffect(() => {
    checkRole()
  }, [])

  useEffect(() => {
    if (searchTerm) {
      const filtered = pairs.filter(pair =>
        pair.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pair.en.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pair.pt.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredPairs(filtered)
    } else {
      setFilteredPairs(pairs)
    }
  }, [searchTerm, pairs])

  const checkRole = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'superadmin') {
      router.push('/')
      return
    }

    loadTranslations()
  }

  const loadTranslations = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch('/api/admin/translations', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load translations')
      }

      const data = await response.json()
      setPairs(data.pairs)
      setFilteredPairs(data.pairs)
      
      // Expand all sections by default
      const sections: Set<string> = new Set(data.pairs.map((p: TranslationPair) => p.key.split('.')[0]))
      setExpandedSections(sections)
    } catch (error: any) {
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to load translations'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = (index: number, field: 'en' | 'pt', value: string) => {
    const updated = [...pairs]
    updated[index] = { ...updated[index], [field]: value }
    setPairs(updated)
    
    // Update filtered pairs too
    const filteredIndex = filteredPairs.findIndex(p => p.key === updated[index].key)
    if (filteredIndex !== -1) {
      const updatedFiltered = [...filteredPairs]
      updatedFiltered[filteredIndex] = updated[index]
      setFilteredPairs(updatedFiltered)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch('/api/admin/translations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ pairs })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save translations')
      }

      setModalState({
        isOpen: true,
        type: 'success',
        title: 'Success',
        message: 'Translations saved successfully!'
      })
    } catch (error: any) {
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to save translations'
      })
    } finally {
      setSaving(false)
    }
  }

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  // Group pairs by section (first part of key)
  const groupedPairs = filteredPairs.reduce((acc, pair) => {
    const section = pair.key.split('.')[0]
    if (!acc[section]) {
      acc[section] = []
    }
    acc[section].push(pair)
    return acc
  }, {} as Record<string, TranslationPair[]>)

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Loading translations...</div>
      </div>
    )
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Translation Management</h1>
          <p className="text-gray-600">Manage English and Portuguese translation pairs</p>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search translations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary-600 text-white px-6 py-2 rounded-md font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                    Key
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                    English
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                    Portuguese
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(groupedPairs).map(([section, sectionPairs]) => (
                  <React.Fragment key={section}>
                    <tr className="bg-gray-100">
                      <td colSpan={3} className="px-6 py-3">
                        <button
                          onClick={() => toggleSection(section)}
                          className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900"
                        >
                          <span>{expandedSections.has(section) ? '▼' : '▶'}</span>
                          <span>{section}</span>
                          <span className="text-gray-500 text-xs">({sectionPairs.length} keys)</span>
                        </button>
                      </td>
                    </tr>
                    {expandedSections.has(section) && sectionPairs.map((pair, idx) => {
                      const originalIndex = pairs.findIndex(p => p.key === pair.key)
                      return (
                        <tr key={pair.key} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                            {pair.key}
                          </td>
                          <td className="px-6 py-4">
                            <textarea
                              value={pair.en}
                              onChange={(e) => handleUpdate(originalIndex, 'en', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                              rows={pair.en.length > 50 ? 3 : 1}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <textarea
                              value={pair.pt}
                              onChange={(e) => handleUpdate(originalIndex, 'pt', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                              rows={pair.pt.length > 50 ? 3 : 1}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredPairs.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {searchTerm ? 'No translations found matching your search' : 'No translations found'}
          </div>
        )}
      </div>

      <StandardModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
      />
    </>
  )
}

