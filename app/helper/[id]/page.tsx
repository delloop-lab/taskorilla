'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User, Review, Task, TaskCompletionPhoto } from '@/lib/types'
import { format } from 'date-fns'
import Link from 'next/link'
import StandardModal from '@/components/StandardModal'
import ReportModal from '@/components/ReportModal'
import { User as UserIcon } from 'lucide-react'

function HelperProfileContent() {
  const params = useParams()
  const router = useRouter()
  const helperId = params.id as string
  
  const [profile, setProfile] = useState<User | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [completedTasks, setCompletedTasks] = useState<Task[]>([])
  const [averageRating, setAverageRating] = useState<number | null>(null)
  const [totalReviews, setTotalReviews] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [showQrCode, setShowQrCode] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [canMessageHelper, setCanMessageHelper] = useState(false)
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    type: 'success' | 'error' | 'warning' | 'info' | 'confirm'
    title: string
    message: string
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  })

  useEffect(() => {
    loadHelperProfile()
  }, [helperId])

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data } = await supabase.auth.getUser()
        setCurrentUserId(data.user?.id || null)
      } catch (err) {
        console.error('Error fetching current user:', err)
      }
    }
    getCurrentUser()
  }, [])

  useEffect(() => {
    const checkPermission = async () => {
      if (!currentUserId || !profile || currentUserId === profile.id) {
        setCanMessageHelper(false)
        return
      }
      try {
        const { data: assignedTasks, error: assignedError } = await supabase
          .from('tasks')
          .select('id')
          .eq('created_by', currentUserId)
          .eq('assigned_to', profile.id)
          .limit(1)

        if (assignedError) {
          console.error('Error checking assigned tasks:', assignedError)
        }

        if (assignedTasks && assignedTasks.length > 0) {
          setCanMessageHelper(true)
          return
        }

        const { data: bidData, error: bidError } = await supabase
          .from('bids')
          .select('id, task_id, tasks!inner(created_by)')
          .eq('user_id', profile.id)
          .eq('tasks.created_by', currentUserId)
          .limit(1)

        if (bidError) {
          console.error('Error checking bids:', bidError)
        }

        if (bidData && bidData.length > 0) {
          setCanMessageHelper(true)
          return
        }

        setCanMessageHelper(false)
      } catch (error) {
        console.error('Error determining message permissions:', error)
        setCanMessageHelper(false)
      } finally {
        // no-op
      }
    }

    if (profile) {
      checkPermission()
    }
  }, [currentUserId, profile])

  const loadHelperProfile = async () => {
    try {
      setLoading(true)
      setError(null)

      // Check if helperId is a UUID (36 chars with hyphens) or a slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(helperId)
      
      // Load profile by ID or slug
      let profileQuery
      if (isUUID) {
        // If it's a UUID, try ID first, then slug
        profileQuery = supabase
          .from('profiles')
          .select('*')
          .or(`id.eq.${helperId},profile_slug.eq.${helperId}`)
          .eq('is_helper', true)
          .single()
      } else {
        // If it's a slug, only query by slug to avoid UUID comparison error
        profileQuery = supabase
          .from('profiles')
          .select('*')
          .eq('profile_slug', helperId)
          .eq('is_helper', true)
          .single()
      }

      const { data: profileData, error: profileError } = await profileQuery

      if (profileError || !profileData) {
        setError('Helper profile not found')
        setLoading(false)
        return
      }

      setProfile(profileData)

      // Load reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('*')
        .eq('reviewee_id', profileData.id)
        .order('created_at', { ascending: false })

      if (reviewsError) {
        console.error('Error loading reviews:', reviewsError)
      }

      if (reviewsData && reviewsData.length > 0) {
        // Get reviewer IDs and task IDs
        const reviewerIds = Array.from(new Set(reviewsData.map(r => r.reviewer_id)))
        const taskIds = Array.from(new Set(reviewsData.map(r => r.task_id)))

        // Load reviewer profiles
        const { data: reviewerProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, email')
          .in('id', reviewerIds)

        // Load tasks
        const { data: taskData } = await supabase
          .from('tasks')
          .select('id, title')
          .in('id', taskIds)

        // Combine reviews with profiles and tasks
        const reviewsWithProfiles = reviewsData.map(review => ({
          ...review,
          reviewer: reviewerProfiles?.find(p => p.id === review.reviewer_id),
          task: taskData?.find(t => t.id === review.task_id),
        }))

        setReviews(reviewsWithProfiles)
        const avg = reviewsWithProfiles.reduce((sum, r) => sum + r.rating, 0) / reviewsWithProfiles.length
        setAverageRating(avg)
        setTotalReviews(reviewsWithProfiles.length)
      } else {
        setReviews([])
        setAverageRating(null)
        setTotalReviews(0)
      }

      // Load completed tasks with completion photos
      const { data: tasksData } = await supabase
        .from('tasks')
        .select(`
          *,
          completion_photos:task_completion_photos(*)
        `)
        .eq('assigned_to', profileData.id)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })
        .limit(12)

      if (tasksData) {
        // Load reviews for all completed tasks
        const taskIds = tasksData.map(t => t.id)
        const { data: reviewsData } = await supabase
          .from('reviews')
          .select('task_id, rating')
          .in('task_id', taskIds)

        // Group reviews by task_id and calculate averages
        const reviewsByTask: Record<string, { ratings: number[], count: number }> = {}
        if (reviewsData) {
          reviewsData.forEach((review: any) => {
            if (!reviewsByTask[review.task_id]) {
              reviewsByTask[review.task_id] = { ratings: [], count: 0 }
            }
            reviewsByTask[review.task_id].ratings.push(review.rating)
            reviewsByTask[review.task_id].count++
          })
        }

        // Calculate average rating for each task
        const tasksWithRatings = tasksData.map(task => {
          const taskReviews = reviewsByTask[task.id]
          const avgRating = taskReviews && taskReviews.ratings.length > 0
            ? taskReviews.ratings.reduce((sum, r) => sum + r, 0) / taskReviews.ratings.length
            : null
          return {
            ...task,
            averageRating: avgRating,
            reviewCount: taskReviews?.count || 0
          }
        })
        setCompletedTasks(tasksWithRatings)
      }

      // Generate QR code URL
      const profileUrl = `${window.location.origin}/helper/${profileData.profile_slug || profileData.id}`
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(profileUrl)}`)

    } catch (err: any) {
      console.error('Error loading helper profile:', err)
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint
      })
      setError(err.message || 'Failed to load helper profile')
    } finally {
      setLoading(false)
    }
  }

  const copyProfileLink = () => {
    if (!profile) return
    const profileUrl = `${window.location.origin}/helper/${profile.profile_slug || profile.id}`
    navigator.clipboard.writeText(profileUrl)
    setModalState({
      isOpen: true,
      type: 'success',
      title: 'Copied!',
      message: 'Profile link copied to clipboard!',
    })
  }

  const handleRequestHelper = (offering?: string) => {
    if (!profile) {
      console.error('No profile available')
      return
    }
    try {
      const params = new URLSearchParams({ helperId: profile.id })
      if (offering) {
        params.set('offering', offering)
      }
      router.push(`/tasks/new?${params.toString()}`)
    } catch (error) {
      console.error('Error navigating to request helper:', error)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Unable to navigate to request form. Please try again.',
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading helper profile...</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Helper Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'This helper profile does not exist or is not available.'}</p>
          <Link
            href="/tasks"
            className="inline-block bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700"
          >
            Browse Tasks
          </Link>
        </div>
      </div>
    )
  }

  const profileUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/helper/${profile.profile_slug || profile.id}`

  return (
    <>
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div 
                className="h-20 w-20 sm:h-24 sm:w-24 md:h-32 md:w-32 aspect-square rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-xl sm:text-2xl md:text-4xl font-semibold text-gray-500 border-2 sm:border-4 border-white shadow-lg min-w-[80px] min-h-[80px]"
                style={{ aspectRatio: '1 / 1' }}
              >
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name || 'Helper'}
                    className="w-full h-full object-cover object-center"
                  />
                ) : (
                  <UserIcon className="w-16 h-16 text-gray-400" />
                )}
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                    {profile.full_name || 'Helper'}
                  </h1>
                  {profile.company_name && (
                    <p className="text-lg text-gray-600 mb-2">{profile.company_name}</p>
                  )}
                  {profile.postcode && profile.country && (
                    <p className="text-sm text-gray-500 mb-4">
                      📍 {profile.postcode}, {profile.country}
                    </p>
                  )}
                </div>

                {/* Share, Request & QR Code */}
                <div className="flex flex-wrap gap-2 justify-start sm:justify-end mt-4 sm:mt-0">
                  {(!currentUserId || currentUserId !== profile.id) && (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleRequestHelper()
                      }}
                      className="px-3 sm:px-4 py-2 bg-primary-600 text-white rounded-md text-xs sm:text-sm font-semibold hover:bg-primary-700 transition-colors cursor-pointer relative z-10"
                      type="button"
                    >
                      Request this helper
                    </button>
                  )}
                  <button
                    onClick={copyProfileLink}
                    className="px-3 sm:px-4 py-2 border border-gray-300 rounded-md text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Share
                  </button>
                  {qrCodeUrl && (
                    <button
                      onClick={() => setShowQrCode(!showQrCode)}
                      className="px-3 sm:px-4 py-2 border border-gray-300 rounded-md text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                      QR Code
                    </button>
                  )}
                  {currentUserId && currentUserId !== profile.id && (
                    <button
                      onClick={() => setReportModalOpen(true)}
                      className="px-3 sm:px-4 py-2 border border-red-300 rounded-md text-xs sm:text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Report
                    </button>
                  )}
                </div>
              </div>

              {/* Rating */}
              {averageRating !== null && (
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl sm:text-3xl font-bold text-amber-600">★ {averageRating.toFixed(1)}</span>
                    <span className="text-gray-600">({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})</span>
                  </div>
                  {(profile.hourly_rate || (profile.professions && profile.professions.length > 0)) && (
                    <div className="text-lg font-semibold text-gray-900">
                      {profile.hourly_rate ? `€${profile.hourly_rate}/hr` : 'Ask About Fees'}
                    </div>
                  )}
                </div>
              )}

              {/* QR Code Modal */}
              {showQrCode && qrCodeUrl && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 sm:p-6" onClick={() => setShowQrCode(false)}>
                  <div className="bg-white rounded-lg p-4 sm:p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
                    <h3 className="text-lg font-semibold mb-4">Scan QR Code</h3>
                    <img src={qrCodeUrl} alt="QR Code" className="mx-auto mb-4" />
                    <p className="text-sm text-gray-600 text-center mb-4">Share this profile with others</p>
                    <button
                      onClick={() => setShowQrCode(false)}
                      className="w-full bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bio */}
            {profile.bio && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">About</h2>
                <p className="text-gray-700 whitespace-pre-line">{profile.bio}</p>
              </div>
            )}

            {/* Skills */}
            {profile.skills && profile.skills.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Services Offered */}
            {profile.services_offered && profile.services_offered.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Services Offered</h2>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  {profile.services_offered.map((service, index) => (
                    <li key={index}>{service}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Professional Offerings */}
            {profile.professional_offerings && profile.professional_offerings.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Professional Offerings</h2>
                <ul className="space-y-2 text-gray-700">
                  {profile.professional_offerings.map((offering, index) => (
                    <li key={index} className="flex items-center justify-between gap-3">
                      <span>{offering}</span>
                      {(!currentUserId || currentUserId !== profile.id) && (
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleRequestHelper(offering)
                          }}
                          className="text-sm px-3 py-1 bg-primary-50 text-primary-700 border border-primary-200 rounded hover:bg-primary-100 cursor-pointer relative z-10"
                          type="button"
                        >
                          Request this
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Professions */}
            {profile.professions && profile.professions.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Professions</h2>
                <div className="flex flex-wrap gap-2">
                  {profile.professions.map((profession, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium"
                    >
                      {profession}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Qualifications */}
            {profile.qualifications && profile.qualifications.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Qualifications & Certifications</h2>
                <div className="space-y-3">
                  {profile.qualifications.map((qualification, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      <span className="text-gray-900 font-medium">{qualification}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Completed Tasks</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {completedTasks.map((task: any) => {
                    const taskRating = task.averageRating
                    const taskReviewCount = task.reviewCount || 0
                    return (
                      <Link
                        key={task.id}
                        href={`/tasks/${task.id}`}
                        className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow block"
                      >
                        {task.completion_photos && task.completion_photos.length > 0 && (
                          <div className="aspect-video bg-gray-100 relative">
                            <img
                              src={task.completion_photos[0].image_url}
                              alt={task.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="p-4">
                          <h3 className="font-semibold text-gray-900 mb-1">{task.title}</h3>
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{task.description}</p>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-primary-600">{task.budget ? `€${task.budget}` : 'Quote'}</span>
                            <span className="text-xs text-gray-500">
                              {format(new Date(task.updated_at), 'MMM yyyy')}
                            </span>
                          </div>
                          {/* Rating Display */}
                          {taskRating ? (
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                              <div className="flex items-center gap-1">
                                <span className="text-amber-600 font-semibold text-sm">
                                  {'★'.repeat(Math.round(taskRating))}
                                </span>
                                <span className="text-gray-400 text-sm">
                                  {'★'.repeat(5 - Math.round(taskRating))}
                                </span>
                              </div>
                              <span className="text-sm font-semibold text-gray-700">
                                {taskRating.toFixed(1)}
                              </span>
                              {taskReviewCount > 0 && (
                                <span className="text-xs text-gray-500">
                                  ({taskReviewCount} review{taskReviewCount !== 1 ? 's' : ''})
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              <span className="text-xs text-gray-500 italic">No reviews yet</span>
                            </div>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Reviews ({totalReviews})</h2>
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-200 pb-4 last:border-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {review.reviewer?.avatar_url ? (
                            <img
                              src={review.reviewer.avatar_url}
                              alt={review.reviewer.full_name || 'Reviewer'}
                              className="h-10 w-10 rounded-full"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <UserIcon className="w-5 h-5 text-gray-500" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-900">
                              {review.reviewer?.full_name || review.reviewer?.email || 'Anonymous'}
                            </p>
                            {review.task && 'title' in review.task && (
                              <p className="text-sm text-gray-500">Task: {review.task.title}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-amber-600 font-semibold">
                          {'★'.repeat(review.rating)}
                          <span className="text-gray-300">{'★'.repeat(5 - review.rating)}</span>
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-gray-700 mt-2">{review.comment}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {format(new Date(review.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Badges */}
            {profile.badges && profile.badges.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Badges</h3>
                <div className="space-y-3">
                  {profile.badges.map((badge, index) => {
                    // Get badge image based on badge name
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
                      <div key={index} className="flex items-center">
                        {badgeImage ? (
                          <img
                            src={badgeImage}
                            alt={badge}
                            className="h-48 w-48 object-contain"
                          />
                        ) : (
                          <span className="text-9xl">🏆</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Stats</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Tasks Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{completedTasks.length}</p>
                </div>
                {averageRating !== null && (
                  <div>
                    <p className="text-sm text-gray-600">Average Rating</p>
                    <p className="text-2xl font-bold text-amber-600">★ {averageRating.toFixed(1)}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">Member Since</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {format(new Date(profile.created_at), 'MMMM yyyy')}
                  </p>
                </div>
              </div>
            </div>

            {/* Contact */}
            {canMessageHelper && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact</h3>
                <Link
                  href={`/messages/new?user=${profile.id}`}
                  className="block w-full bg-primary-600 text-white text-center px-4 py-2 rounded-md hover:bg-primary-700 font-medium"
                >
                  Send Message
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Standard Modal */}
    <StandardModal
      isOpen={modalState.isOpen}
      onClose={() => setModalState({ ...modalState, isOpen: false })}
      type={modalState.type}
      title={modalState.title}
      message={modalState.message}
    />

    {/* Report Modal */}
    {profile && (
      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        reportType="user"
        targetId={profile.id}
        targetName={profile?.full_name || undefined}
        onReportSubmitted={() => {
          setReportModalOpen(false);
        }}
      />
    )}
    </>
  )
}

export default function HelperProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <HelperProfileContent />
    </Suspense>
  )
}

