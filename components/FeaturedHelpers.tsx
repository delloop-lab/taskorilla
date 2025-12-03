'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@/lib/types'
import Link from 'next/link'
import { STANDARD_SKILLS, helperMatchesSearch } from '@/lib/helper-constants'
import { STANDARD_PROFESSIONS } from '@/lib/profession-constants'

interface FeaturedHelpersProps {
  searchTerm?: string
  selectedSkill?: string | null
  maxResults?: number
}

export default function FeaturedHelpers({ searchTerm = '', selectedSkill = null, maxResults = 6 }: FeaturedHelpersProps) {
  const [featuredHelpers, setFeaturedHelpers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFeaturedHelpers()
  }, [searchTerm, selectedSkill])

  const loadFeaturedHelpers = async () => {
    try {
      setLoading(true)

      // Build query for top-rated helpers
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('is_helper', true)

      // Apply filters if provided
      if (selectedSkill) {
        query = query.contains('skills', [selectedSkill])
      }

      // Note: We'll filter by searchTerm in JavaScript to include services_offered
      // Supabase doesn't easily support searching across multiple array columns
      const { data: helpersData, error } = await query

      if (error) throw error

      if (helpersData) {
        // Filter by search term in JavaScript to include services_offered and standard skills/services
        let filteredData = helpersData
        if (searchTerm) {
          filteredData = helpersData.filter(helper => helperMatchesSearch(helper, searchTerm))
        }
        
        // Use filtered data
        const helperIds = filteredData.map(h => h.id)
        if (helperIds.length === 0) {
          setFeaturedHelpers([])
          setLoading(false)
          return
        }
        
        // Get ratings for each helper
        const { data: reviewsData } = await supabase
          .from('reviews')
          .select('reviewee_id, rating')
          .in('reviewee_id', helperIds)

        // Calculate average ratings
        const ratingsByHelper: Record<string, { sum: number; count: number }> = {}
        reviewsData?.forEach(review => {
          if (!ratingsByHelper[review.reviewee_id]) {
            ratingsByHelper[review.reviewee_id] = { sum: 0, count: 0 }
          }
          ratingsByHelper[review.reviewee_id].sum += review.rating
          ratingsByHelper[review.reviewee_id].count += 1
        })

        // Get completed tasks count for activity
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('assigned_to')
          .in('assigned_to', helperIds)
          .eq('status', 'completed')

        const tasksByHelper: Record<string, number> = {}
        tasksData?.forEach(task => {
          if (task.assigned_to) {
            tasksByHelper[task.assigned_to] = (tasksByHelper[task.assigned_to] || 0) + 1
          }
        })

        // Add ratings and activity to helpers
        const helpersWithStats = filteredData.map(helper => {
          const rating = ratingsByHelper[helper.id]
          const avgRating = rating ? rating.sum / rating.count : null
          const completedTasks = tasksByHelper[helper.id] || 0

          return {
            ...helper,
            rating: avgRating,
            reviewCount: rating?.count || 0,
            completedTasks
          }
        })

        // Sort by featured status first, then by rating, then by activity
        const sorted = helpersWithStats.sort((a, b) => {
          // Prioritize manually featured helpers
          const aFeatured = a.is_featured || false
          const bFeatured = b.is_featured || false
          if (aFeatured && !bFeatured) return -1
          if (!aFeatured && bFeatured) return 1
          
          // If both are featured or both are not featured, prioritize helpers with ratings
          if (a.rating && !b.rating) return -1
          if (!a.rating && b.rating) return 1
          
          // If both have ratings, sort by rating
          if (a.rating && b.rating) {
            if (a.rating !== b.rating) {
              return b.rating - a.rating
            }
          }
          
          // Then by completed tasks (activity)
          return (b.completedTasks || 0) - (a.completedTasks || 0)
        })

        // Rotate featured helpers - take different subset each time
        const rotationIndex = Math.floor(Date.now() / (1000 * 60 * 60)) % Math.max(1, sorted.length) // Rotate hourly
        const rotated = [...sorted.slice(rotationIndex), ...sorted.slice(0, rotationIndex)]
        
        setFeaturedHelpers(rotated.slice(0, maxResults))
      }
    } catch (err: any) {
      console.error('Error loading featured helpers:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading || featuredHelpers.length === 0) {
    return null
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Featured Helpers</h2>
        <Link
          href="/helpers"
          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
        >
          View All →
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {featuredHelpers.map((helper) => {
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

          return (
            <Link
              key={helper.id}
              href={`/helper/${helper.profile_slug || helper.id}`}
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
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-2xl font-semibold text-gray-500">
                        {(helper.full_name?.[0] || helper.email?.[0] || '?').toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {helper.full_name || 'Helper'}
                    </h3>
                    {helper.rating && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-amber-600 font-semibold">★ {helper.rating.toFixed(1)}</span>
                        {helper.reviewCount > 0 && (
                          <span className="text-sm text-gray-600">({helper.reviewCount})</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Badges */}
                {helper.badges && helper.badges.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {helper.badges.map((badge, idx) => {
                      const badgeImage = getBadgeImage(badge);
                      return (
                        <span key={idx} title={badge}>
                          {badgeImage ? (
                            <img src={badgeImage} alt={badge} className="h-12 w-12 object-contain" />
                          ) : null}
                        </span>
                      );
                    })}
                  </div>
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
                      {helper.professions.slice(0, 2).map((profession, idx) => (
                        <span key={idx} className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs border border-purple-200">
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
                    <div className="space-y-1 text-xs text-gray-700">
                      {helper.professional_offerings.slice(0, 2).map((offering, idx) => (
                        <p key={idx} className="line-clamp-1">• {offering}</p>
                      ))}
                      {helper.professional_offerings.length > 2 && (
                        <p className="text-gray-500">
                          +{helper.professional_offerings.length - 2} more
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Qualifications */}
                {helper.qualifications && helper.qualifications.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-600 mb-1">Certified in:</p>
                    <div className="flex flex-wrap gap-1">
                      {helper.qualifications.slice(0, 2).map((qual, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs border border-blue-200">
                          {qual}
                        </span>
                      ))}
                      {helper.qualifications.length > 2 && (
                        <span className="px-2 py-1 text-gray-600 text-xs">
                          +{helper.qualifications.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  {helper.completedTasks > 0 && (
                    <span className="text-xs text-gray-600">
                      {helper.completedTasks} completed
                    </span>
                  )}
                  {(helper.hourly_rate || (helper.professions && helper.professions.length > 0)) && (
                    <span className="text-sm font-semibold text-primary-600">
                      {helper.hourly_rate ? `€${helper.hourly_rate}/hr` : 'Ask About Fees'}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  )
}

