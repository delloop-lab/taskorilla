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
import { User as UserIcon } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'
import { useUserRatings, getUserRatingsById } from '@/lib/useUserRatings'
import CompactUserRatingsDisplay from '@/components/CompactUserRatingsDisplay'

export default function ProfessionalsPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [helpers, setHelpers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProfession, setSelectedProfession] = useState<string | null>(null)
  const [availableProfessions, setAvailableProfessions] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const { users: userRatings } = useUserRatings()

  useEffect(() => {
    loadProfessionals()
  }, [userRatings])

  // Auto-show filters if search term or profession is selected
  useEffect(() => {
    if (searchTerm || selectedProfession) {
      setShowFilters(true)
    }
  }, [searchTerm, selectedProfession])

  const loadProfessionals = async () => {
    try {
      setLoading(true)
      
      // Load all helpers, then filter for professionals in JavaScript
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

        // Attach ratings from SQL function so we can show stars
        const ratingsMap = new Map(userRatings.map((r: any) => [r.reviewee_id, r]))
        const professionalsWithRatings = professionals.map((helper: any) => {
          const userRating = getUserRatingsById(helper.id, ratingsMap)
          return {
            ...helper,
            userRatings: userRating || null,
          }
        })

        setHelpers(professionalsWithRatings as User[])
        
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
          <p className="mt-4 text-gray-600">{t('professionals.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/helpers"
          className="inline-block text-primary-600 hover:text-primary-700 font-medium mb-6"
        >
          {t('professionals.backToBrowseHelpers')}
        </Link>
        {/* Featured Helpers Section - shown when searching with text input */}
        {searchTerm && !selectedProfession && (
          <FeaturedHelpers searchTerm={searchTerm} selectedSkill={null} maxResults={6} />
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('professionals.title')}</h1>
              <p className="text-gray-600">
                {t('professionals.subtitle')}
              </p>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              {showFilters ? t('professionals.hideFilters') : t('professionals.showFilters')}
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="space-y-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('professionals.searchProfessionals')}
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('professionals.searchPlaceholder')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Profession Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('professionals.filterByProfession')}
                </label>
                <select
                  value={selectedProfession || ''}
                  onChange={(e) => {
                    setSelectedProfession(e.target.value || null)
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                >
                  <option value="">{t('professionals.allProfessions')}</option>
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
        )}

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-gray-600">
            {t('professionals.found')} <span className="font-semibold text-gray-900">{filteredHelpers.length}</span> {filteredHelpers.length !== 1 ? t('professionals.foundProfessionals') : t('professionals.foundProfessional')}
          </p>
        </div>

        {/* Professionals Grouped by Category */}
        {filteredHelpers.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 text-lg">{t('professionals.noProfessionalsFound')}</p>
            <button
              onClick={() => {
                setSearchTerm('')
                setSelectedProfession(null)
              }}
              className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
            >
              {t('professionals.clearFilters')}
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
                        href={`/user/${helper.profile_slug || helper.id}`}
                        className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-gray-200"
                      >
                        {/* Avatar */}
                        <div 
                          className="h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 aspect-square rounded-full bg-gray-200 overflow-hidden flex-shrink-0 mb-3 min-w-[48px] min-h-[48px] relative"
                          style={{ aspectRatio: '1 / 1' }}
                        >
                          {helper.avatar_url ? (
                            <img
                              src={helper.avatar_url}
                              alt={helper.full_name || 'Professional'}
                              className="w-full h-full object-cover object-center rounded-full"
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <UserIcon className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-gray-400" />
                            </div>
                          )}
                        </div>
                        {/* Name */}
                        <h3 className="font-semibold text-gray-900 text-center text-sm">
                          {helper.full_name || 'Professional'}
                        </h3>
                        {/* Ratings: Tasker + Helper stars from reviews */}
                        {helper.userRatings && (
                          <div className="mt-1">
                            <CompactUserRatingsDisplay 
                              ratings={helper.userRatings} 
                              size="sm"
                            />
                          </div>
                        )}
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

