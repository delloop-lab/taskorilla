'use client'

import { useEffect, useState, useMemo } from 'react'
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
import { formatRate } from '@/lib/currency'

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

  // Build a ratings map once so we can look up helper ratings quickly
  const ratingsMap = useMemo(
    () => new Map(userRatings.map((r: any) => [String(r.reviewee_id), r])),
    [userRatings]
  )

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

        setHelpers(professionals as User[])
        
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
      (
        selectedProfession != null &&
        STANDARD_PROFESSIONS.includes(selectedProfession as (typeof STANDARD_PROFESSIONS)[number]) &&
        helper.professions?.some((profession: string) => {
          // Check if helper's profession matches the selected standard profession (fuzzy match)
          const lowerHelperProfession = profession.toLowerCase()
          const lowerSelectedProfession = selectedProfession.toLowerCase()
          return lowerHelperProfession === lowerSelectedProfession ||
                 lowerHelperProfession.includes(lowerSelectedProfession) ||
                 lowerSelectedProfession.includes(lowerHelperProfession)
        })
      )
    
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

        {/* Results summary */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-gray-600">
            {t('professionals.found')}{' '}
            <span className="font-semibold text-gray-900">
              {filteredHelpers.length}
            </span>{' '}
            {filteredHelpers.length !== 1
              ? t('professionals.foundProfessionals')
              : t('professionals.foundProfessional')}
          </p>
          <p className="text-xs sm:text-sm text-gray-400">
            {t('professionals.subtitle')}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categoryHelpers.map((helper) => {
                      const helperRatings = ratingsMap.size
                        ? getUserRatingsById(helper.id, ratingsMap)
                        : null

                      return (
                        <Link
                          key={helper.id}
                          href={`/user/${helper.profile_slug || helper.id}`}
                          className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                        >
                          <div className="p-6">
                            {/* Avatar & Name */}
                            <div className="flex items-center gap-4 mb-4">
                              <div className="h-16 w-16 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                                {helper.avatar_url ? (
                                  <img
                                    src={helper.avatar_url}
                                    alt={helper.full_name || 'Helper'}
                                    className="h-full w-full object-cover rounded-full"
                                    loading="lazy"
                                    decoding="async"
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center">
                                    <UserIcon className="w-8 h-8 text-gray-400" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 truncate">
                                  {helper.full_name || 'Helper'}
                                </h3>
                                {helper.company_name && (
                                  <p className="text-sm text-gray-600 truncate">{helper.company_name}</p>
                                )}
                                {helper.postcode && helper.country && (
                                  <p className="text-xs text-gray-500">
                                    📍 {helper.postcode}, {helper.country}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Ratings: Helper stars from reviews only */}
                            {helperRatings && (
                              <div className="mb-2">
                                <CompactUserRatingsDisplay 
                                  ratings={helperRatings} 
                                  size="sm"
                                  showTasker={false}
                                  showHelper={true}
                                />
                              </div>
                            )}

                            {/* Badges (actual badge images, compact) */}
                            {helper.badges && helper.badges.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-3">
                                {helper.badges.slice(0, 3).map((badge, index) => {
                                  const getBadgeImage = (badgeName: string) => {
                                    const lowerBadge = badgeName.toLowerCase()
                                    if (lowerBadge.includes('fast') || lowerBadge.includes('responder')) {
                                      return '/images/fast.png'
                                    } else if (lowerBadge.includes('top') || lowerBadge.includes('helper')) {
                                      return '/images/top_helper.png'
                                    } else if (lowerBadge.includes('expert') || lowerBadge.includes('skill')) {
                                      return '/images/expert.png'
                                    }
                                    return null
                                  }

                                  const badgeImage = getBadgeImage(badge)

                                  return (
                                    <span key={index} title={badge}>
                                      {badgeImage ? (
                                        <img
                                          src={badgeImage}
                                          alt={badge}
                                          className="h-8 w-8 object-contain"
                                        />
                                      ) : (
                                        <span className="text-lg">🏆</span>
                                      )}
                                    </span>
                                  )
                                })}
                                {helper.badges.length > 3 && (
                                  <span className="px-2 py-0.5 text-gray-500 text-[10px]">
                                    +{helper.badges.length - 3}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Hourly Rate */}
                            {(helper.hourly_rate || (helper.professions && helper.professions.length > 0)) && (
                              <div className="mb-3">
                                <span className="text-lg font-semibold text-primary-600">
                                  {helper.hourly_rate != null ? `€${formatRate(Number(helper.hourly_rate))}/hr` : 'Ask About Fees'}
                                </span>
                              </div>
                            )}

                            {/* Bio Preview */}
                            {helper.bio && (
                              <p className="text-sm text-gray-700 line-clamp-2 mb-3">
                                {helper.bio}
                              </p>
                            )}

                            {/* Skills */}
                            {helper.skills && helper.skills.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-3">
                                {helper.skills.slice(0, 3).map((skill, index) => (
                                  <span
                                    key={index}
                                    className="px-2 py-1 bg-primary-100 text-primary-800 rounded text-xs font-medium"
                                  >
                                    {skill}
                                  </span>
                                ))}
                                {helper.skills.length > 3 && (
                                  <span className="px-2 py-1 text-gray-600 text-xs">
                                    +{helper.skills.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Professions */}
                            {helper.professions && helper.professions.length > 0 && (
                              <div className="mb-3">
                                <p className="text-xs text-gray-600 mb-1">Professional:</p>
                                <div className="flex flex-wrap gap-1">
                                  {helper.professions.slice(0, 2).map((profession, index) => (
                                    <span
                                      key={index}
                                      className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs border border-purple-200"
                                    >
                                      {profession}
                                    </span>
                                  ))}
                                  {helper.professions.length > 2 && (
                                    <span className="px-2 py-1 text-gray-600 text-xs">
                                      +{helper.professions.length - 2}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Professional Offerings */}
                            {helper.professional_offerings && helper.professional_offerings.length > 0 && (
                              <div className="mb-3">
                                <p className="text-xs text-gray-600 mb-1">Offers:</p>
                                <div className="space-y-1 text-sm text-gray-700">
                                  {helper.professional_offerings.slice(0, 2).map((offering, index) => (
                                    <p key={index} className="line-clamp-1">• {offering}</p>
                                  ))}
                                  {helper.professional_offerings.length > 2 && (
                                    <p className="text-xs text-gray-500">
                                      +{helper.professional_offerings.length - 2} more
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </Link>
                      )
                    })}
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

