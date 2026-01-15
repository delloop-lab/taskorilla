'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User } from '@/lib/types'
import Link from 'next/link'
import FeaturedHelpers from '@/components/FeaturedHelpers'
import { STANDARD_SKILLS, STANDARD_SERVICES, helperMatchesSearch } from '@/lib/helper-constants'
import { STANDARD_PROFESSIONS, helperMatchesProfession } from '@/lib/profession-constants'
import { useLanguage } from '@/lib/i18n'
import { User as UserIcon } from 'lucide-react'
import { useUserRatings, getUserRatingsById } from '@/lib/useUserRatings'
import CompactUserRatingsDisplay from '@/components/CompactUserRatingsDisplay'

export default function BrowseHelpersPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const { users: userRatings } = useUserRatings()
  const [helpers, setHelpers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null)
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [selectedProfession, setSelectedProfession] = useState<string | null>(null)
  const [showProfessionalsOnly, setShowProfessionalsOnly] = useState(false)
  const [availableSkills, setAvailableSkills] = useState<string[]>([])
  const [availableServices, setAvailableServices] = useState<string[]>([])
  const [availableProfessions, setAvailableProfessions] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    loadHelpers()
  }, [])

  // Calculate profile completion score based on key profile fields
  function calculateProfileCompletionScore(helper: User): number {
    let score = 0
    
    // Bio (1 point)
    if (helper.bio && helper.bio.trim().length > 0) {
      score += 1
    }
    
    // Avatar (1 point)
    if (helper.avatar_url && helper.avatar_url.trim().length > 0) {
      score += 1
    }
    
    // Skills (1 point)
    if (helper.skills && Array.isArray(helper.skills) && helper.skills.length > 0) {
      score += 1
    }
    
    // Services Offered (1 point)
    if (helper.services_offered && Array.isArray(helper.services_offered) && helper.services_offered.length > 0) {
      score += 1
    }
    
    // Professions (1 point) - professional roles
    if (helper.professions && Array.isArray(helper.professions) && helper.professions.length > 0) {
      score += 1
    }
    
    // Professional Offerings (1 point) - professional services
    if (helper.professional_offerings && Array.isArray(helper.professional_offerings) && helper.professional_offerings.length > 0) {
      score += 1
    }
    
    return score
  }

  // Auto-show filters if search term or any filter is selected
  useEffect(() => {
    if (searchTerm || selectedSkill || selectedService || selectedProfession || showProfessionalsOnly) {
      setShowFilters(true)
    }
  }, [searchTerm, selectedSkill, selectedService, selectedProfession, showProfessionalsOnly])

  const loadHelpers = async () => {
    try {
      setLoading(true)
      
      // Load only users with Helper status (exclude admins and taskers who are not Helpers)
      const { data: helpersData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_helper', true)
        .neq('role', 'admin')
        .neq('role', 'superadmin')

      if (error) throw error

      if (helpersData) {
        // Filter to ensure only users with Helper status are included
        // Exclude admins, superadmins, and any Taskers who are not Helpers (double-check client-side)
        const onlyHelpers = helpersData.filter((helper: any) => {
          return helper.is_helper === true && 
                 helper.role !== 'admin' && 
                 helper.role !== 'superadmin'
        })
        
        // Add ratings from SQL function
        // The SQL function returns 'reviewee_id' as the user identifier
        const ratingsMap = new Map(userRatings.map((r: any) => [r.reviewee_id, r]))
        const helpersWithRatings = onlyHelpers.map((helper: any) => {
          const userRating = getUserRatingsById(helper.id, ratingsMap)
          return {
            ...helper,
            userRatings: userRating || null
          }
        })
        
        // Sort helpers by profile completion score, then badges, featured status, rating, and date
        const sortedHelpers = helpersWithRatings.sort((a: any, b: any) => {
          // Calculate completion scores
          const scoreA = calculateProfileCompletionScore(a)
          const scoreB = calculateProfileCompletionScore(b)
          
          // Primary sort: Profile completion score (highest first)
          if (scoreB !== scoreA) {
            return scoreB - scoreA
          }
          
          // Secondary sort: Badge count (helpers with more badges appear before those with fewer badges)
          const aBadgeCount = (a.badges && Array.isArray(a.badges)) ? a.badges.length : 0
          const bBadgeCount = (b.badges && Array.isArray(b.badges)) ? b.badges.length : 0
          if (bBadgeCount !== aBadgeCount) {
            return bBadgeCount - aBadgeCount
          }
          
          // Tertiary sort: Featured status (featured first)
          const aFeatured = a.is_featured || false
          const bFeatured = b.is_featured || false
          if (aFeatured && !bFeatured) return -1
          if (!aFeatured && bFeatured) return 1
          
          // Quaternary sort: Helper rating (if available)
          const aRating = a.userRatings?.helper_avg_rating || 0
          const bRating = b.userRatings?.helper_avg_rating || 0
          if (bRating !== aRating) {
            return bRating - aRating
          }
          
          // Final sort: Newest first (created_at)
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
        
        setHelpers(sortedHelpers)
        
        // Combine database skills with standard skills for dropdown
        const allSkills = new Set<string>()
        const allServices = new Set<string>()
        const allProfessions = new Set<string>()
        
        // Add standard skills
        STANDARD_SKILLS.forEach(skill => allSkills.add(skill))
        
        // Add standard services
        STANDARD_SERVICES.forEach(service => allServices.add(service))
        
        // Add standard professions
        STANDARD_PROFESSIONS.forEach(profession => allProfessions.add(profession))
        
        // Add skills, services, and professions from helpers
        onlyHelpers.forEach((helper: any) => {
          if (helper.skills && Array.isArray(helper.skills)) {
            helper.skills.forEach((skill: string) => allSkills.add(skill))
          }
          if (helper.services_offered && Array.isArray(helper.services_offered)) {
            helper.services_offered.forEach((service: string) => allServices.add(service))
          }
          if (helper.professions && Array.isArray(helper.professions)) {
            helper.professions.forEach((profession: string) => allProfessions.add(profession))
          }
        })
        
        setAvailableSkills(Array.from(allSkills).sort())
        setAvailableServices(Array.from(allServices).sort())
        setAvailableProfessions(Array.from(allProfessions).sort())
      }
    } catch (err: any) {
      console.error('Error loading helpers:', err)
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredHelpers = helpers.filter(helper => {
    // Filter by professional helpers only if enabled
    const isProfessional = helper.professions && helper.professions.length > 0
    if (showProfessionalsOnly && !isProfessional) {
      return false
    }
    
    // If search term is provided, use comprehensive search
    const matchesSearch = !searchTerm || helperMatchesSearch(helper, searchTerm)
    
    // Check if helper has the selected skill (exact match or case-insensitive)
    const matchesSkill = !selectedSkill || 
      helper.skills?.includes(selectedSkill) ||
      helper.skills?.some((skill: string) => skill.toLowerCase() === selectedSkill.toLowerCase()) ||
      // Also check if selected skill matches any standard skill that helper has
      (STANDARD_SKILLS.includes(selectedSkill) && helper.skills?.some((skill: string) => {
        // Check if helper's skill matches the selected standard skill (fuzzy match)
        const lowerHelperSkill = skill.toLowerCase()
        const lowerSelectedSkill = selectedSkill.toLowerCase()
        return lowerHelperSkill === lowerSelectedSkill ||
               lowerHelperSkill.includes(lowerSelectedSkill) ||
               lowerSelectedSkill.includes(lowerHelperSkill)
      }))
    
    // Check if helper has the selected service (exact match or case-insensitive)
    const matchesService = !selectedService || 
      helper.services_offered?.includes(selectedService) ||
      helper.services_offered?.some((service: string) => service.toLowerCase() === selectedService.toLowerCase()) ||
      // Also check if selected service matches any standard service that helper has
      (STANDARD_SERVICES.includes(selectedService) && helper.services_offered?.some((service: string) => {
        // Check if helper's service matches the selected standard service (fuzzy match)
        const lowerHelperService = service.toLowerCase()
        const lowerSelectedService = selectedService.toLowerCase()
        return lowerHelperService === lowerSelectedService ||
               lowerHelperService.includes(lowerSelectedService) ||
               lowerSelectedService.includes(lowerHelperService)
      }))
    
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
    
    return matchesSearch && matchesSkill && matchesService && matchesProfession
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading helpers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Featured Helpers Section - shown when searching with text input */}
        {searchTerm && !selectedSkill && !selectedService && !selectedProfession && (
          <FeaturedHelpers searchTerm={searchTerm} selectedSkill={selectedSkill} maxResults={6} />
        )}

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('helpers.browseHelpers')}</h1>
            <p className="text-gray-600">
              {t('helpers.findSkilledHelpers')}
            </p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {showFilters ? t('helpers.hideFilters') : t('helpers.showFilters')}
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="space-y-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('helpers.searchHelpers')}
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('helpers.searchPlaceholder')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Professional Only Toggle */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="professionalsOnly"
                checked={showProfessionalsOnly}
                onChange={(e) => {
                  if (e.target.checked) {
                    // Redirect to professionals page when checked
                    router.push('/professionals')
                  }
                }}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="professionalsOnly" className="ml-2 block text-sm font-medium text-gray-700">
                {t('helpers.showOnlyProfessional')}
              </label>
            </div>

            {/* Filters Grid */}
            <div className={`grid gap-4 ${showProfessionalsOnly ? 'grid-cols-1 md:grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>
              {/* Skill Filter - Hidden when showing professionals only */}
              {!showProfessionalsOnly && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('helpers.filterBySkill')}
                  </label>
                  <select
                    value={selectedSkill || ''}
                    onChange={(e) => {
                      setSelectedSkill(e.target.value || null)
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                  >
                    <option value="">{t('helpers.allSkills')}</option>
                    {availableSkills.map(skill => (
                      <option key={skill} value={skill}>{skill}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Service Filter - Hidden when showing professionals only */}
              {!showProfessionalsOnly && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('helpers.filterByService')}
                  </label>
                  <select
                    value={selectedService || ''}
                    onChange={(e) => {
                      setSelectedService(e.target.value || null)
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                  >
                    <option value="">{t('helpers.allServices')}</option>
                    {availableServices.length > 0 ? (
                      availableServices.map(service => (
                        <option key={service} value={service}>{service}</option>
                      ))
                    ) : (
                      STANDARD_SERVICES.map(service => (
                        <option key={service} value={service}>{service}</option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {/* Profession Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('helpers.filterByProfession')}
                </label>
                <select
                  value={selectedProfession || ''}
                  onChange={(e) => {
                    setSelectedProfession(e.target.value || null)
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                >
                  <option value="">{t('helpers.allProfessions')}</option>
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
        </div>
        )}

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-gray-600">
            {t('helpers.foundHelpers')} <span className="font-semibold text-gray-900">{filteredHelpers.length}</span> {filteredHelpers.length !== 1 ? t('helpers.helpers') : t('helpers.helper')}
          </p>
        </div>

        {/* Helpers Grid */}
        {filteredHelpers.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 text-lg">No helpers found matching your criteria.</p>
            <button
              onClick={() => {
                setSearchTerm('')
                setSelectedSkill(null)
                setSelectedService(null)
                setSelectedProfession(null)
                setShowProfessionalsOnly(false)
              }}
              className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
            >
              {t('helpers.clearFilters')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHelpers.map((helper) => (
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

                  {/* Rating */}
                  {helper.userRatings && (
                    <div className="mb-3">
                      <CompactUserRatingsDisplay 
                        ratings={helper.userRatings} 
                        size="sm"
                      />
                    </div>
                  )}

                  {/* Hourly Rate */}
                  {(helper.hourly_rate || (helper.professions && helper.professions.length > 0)) && (
                    <div className="mb-3">
                      <span className="text-lg font-semibold text-primary-600">
                        {helper.hourly_rate ? `€${helper.hourly_rate}/hr` : 'Ask About Fees'}
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

                  {/* Badges */}
                  {helper.badges && helper.badges.length > 0 && (
                    <div className="flex flex-wrap gap-3 mb-3">
                      {helper.badges.map((badge, index) => {
                        const getBadgeImage = (badgeName: string) => {
                          const lowerBadge = badgeName.toLowerCase();
                          if (lowerBadge.includes('fast') || lowerBadge.includes('responder')) {
                            return '/images/fast.png';
                          } else if (lowerBadge.includes('top') || lowerBadge.includes('helper')) {
                            return '/images/top_helper.png';
                          } else if (lowerBadge.includes('expert') || lowerBadge.includes('skill')) {
                            return '/images/expert.png';
                          }
                          return null;
                        };
                        
                        const badgeImage = getBadgeImage(badge);
                        
                        return (
                          <span
                            key={index}
                            title={badge}
                          >
                            {badgeImage ? (
                              <img
                                src={badgeImage}
                                alt={badge}
                                className="h-24 w-24 object-contain"
                              />
                            ) : (
                              <span className="text-5xl">🏆</span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* View Profile Link */}
                  <div className="mt-4 pt-4 border-t">
                    <span className="text-primary-600 text-sm font-medium hover:text-primary-700">
                      View Profile →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

