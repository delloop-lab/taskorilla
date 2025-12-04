'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@/lib/types'
import Link from 'next/link'
import FeaturedHelpers from '@/components/FeaturedHelpers'
import { helperMatchesSearch } from '@/lib/helper-constants'
import { STANDARD_PROFESSIONS, helperMatchesProfession } from '@/lib/profession-constants'
import { PROFESSION_CATEGORIES } from '@/lib/profession-categories'

export default function ProfessionalsPage() {
  const router = useRouter()
  const [helpers, setHelpers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProfession, setSelectedProfession] = useState<string | null>(null)
  const [availableProfessions, setAvailableProfessions] = useState<string[]>([])

  useEffect(() => {
    loadProfessionals()
  }, [])

  const loadProfessionals = async () => {
    try {
      setLoading(true)
      
      // Load all helpers, then filter for professionals in JavaScript
      // (Supabase doesn't easily support filtering array columns for non-null)
      const { data: helpersData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_helper', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading professionals:', error)
        throw error
      }

      if (helpersData) {
        // Filter to only include helpers with at least one profession
        const professionals = helpersData.filter(helper => 
          helper.professions && Array.isArray(helper.professions) && helper.professions.length > 0
        )
        
        setHelpers(professionals)
        
        // Collect available professions for dropdown
        const allProfessions = new Set<string>()
        
        // Add standard professions
        STANDARD_PROFESSIONS.forEach(profession => allProfessions.add(profession))
        
        // Add professions from professionals
        professionals.forEach((helper: any) => {
          if (helper.professions && Array.isArray(helper.professions)) {
            helper.professions.forEach((profession: string) => allProfessions.add(profession))
          }
        })
        
        setAvailableProfessions(Array.from(allProfessions).sort())
      } else {
        // No helpers data returned
        setHelpers([])
      }
    } catch (err: any) {
      console.error('Error loading professionals:', err)
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint
      })
      // Set empty array on error to prevent infinite loading
      setHelpers([])
    } finally {
      setLoading(false)
    }
  }

  const filteredHelpers = helpers.filter(helper => {
    // If search term is provided, use comprehensive search
    const matchesSearch = !searchTerm || helperMatchesSearch(helper, searchTerm)
    
    // Check if helper has the selected profession (exact match or case-insensitive)
    const matchesProfession = !selectedProfession || 
      helper.professions?.includes(selectedProfession) ||
      helper.professions?.some((profession: string) => profession.toLowerCase() === selectedProfession.toLowerCase()) ||
      // Also check if selected profession matches any standard profession that helper has
      (STANDARD_PROFESSIONS.includes(selectedProfession) && helper.professions?.some((profession: string) => {
        // Check if helper's profession matches the selected standard profession (fuzzy match)
        const lowerHelperProfession = profession.toLowerCase()
        const lowerSelectedProfession = selectedProfession.toLowerCase()
        return lowerHelperProfession === lowerSelectedProfession ||
               lowerHelperProfession.includes(lowerSelectedProfession) ||
               lowerSelectedProfession.includes(lowerHelperProfession)
      }))
    
    return matchesSearch && matchesProfession
  })

  // Group professionals by profession category
  const groupProfessionalsByCategory = () => {
    const grouped: { [key: string]: User[] } = {}
    
    filteredHelpers.forEach(helper => {
      if (!helper.professions || helper.professions.length === 0) return
      
      // Find which categories this helper belongs to based on their professions
      PROFESSION_CATEGORIES.forEach(category => {
        const hasProfessionInCategory = helper.professions?.some(profession =>
          category.subs.some(sub => 
            sub.toLowerCase() === profession.toLowerCase() ||
            profession.toLowerCase().includes(sub.toLowerCase()) ||
            sub.toLowerCase().includes(profession.toLowerCase())
          )
        )
        
        if (hasProfessionInCategory) {
          if (!grouped[category.name]) {
            grouped[category.name] = []
          }
          // Only add if not already in this category's list
          if (!grouped[category.name].find(h => h.id === helper.id)) {
            grouped[category.name].push(helper)
          }
        }
      })
    })
    
    return grouped
  }

  const groupedProfessionals = groupProfessionalsByCategory()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading professionals...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Featured Helpers Section - shown when searching with text input */}
        {searchTerm && !selectedProfession && (
          <FeaturedHelpers searchTerm={searchTerm} selectedSkill={null} maxResults={6} />
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Professionals</h1>
          <p className="text-gray-600">
            Find qualified professionals ready to help with specialized services
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="space-y-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Professionals
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, profession, offerings, or qualifications..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Profession Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Profession
              </label>
              <select
                value={selectedProfession || ''}
                onChange={(e) => {
                  setSelectedProfession(e.target.value || null)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
              >
                <option value="">All Professions</option>
                {availableProfessions.length > 0 ? (
                  availableProfessions.map(profession => (
                    <option key={profession} value={profession}>{profession}</option>
                  ))
                ) : (
                  STANDARD_PROFESSIONS.map(profession => (
                    <option key={profession} value={profession}>{profession}</option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-gray-600">
            Found <span className="font-semibold text-gray-900">{filteredHelpers.length}</span> professional{filteredHelpers.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Professionals Grouped by Category */}
        {filteredHelpers.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 text-lg">No professionals found matching your criteria.</p>
            <button
              onClick={() => {
                setSearchTerm('')
                setSelectedProfession(null)
              }}
              className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {PROFESSION_CATEGORIES.map(category => {
              const categoryHelpers = groupedProfessionals[category.name] || []
              if (categoryHelpers.length === 0) return null
              
              return (
                <div key={category.name} className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-3 border-b border-gray-200">
                    {category.name}
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {categoryHelpers.map((helper) => (
                      <Link
                        key={helper.id}
                        href={`/helper/${helper.profile_slug || helper.id}`}
                        className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-gray-200"
                      >
                        {/* Avatar */}
                        <div className="h-20 w-20 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 mb-3">
                          {helper.avatar_url ? (
                            <img
                              src={helper.avatar_url}
                              alt={helper.full_name || 'Professional'}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-2xl font-semibold text-gray-500">
                              {(helper.full_name?.[0] || helper.email?.[0] || '?').toUpperCase()}
                            </div>
                          )}
                        </div>
                        {/* Name */}
                        <h3 className="font-semibold text-gray-900 text-center text-sm">
                          {helper.full_name || 'Professional'}
                        </h3>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

