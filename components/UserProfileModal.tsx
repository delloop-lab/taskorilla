'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { User, Review } from '@/lib/types'
import { format } from 'date-fns'

interface UserProfileModalProps {
  userId: string | null
  isOpen: boolean
  onClose: () => void
  taskOwnerId?: string | null // Optional: if provided, only task owner can see full details
}

export default function UserProfileModal({ userId, isOpen, onClose, taskOwnerId }: UserProfileModalProps) {
  const [user, setUser] = useState<User | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    // Get current user
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    }
    getCurrentUser()
  }, [])

  useEffect(() => {
    if (isOpen && userId) {
      // If taskOwnerId is provided, check if current user is the task owner
      if (taskOwnerId) {
        // Wait for currentUserId to be loaded
        if (currentUserId === null) {
          return // Still loading current user
        }
        // If current user is not the task owner, don't load details
        if (currentUserId !== taskOwnerId) {
          setUser(null)
          setReviews([])
          setLoading(false)
          return
        }
      }
      loadUserProfile()
    } else {
      setUser(null)
      setReviews([])
    }
  }, [isOpen, userId, taskOwnerId, currentUserId])

  const loadUserProfile = async () => {
    if (!userId) return

    setLoading(true)
    try {
      // Load user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileError) throw profileError

      // Load reviews for this user
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('*')
        .eq('reviewee_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (reviewsError) throw reviewsError

      // Load reviewer profiles
      if (reviewsData && reviewsData.length > 0) {
        const reviewerIds = Array.from(new Set(reviewsData.map(r => r.reviewer_id)))
        const { data: reviewerProfiles } = await supabase
          .from('profiles')
          .select('id, email, full_name, avatar_url')
          .in('id', reviewerIds)

        const reviewsWithProfiles = reviewsData.map(review => ({
          ...review,
          reviewer: reviewerProfiles?.find(p => p.id === review.reviewer_id)
        }))

        setReviews(reviewsWithProfiles)

        // Calculate average rating
        const avg = reviewsWithProfiles.reduce((sum, r) => sum + r.rating, 0) / reviewsWithProfiles.length
        setUser({
          ...profileData,
          rating: avg,
          reviewCount: reviewsWithProfiles.length
        })
      } else {
        setReviews([])
        setUser({
          ...profileData,
          rating: null,
          reviewCount: 0
        })
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">User Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">Loading profile...</div>
          ) : taskOwnerId && currentUserId !== taskOwnerId ? (
            <div className="text-center py-8 text-gray-500">
              <p>You can only view bidder details if you are the task owner.</p>
            </div>
          ) : user ? (
            <>
              {/* User Info Section */}
              <div className="flex items-start space-x-4 mb-6 pb-6 border-b border-gray-200">
                <div className="flex-shrink-0">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.full_name || user.email}
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-2xl font-semibold text-gray-600">
                        {(user.full_name?.[0] || user.email?.[0] || '?').toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {user.full_name || user.email}
                  </h3>
                  {user.company_name && (
                    <p className="text-sm text-gray-600 mb-2">{user.company_name}</p>
                  )}
                  {user.rating !== null && user.rating !== undefined && (
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl font-bold text-amber-600 flex items-center">
                        <span className="mr-1">★</span>
                        <span>{user.rating.toFixed(1)}</span>
                      </span>
                      {user.reviewCount !== undefined && user.reviewCount > 0 && (
                        <span className="text-sm text-gray-500">
                          ({user.reviewCount} review{user.reviewCount === 1 ? '' : 's'})
                        </span>
                      )}
                    </div>
                  )}
                  {(!user.rating || user.reviewCount === 0) && (
                    <p className="text-sm text-gray-500">No reviews yet</p>
                  )}
                </div>
              </div>

              {/* Contact Info - Only show location, not phone number */}
              {(user.postcode || user.country) && (
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Location</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    {user.postcode && user.country && (
                      <p>📍 {user.postcode}, {user.country}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Reviews Section */}
              {reviews.length > 0 ? (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Reviews</h4>
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {review.reviewer?.avatar_url ? (
                              <img
                                src={review.reviewer.avatar_url}
                                alt={review.reviewer.full_name || review.reviewer.email}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-xs font-semibold text-gray-600">
                                  {(review.reviewer?.full_name?.[0] || review.reviewer?.email?.[0] || '?').toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {review.reviewer?.full_name || review.reviewer?.email || 'Anonymous'}
                              </p>
                              <div className="flex items-center space-x-1">
                                {[...Array(5)].map((_, i) => (
                                  <span
                                    key={i}
                                    className={`text-xs ${
                                      i < review.rating ? 'text-amber-500' : 'text-gray-300'
                                    }`}
                                  >
                                    ★
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs text-gray-500">
                            {format(new Date(review.created_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                        {review.comment && (
                          <p className="text-sm text-gray-700 mt-2">{review.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No reviews yet</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">User not found</div>
          )}
        </div>
      </div>
    </div>
  )
}

