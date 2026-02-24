'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Task, Bid, Review } from '@/lib/types'
import { format } from 'date-fns'

import { formatEuro } from '@/lib/currency'
import Link from 'next/link'
import UserProfileModal from '@/components/UserProfileModal'
import StandardModal from '@/components/StandardModal'
import { extractTownName } from '@/lib/geocoding'
import { checkForContactInfo } from '@/lib/content-filter'
import { User as UserIcon } from 'lucide-react'
import { compressTaskImage } from '@/lib/image-utils'
import { useUserRatings, getUserRatingsById } from '@/lib/useUserRatings'
import CompactUserRatingsDisplay from '@/components/CompactUserRatingsDisplay'

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const taskId = params.id as string
  const { users: userRatings } = useUserRatings()

  const [task, setTask] = useState<Task | null>(null)
  const [bids, setBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [bidAmount, setBidAmount] = useState('')
  const [bidMessage, setBidMessage] = useState('')
  const [submittingBid, setSubmittingBid] = useState(false)
  const [bidSubmitStatus, setBidSubmitStatus] = useState<string | null>(null)
  const [acceptingBidId, setAcceptingBidId] = useState<string | null>(null)
  const [acceptBidStatus, setAcceptBidStatus] = useState<string | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewRating, setReviewRating] = useState('5')
  const [reviewComment, setReviewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [bidNotification, setBidNotification] = useState<string | null>(null)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [completingTask, setCompletingTask] = useState(false)
  const [showReviewReminder, setShowReviewReminder] = useState(false)
  const [progressUpdates, setProgressUpdates] = useState<any[]>([])
  const [newProgressMessage, setNewProgressMessage] = useState('')
  const [uploadingProgressPhoto, setUploadingProgressPhoto] = useState(false)
  const [progressPhoto, setProgressPhoto] = useState<string | null>(null)
  const [addingProgressUpdate, setAddingProgressUpdate] = useState(false)
  const [revisionRequestMessage, setRevisionRequestMessage] = useState('')
  const [revisionRequestPhoto, setRevisionRequestPhoto] = useState<string | null>(null)
  const [uploadingRevisionRequestPhoto, setUploadingRevisionRequestPhoto] = useState(false)
  const [revisionCompletePhoto, setRevisionCompletePhoto] = useState<string | null>(null)
  const [uploadingRevisionCompletePhoto, setUploadingRevisionCompletePhoto] = useState(false)
  const [revisionCompleteMessage, setRevisionCompleteMessage] = useState('')
  const [submittingRevisionRequest, setSubmittingRevisionRequest] = useState(false)
  const [submittingRevisionComplete, setSubmittingRevisionComplete] = useState(false)
  const [markingWorkComplete, setMarkingWorkComplete] = useState(false)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null)
  
  // Standard modal state
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    type: 'success' | 'error' | 'warning' | 'info' | 'confirm'
    title: string
    message: string
    onConfirm?: () => void
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  })
  
  const [pendingDeleteTask, setPendingDeleteTask] = useState<boolean>(false)
  const [pendingCancelTask, setPendingCancelTask] = useState<boolean>(false)
  const [expandedBidReviews, setExpandedBidReviews] = useState<string | null>(null)
  const [expandedBidBadges, setExpandedBidBadges] = useState<string | null>(null)

  useEffect(() => {
    loadTask()
    loadBids()
    loadReviews()
    loadProgressUpdates()
    checkUser()
  }, [taskId])

  // Handle return from payment - poll until DB reflects paid status
  useEffect(() => {
    const paymentParam = searchParams?.get('payment')
    if (paymentParam !== 'success') return

    console.log('[TaskPage] Returned from payment with success, polling for paid status...')
    setPaymentStatus('processing')
    let cancelled = false
    const pollIntervals = [2000, 3000, 5000, 5000, 5000]

    const poll = async (attempt: number) => {
      if (cancelled || attempt >= pollIntervals.length) {
        if (!cancelled) {
          loadTask()
          setPaymentStatus('processing')
        }
        return
      }
      const { data } = await supabase
        .from('tasks')
        .select('payment_status')
        .eq('id', taskId)
        .single()

      if (data?.payment_status === 'paid') {
        loadTask()
        setPaymentStatus('paid')
        const url = new URL(window.location.href)
        url.searchParams.delete('payment')
        url.searchParams.delete('token')
        url.searchParams.delete('PayerID')
        window.history.replaceState({}, '', url.toString())
        return
      }
      if (data?.payment_status === 'pending') {
        setPaymentStatus('processing')
      }
      setTimeout(() => poll(attempt + 1), pollIntervals[attempt])
    }

    poll(0)
    return () => { cancelled = true }
  }, [searchParams])

  // Update task userRatings when userRatings finish loading
  useEffect(() => {
    if (!task || !task.user || !task.created_by) return
    
    // Get user ratings from SQL function
    const ratingsMap = new Map(userRatings.map((r: any) => [r.reviewee_id, r]))
    const userRating = getUserRatingsById(task.created_by, ratingsMap)
    
    console.log('📊 Task Detail: Updating ratings for tasker:', {
      taskerId: task.created_by,
      userRatingsCount: userRatings.length,
      foundRating: userRating,
      currentRating: task.user.userRatings
    })
    
    // Only update if ratings weren't set before or if they've changed
    const currentRatings = task.user.userRatings
    const ratingsChanged = JSON.stringify(userRating) !== JSON.stringify(currentRatings)
    
    if (ratingsChanged) {
      console.log('📊 Task Detail: Updating task with ratings:', userRating)
      setTask({
        ...task,
        user: {
          ...task.user,
          userRatings: userRating || null
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRatings, task?.created_by])

  useEffect(() => {
    // Only redirect if we've finished loading and confirmed user is not logged in
    if (loading === false && !user && taskId) {
      // Redirect non-logged in users to login with redirect parameter
      router.push(`/login?redirect=/tasks/${taskId}`)
    }
  }, [loading, user, taskId, router])

  // Set up real-time subscription for new bids
  useEffect(() => {
    if (!taskId) return

    const channel = supabase
      .channel(`task-bids-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bids',
          filter: `task_id=eq.${taskId}`,
        },
        (payload) => {
          // Reload bids when a new bid is added
          loadBids()
          
          // If current user is the task owner, show notification
          if (task && user && task.created_by === user.id) {
            // Show visual notification
            setBidNotification(`New bid received on "${task.title}"!`)
            setTimeout(() => setBidNotification(null), 5000)
            
            // Request browser notification permission if not already granted
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('New Bid Received!', {
                body: `You have received a new bid on "${task.title}"`,
                icon: '/favicon.ico',
                tag: `bid-${payload.new.id}`,
              })
            } else if ('Notification' in window && Notification.permission === 'default') {
              // Request permission
              Notification.requestPermission().then((permission) => {
                if (permission === 'granted') {
                  new Notification('New Bid Received!', {
                    body: `You have received a new bid on "${task.title}"`,
                    icon: '/favicon.ico',
                    tag: `bid-${payload.new.id}`,
                  })
                }
              })
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [taskId, task, user])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    
    // Load user profile to check if they are a helper
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_helper')
        .eq('id', user.id)
        .single()
      setUserProfile(profile)
    } else {
      setUserProfile(null)
    }
  }

  const loadTask = async () => {
    try {
      // Check if user is admin
      const { data: { user } } = await supabase.auth.getUser()
      let isAdmin = false
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin'
      }

      let query = supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
      
      // Filter out hidden tasks for non-admins (but allow viewing if they created it or are assigned)
      if (!isAdmin && user) {
        query = query.or(`hidden_by_admin.eq.false,created_by.eq.${user.id},assigned_to.eq.${user.id}`)
      } else if (!isAdmin) {
        query = query.eq('hidden_by_admin', false)
      }

      const { data: taskData, error } = await query.single()

      if (error) throw error

      // If task is hidden and user is not admin/creator/assigned, show error
      if (taskData?.hidden_by_admin && !isAdmin && user && taskData.created_by !== user.id && taskData.assigned_to !== user.id) {
        router.push('/tasks')
        return
      }

      // Fetch profile and rating for task creator
      if (taskData) {
        const [profileResult, reviewsResult, imagesResult, completionPhotosResult, progressUpdatesResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, email, full_name, avatar_url')
            .eq('id', taskData.created_by)
            .single(),
          supabase
            .from('reviews')
            .select('rating')
            .eq('reviewee_id', taskData.created_by),
          supabase
            .from('task_images')
            .select('*')
            .eq('task_id', taskId)
            .order('display_order', { ascending: true }),
          supabase
            .from('task_completion_photos')
            .select('*')
            .eq('task_id', taskId)
            .order('created_at', { ascending: false }),
          taskData.status === 'in_progress'
            ? (supabase
                .from('task_progress_updates')
                .select('*, user:profiles(id, full_name, avatar_url)')
                .eq('task_id', taskId)
                .order('created_at', { ascending: false }) as any)
                .then((result: any) => {
                  // Handle case where table doesn't exist yet
                  if (result.error && (result.error.code === 'PGRST205' || result.error.message?.includes('Could not find the table'))) {
                    console.warn('task_progress_updates table does not exist. Please run: supabase/add_progress_tracking.sql')
                    return { data: [], error: null }
                  }
                  return result
                })
                .catch(() => ({ data: [], error: null }))
            : Promise.resolve({ data: [] })
        ])

        const profileData = profileResult.data
        const imagesData = imagesResult.data || []
        const completionPhotosData = completionPhotosResult.data || []
        const progressUpdatesData = progressUpdatesResult.data || []

        // Get user ratings from SQL function
        // The SQL function returns 'reviewee_id' as the user identifier
        let userRating = null
        if (userRatings.length > 0) {
          const ratingsMap = new Map(userRatings.map((r: any) => [r.reviewee_id, r]))
          userRating = getUserRatingsById(taskData.created_by, ratingsMap)
          console.log('📊 Task Detail loadTask: Found rating for tasker:', {
            taskerId: taskData.created_by,
            rating: userRating,
            userRatingsCount: userRatings.length
          })
        } else {
          console.log('📊 Task Detail loadTask: userRatings not loaded yet, will update via useEffect')
        }

        setTask({
          ...taskData,
          user: profileData ? {
            ...profileData,
            userRatings: userRating || null
          } : null,
          images: imagesData.length > 0 ? imagesData : undefined,
          completion_photos: completionPhotosData.length > 0 ? completionPhotosData : undefined,
          progress_updates: progressUpdatesData.length > 0 ? progressUpdatesData : undefined
        })
        
        if (progressUpdatesData.length > 0) {
          setProgressUpdates(progressUpdatesData)
        }
      }
    } catch (error) {
      console.error('Error loading task:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadBids = async () => {
    try {
      const { data: bidsData, error } = await supabase
        .from('bids')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Fetch profiles, ratings, badges, and recent reviews for bidders
      if (bidsData && bidsData.length > 0) {
        const bidderIds = Array.from(new Set(bidsData.map(b => b.user_id)))
        const [profilesResult, reviewsResult, recentReviewsResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, email, full_name, avatar_url, is_helper, profile_slug, badges, professions')
            .in('id', bidderIds),
          supabase
            .from('reviews')
            .select('reviewee_id, rating')
            .in('reviewee_id', bidderIds),
          // Fetch recent reviews with comments for preview
          supabase
            .from('reviews')
            .select('reviewee_id, reviewer_id, rating, comment, created_at')
            .in('reviewee_id', bidderIds)
            .not('comment', 'is', null)
            .order('created_at', { ascending: false })
            .limit(10) // Get top 10 recent reviews across all bidders
        ])

        const profilesData = profilesResult.data || []
        const reviewsData = reviewsResult.data || []
        const recentReviewsData = recentReviewsResult.data || []

        // Calculate average ratings for each bidder
        const ratingsByUser: Record<string, { avg: number; count: number }> = {}
        reviewsData.forEach(review => {
          if (!ratingsByUser[review.reviewee_id]) {
            ratingsByUser[review.reviewee_id] = { avg: 0, count: 0 }
          }
          ratingsByUser[review.reviewee_id].count++
          ratingsByUser[review.reviewee_id].avg += review.rating
        })

        Object.keys(ratingsByUser).forEach(userId => {
          const data = ratingsByUser[userId]
          data.avg = data.avg / data.count
        })

        // Group recent reviews by user (max 3 per user)
        const recentReviewsByUser: Record<string, any[]> = {}
        recentReviewsData.forEach(review => {
          if (!recentReviewsByUser[review.reviewee_id]) {
            recentReviewsByUser[review.reviewee_id] = []
          }
          if (recentReviewsByUser[review.reviewee_id].length < 3) {
            recentReviewsByUser[review.reviewee_id].push(review)
          }
        })

        // Map profiles, ratings, and reviews to bids
        const bidsWithProfiles = bidsData.map(bid => {
          const user = profilesData.find(p => p.id === bid.user_id)
          const rating = ratingsByUser[bid.user_id]
          const recentReviews = recentReviewsByUser[bid.user_id] || []
          return {
            ...bid,
            user: user ? { 
              ...user, 
              rating: rating ? rating.avg : null, 
              reviewCount: rating?.count || 0,
              recentReviews 
            } : undefined
          }
        })

        setBids(bidsWithProfiles)
      } else {
        setBids([])
      }
    } catch (error) {
      console.error('Error loading bids:', error)
    }
  }
  const loadReviews = async () => {
    try {
      const { data: reviewsData, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })

      if (error) throw error

      if (reviewsData && reviewsData.length > 0) {
        const profileIds = Array.from(
          new Set(reviewsData.flatMap((review) => [review.reviewer_id, review.reviewee_id]))
        )

        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email, full_name, avatar_url')
          .in('id', profileIds)

        const reviewsWithProfiles = reviewsData.map((review) => ({
          ...review,
          reviewer: profilesData?.find((p) => p.id === review.reviewer_id),
          reviewee: profilesData?.find((p) => p.id === review.reviewee_id),
        }))

        setReviews(reviewsWithProfiles)
      } else {
        setReviews([])
      }
    } catch (error) {
      console.error('Error loading reviews:', error)
    }
  }

  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      router.push('/login')
      return
    }

    // Check if user is a helper - REQUIRED to bid
    if (!userProfile?.is_helper) {
      setModalState({
        isOpen: true,
        type: 'warning',
        title: 'Helper Role Required',
        message: 'You must enable the Helper role in your profile to bid on tasks. Go to your Profile page and enable the Helper role to start bidding.',
      })
      return
    }

    // Check bid message for contact information (email/phone) - block for safety
    if (bidMessage) {
      const contentCheck = checkForContactInfo(bidMessage)
      if (!contentCheck.isClean) {
        setModalState({
          isOpen: true,
          type: 'warning',
          title: 'Contact Information Detected',
          message: contentCheck.message,
        })
        return
      }
    }

    setSubmittingBid(true)
    setBidSubmitStatus('Submitting your bid...')
    try {
      const { error } = await supabase.from('bids').insert({
        task_id: taskId,
        user_id: user.id,
        amount: parseFloat(bidAmount),
        message: bidMessage,
        status: 'pending',
      })

      if (error) throw error

      // Send email notification to task owner
      if (task && task.user) {
        try {
          setBidSubmitStatus('Bid submitted. Sending notification...')
          console.log('📧 Preparing to send new bid email notification...')
          
          // Get bidder's full name
          const { data: bidderProfile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', user.id)
            .single()

          console.log('📧 Email notification details:', {
            taskOwnerEmail: task.user.email,
            taskOwnerName: task.user.full_name || task.user.email,
            taskTitle: task.title,
            bidderName: bidderProfile?.full_name || bidderProfile?.email || user.email,
            bidAmount: parseFloat(bidAmount),
            taskId: taskId,
          })

          const emailResponse = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'new_bid',
              taskOwnerEmail: task.user.email,
              taskOwnerName: task.user.full_name || task.user.email,
              taskTitle: task.title,
              bidderName: bidderProfile?.full_name || bidderProfile?.email || user.email,
              bidAmount: parseFloat(bidAmount),
              taskId: taskId,
            }),
          })

          const emailResult = await emailResponse.json()
          if (emailResponse.ok) {
            console.log('✅ Email notification sent successfully:', emailResult)
          } else {
            console.error('❌ Email notification failed:', emailResult)
          }
        } catch (emailError) {
          console.error('❌ Error sending email notification:', emailError)
          // Don't fail the bid submission if email fails
        }
      } else {
        console.warn('⚠️ Cannot send email notification: task or task.user is missing', { task, taskUser: task?.user })
      }

      setBidAmount('')
      setBidMessage('')
      setBidSubmitStatus('Bid submitted successfully.')
      loadBids()
      setTimeout(() => setBidSubmitStatus(null), 4000)
    } catch (error: any) {
      setBidSubmitStatus(null)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'Error submitting bid',
      })
    } finally {
      setSubmittingBid(false)
    }
  }

  const handleAcceptBid = async (bidId: string) => {
    if (!user || !task || task.created_by !== user.id || acceptingBidId) return

    setAcceptingBidId(bidId)
    setAcceptBidStatus('Accepting bid and updating task...')
    try {
      // Update bid status
      await supabase
        .from('bids')
        .update({ status: 'accepted' })
        .eq('id', bidId)

      // Reject other bids
      await supabase
        .from('bids')
        .update({ status: 'rejected' })
        .eq('task_id', taskId)
        .neq('id', bidId)

      // Update task with accepted bid amount as budget
      const acceptedBid = bids.find(b => b.id === bidId)
      if (acceptedBid) {
        await supabase
          .from('tasks')
          .update({
            status: 'in_progress',
            assigned_to: acceptedBid.user_id,
            budget: acceptedBid.amount, // Set budget to accepted bid amount for payment
          })
          .eq('id', taskId)

        // Add progress update so helper sees it on the task page
        try {
          const helperName = acceptedBid.user?.full_name?.split(' ')[0] || 'Helper'
          const taskerName = task?.user?.full_name?.split(' ')[0] || 'Task owner'
          const progressMessage = `🎉 Congratulations! ${taskerName} has accepted ${helperName}'s bid of €${acceptedBid.amount.toFixed(2)}. The task is now in progress!`
          
          // Try with update_type first, fall back without it
          const { error: err1 } = await supabase
            .from('task_progress_updates')
            .insert({
              task_id: taskId,
              user_id: user.id,
              message: progressMessage,
              update_type: 'bid_accepted',
            })
          
          if (err1 && (err1.message?.includes('update_type') || err1.code === '42703')) {
            await supabase
              .from('task_progress_updates')
              .insert({
                task_id: taskId,
                user_id: user.id,
                message: progressMessage,
              })
          }
        } catch (progressError) {
          console.error('Error adding progress update:', progressError)
          // Don't fail if progress update fails
        }

        // Send email notifications
        try {
          setAcceptBidStatus('Bid accepted. Notifying helpers...')
          // Email to accepted bidder
          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'bid_accepted',
              bidderEmail: acceptedBid.user?.email || '',
              bidderName: acceptedBid.user?.full_name || acceptedBid.user?.email || 'User',
              taskTitle: task?.title || '',
              taskOwnerName: task?.user?.full_name || task?.user?.email || 'Task Owner',
              bidAmount: acceptedBid.amount,
              taskId: taskId,
            }),
          })

          // Email to rejected bidders
          const rejectedBids = bids.filter(b => b.id !== bidId && b.status === 'pending')
          for (const rejectedBid of rejectedBids) {
            await fetch('/api/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'bid_rejected',
                bidderEmail: rejectedBid.user?.email || '',
                bidderName: rejectedBid.user?.full_name || rejectedBid.user?.email || 'User',
                taskTitle: task?.title || '',
                taskId: taskId,
              }),
            })
          }
        } catch (emailError) {
          console.error('Error sending email notifications:', emailError)
          // Don't fail the bid acceptance if email fails
        }

        // Restore previous behavior: immediately prompt task owner to pay after accepting a bid.
        // This keeps the "accept -> pay" flow instead of waiting until completion time.
        try {
          setAcceptBidStatus('Bid accepted. Redirecting to payment...')
          const { data: { session } } = await supabase.auth.getSession()
          const checkoutResponse = await fetch('/api/payments/create-checkout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
            },
            body: JSON.stringify({
              taskId,
              returnUrl: `${window.location.origin}/tasks/${taskId}?payment=success`,
              cancelUrl: `${window.location.origin}/tasks/${taskId}?payment=cancelled`,
            }),
          })

          const checkoutData = await checkoutResponse.json()
          if (checkoutResponse.ok) {
            const redirectUrl = checkoutData.redirectUrl || checkoutData.checkoutUrl || checkoutData.next_action?.url
            const intentId = checkoutData.id || checkoutData.paymentIntentId || checkoutData.sessionId
            if (redirectUrl) {
              window.location.href = redirectUrl
              return
            }
            if (intentId) {
              const params = new URLSearchParams()
              params.set('taskId', taskId)
              params.set('amount', String(checkoutData.amount ?? ''))
              if (checkoutData.clientSecret) {
                params.set('clientSecret', checkoutData.clientSecret)
              }
              window.location.href = `/checkout/${intentId}?${params.toString()}`
              return
            }
          } else {
            console.error('Auto checkout failed after bid acceptance:', checkoutData)
          }
        } catch (checkoutError) {
          console.error('Error starting checkout after bid acceptance:', checkoutError)
          // Keep bid acceptance successful; user can still click Pay button manually.
        }
      }

      loadTask()
      loadBids()
      setAcceptBidStatus('Bid accepted successfully.')
      setTimeout(() => setAcceptBidStatus(null), 4000)
    } catch (error) {
      console.error('Error accepting bid:', error)
      setAcceptBidStatus(null)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to accept bid. Please try again.',
      })
    } finally {
      setAcceptingBidId(null)
    }
  }

  const handleCancelTask = async () => {
    if (!user || !task || task.assigned_to !== user.id) {
      setModalState({
        isOpen: true,
        type: 'warning',
        title: 'Permission Denied',
        message: 'You can only cancel tasks you are assigned to.',
      })
      return
    }

    setPendingCancelTask(true)
    setModalState({
      isOpen: true,
      type: 'confirm',
      title: 'Confirm Cancellation',
      message: 'Are you sure you want to cancel this task? This will set the task back to open status.',
      onConfirm: () => {
        setModalState({ ...modalState, isOpen: false })
        performCancelTask()
      },
    })
  }

  const performCancelTask = async () => {

    try {
      // Update task status back to open and clear assigned_to
      const { error: taskError } = await supabase
        .from('tasks')
        .update({ 
          status: 'open',
          assigned_to: null
        })
        .eq('id', taskId)

      if (taskError) throw taskError

      // Reject the accepted bid
      const { error: bidError } = await supabase
        .from('bids')
        .update({ status: 'rejected' })
        .eq('task_id', taskId)
        .eq('status', 'accepted')

      if (bidError) throw bidError

      // Send email notification to task owner
      if (task && task.user) {
        try {
          // Get tasker name
          const { data: taskerProfile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', task.assigned_to)
            .single()

          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'task_cancelled',
              taskOwnerEmail: task.user.email,
              taskOwnerName: task.user.full_name || task.user.email,
              taskerName: taskerProfile?.full_name || taskerProfile?.email || 'Tasker',
              taskTitle: task.title,
              taskId: taskId,
            }),
          })
        } catch (emailError) {
          console.error('Error sending email notification:', emailError)
        }
      }

      loadTask()
      loadBids()
      setPendingCancelTask(false)
      setModalState({
        isOpen: true,
        type: 'success',
        title: 'Task Cancelled',
        message: 'Task cancelled successfully. The task is now open for new bids.',
      })
    } catch (error: any) {
      console.error('Error cancelling task:', error)
      setPendingCancelTask(false)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Error cancelling task',
      })
    }
  }

  const handleMarkCompleted = async () => {
    if (!user || !task || task.created_by !== user.id) return

    setShowCompleteModal(true)
  }

  const confirmMarkCompleted = async () => {
    if (!user || !task || task.created_by !== user.id) return

    // Check if payment has been made
    if (task.payment_status !== 'paid') {
      setShowCompleteModal(false)
      setModalState({
        isOpen: true,
        type: task.payment_status === 'pending' || paymentStatus === 'processing' ? 'info' : 'warning',
        title: task.payment_status === 'pending' || paymentStatus === 'processing' ? 'Payment In Progress' : 'Payment Required',
        message:
          task.payment_status === 'pending' || paymentStatus === 'processing'
            ? 'Your payment is being processed. Please wait for payment to complete, then mark the task as completed.'
            : 'Please complete payment before marking the task as completed.',
      })
      return
    }

    setCompletingTask(true)
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'completed' })
        .eq('id', taskId)

      if (error) throw error

      // Trigger payout to helper if payment was made and helper is assigned
      if (task.assigned_to && task.budget && task.payment_status === 'paid') {
        try {
          // Get helper's payout details from profile (IBAN for Airwallex, paypal_email/email for PayPal)
          const { data: helperProfile } = await supabase
            .from('profiles')
            .select('iban, paypal_email, full_name, email')
            .eq('id', task.assigned_to)
            .single()

          const hasPayoutMethod = helperProfile?.iban ?? helperProfile?.paypal_email ?? helperProfile?.email
          if (hasPayoutMethod && helperProfile) {
            // Fetch platform fee percentage from settings
            let platformFeePercent = 10 // Default 10%
            const { data: feeSettings } = await supabase
              .from('platform_settings')
              .select('key, value')
              .eq('key', 'platform_fee_percent')
              .single()
            
            if (feeSettings?.value) {
              platformFeePercent = parseFloat(feeSettings.value) || 10
            }

            // Calculate payout amount after platform fee deduction
            const platformFee = task.budget * (platformFeePercent / 100)
            const payoutAmount = task.budget - platformFee

            console.log('Creating payout for helper:', task.assigned_to)
            console.log(`Task budget: €${task.budget}, Platform fee (${platformFeePercent}%): €${platformFee.toFixed(2)}, Payout: €${payoutAmount.toFixed(2)}`)
            
            // Always pass simulatePayout: true - the API will only simulate if NOT in production
            const { data: { session: payoutSession } } = await supabase.auth.getSession()
            const payoutResponse = await fetch('/api/payments/create-payout', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(payoutSession?.access_token ? { 'Authorization': `Bearer ${payoutSession.access_token}` } : {}),
              },
              body: JSON.stringify({
                taskId: task.id,
                helperId: task.assigned_to,
                amount: payoutAmount, // Payout after platform fee deduction
                currency: 'EUR',
                iban: helperProfile.iban,
                paypalEmail: helperProfile.paypal_email ?? helperProfile.email,
                accountHolderName: helperProfile.full_name || 'Helper',
                idempotencyKey: `payout-${task.id}-${Date.now()}`,
                simulatePayout: true, // API will only simulate in sandbox/demo mode
              }),
            })

            const payoutData = await payoutResponse.json()

            if (!payoutResponse.ok) {
              console.error('Payout creation failed:', payoutData.error)
              // Add progress update about payout failure
              await supabase.from('task_progress_updates').insert({
                task_id: taskId,
                user_id: user.id,
                message: `⚠️ Task completed but payout could not be processed. Please contact support.`,
              })
            } else {
              console.log('Payout created successfully:', payoutData.payoutId ?? payoutData.id, `Amount: €${payoutAmount.toFixed(2)}`)
              
              // Add progress update about successful payout
              await supabase.from('task_progress_updates').insert({
                task_id: taskId,
                user_id: user.id,
                message: `💰 Task completed! Payout of €${payoutAmount.toFixed(2)} has been initiated to ${helperProfile.full_name || 'helper'}. (Platform fee: €${platformFee.toFixed(2)})`,
              })

              // Send payout notification email to helper
              try {
                await fetch('/api/send-email', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    type: 'payout_initiated',
                    recipientEmail: helperProfile.email || '',
                    recipientName: helperProfile.full_name || 'Helper',
                    taskTitle: task.title,
                    payoutAmount: payoutAmount.toFixed(2),
                    platformFee: platformFee.toFixed(2),
                    taskId: taskId,
                  }),
                })
              } catch (emailErr) {
                console.error('Error sending payout email:', emailErr)
              }
            }
          } else {
            console.warn('Helper does not have payout method configured')
            await supabase.from('task_progress_updates').insert({
              task_id: taskId,
              user_id: user.id,
              message: `✅ Task completed! However, payout could not be processed - helper needs to add their payout details (bank or PayPal) in their profile settings.`,
            })
          }
        } catch (payoutError: any) {
          console.error('Error creating payout:', payoutError)
          // Don't fail the task completion
        }
      }

      // Send email notification to task owner
      if (task && task.user) {
        try {
          // Get tasker name
          const { data: taskerProfile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', task.assigned_to)
            .single()

          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'task_completed',
              taskOwnerEmail: task.user.email,
              taskOwnerName: task.user.full_name || task.user.email,
              taskerName: taskerProfile?.full_name || taskerProfile?.email || 'Tasker',
              taskTitle: task.title,
              taskId: taskId,
            }),
          })
        } catch (emailError) {
          console.error('Error sending email notification:', emailError)
        }
      }

      setShowCompleteModal(false)
      await loadTask()
      await loadProgressUpdates() // Reload progress updates to show payout message
      
      // Show success modal with payout info
      setModalState({
        isOpen: true,
        type: 'success',
        title: 'Task Completed! 🎉',
        message: task.budget 
          ? `Great job! The payout has been initiated to your helper. You can now leave a review for each other.`
          : `Task marked as completed. You can now leave a review for each other.`,
      })
      
      // Show review reminder after task is completed
      setShowReviewReminder(true)
      // Scroll to reviews section after a short delay
      setTimeout(() => {
        const reviewsSection = document.getElementById('reviews-section')
        if (reviewsSection) {
          reviewsSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 500)
    } catch (error) {
      console.error('Error marking task as completed:', error)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Error marking task as completed',
      })
    } finally {
      setCompletingTask(false)
    }
  }

  const handleUploadCompletionPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user || !task || task.assigned_to !== user.id) {
      setModalState({
        isOpen: true,
        type: 'warning',
        title: 'Permission Denied',
        message: 'You can only upload completion photos for tasks you are assigned to.',
      })
      return
    }

    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      if (authError || !authUser) {
        throw new Error('You must be logged in to upload a photo')
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `completion-${taskId}-${Date.now()}.${fileExt}`
      const filePath = `${authUser.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

      // Save completion photo to database
      const { error: dbError } = await supabase
        .from('task_completion_photos')
        .insert({
          task_id: taskId,
          image_url: data.publicUrl,
          uploaded_by: authUser.id
        })

      if (dbError) throw dbError

      loadTask()
      setModalState({
        isOpen: true,
        type: 'success',
        title: 'Photo Uploaded',
        message: 'Completion photo uploaded successfully',
      })
    } catch (error: any) {
      console.error('Error uploading completion photo:', error)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'Error uploading completion photo',
      })
    } finally {
      if (event.target) {
        event.target.value = ''
      }
    }
  }

  const loadProgressUpdates = async () => {
    if (!taskId) return
    
    try {
      const { data, error } = await supabase
        .from('task_progress_updates')
        .select('*, user:profiles(id, full_name, avatar_url)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })

      if (error) {
        // If table doesn't exist, silently return empty array
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
          console.warn('task_progress_updates table does not exist. Please run the migration: supabase/add_progress_tracking.sql')
          setProgressUpdates([])
          return
        }
        throw error
      }
      setProgressUpdates(data || [])
    } catch (error) {
      console.error('Error loading progress updates:', error)
      setProgressUpdates([])
    }
  }

  const handleProgressPhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user || !task || task.assigned_to !== user.id) {
      setModalState({
        isOpen: true,
        type: 'warning',
        title: 'Permission Denied',
        message: 'You can only add progress updates for tasks you are assigned to.',
      })
      return
    }

    setUploadingProgressPhoto(true)
    try {
      // Compress image before upload (1200x1200 max, ~100-200KB instead of 3-5MB)
      const compressedImage = await compressTaskImage(file)
      
      // Use appropriate extension based on whether compression succeeded
      const isCompressed = compressedImage.type === 'image/jpeg'
      const ext = isCompressed ? 'jpg' : (file.name.split('.').pop() || 'jpg')
      const fileName = `progress-${taskId}-${Date.now()}.${ext}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, compressedImage, { 
          upsert: true,
          contentType: compressedImage.type || 'image/jpeg'
        })

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

      setProgressPhoto(data.publicUrl)
    } catch (error: any) {
      console.error('Error uploading progress photo:', error)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'Error uploading photo',
      })
    } finally {
      setUploadingProgressPhoto(false)
      if (event.target) {
        event.target.value = ''
      }
    }
  }

  const handleAddProgressUpdate = async () => {
    if (!user || !task || task.assigned_to !== user.id) {
      setModalState({
        isOpen: true,
        type: 'warning',
        title: 'Permission Denied',
        message: 'You can only add progress updates for tasks you are assigned to.',
      })
      return
    }

    if (!newProgressMessage.trim() && !progressPhoto) {
      setModalState({
        isOpen: true,
        type: 'warning',
        title: 'Missing Information',
        message: 'Please add a message or photo',
      })
      return
    }

    // Check progress message for contact information (email/phone) - block for safety
    if (newProgressMessage.trim()) {
      const contentCheck = checkForContactInfo(newProgressMessage)
      if (!contentCheck.isClean) {
        setModalState({
          isOpen: true,
          type: 'warning',
          title: 'Contact Information Detected',
          message: contentCheck.message,
        })
        return
      }
    }

    const progressMessage = newProgressMessage.trim()
    let shouldSendProgressEmail = true
    const emailThrottleMinutes = 5

    // Throttle email notifications to avoid spamming the task owner.
    try {
      const { data: latestUpdate } = await supabase
        .from('task_progress_updates')
        .select('created_at')
        .eq('task_id', taskId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (latestUpdate?.created_at) {
        const lastUpdateTs = new Date(latestUpdate.created_at).getTime()
        const timeSinceLastUpdateMs = Date.now() - lastUpdateTs
        if (timeSinceLastUpdateMs < emailThrottleMinutes * 60 * 1000) {
          shouldSendProgressEmail = false
        }
      }
    } catch (throttleError) {
      console.warn('Could not evaluate progress email throttle, proceeding without throttle:', throttleError)
    }

    setAddingProgressUpdate(true)
    try {
      const { error } = await supabase
        .from('task_progress_updates')
        .insert({
          task_id: taskId,
          user_id: user.id,
          message: progressMessage || null,
          image_url: progressPhoto || null,
        })

      if (error) {
        // If table doesn't exist, show helpful message
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
          setModalState({
            isOpen: true,
            type: 'warning',
            title: 'Setup Required',
            message: 'Progress tracking is not set up yet. Please run the migration: supabase/add_progress_tracking.sql',
          })
          return
        }
        throw error
      }

      setNewProgressMessage('')
      setProgressPhoto(null)
      await loadProgressUpdates()
      await loadTask()

      if (task.user?.email && shouldSendProgressEmail) {
        try {
          const { data: helperProfile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', user.id)
            .single()

          const helperName = helperProfile?.full_name || helperProfile?.email || user.email || 'Helper'
          const rawPreview = progressMessage || (progressPhoto ? 'Added a new photo update.' : 'Added a task update.')
          const progressPreview = rawPreview.length > 140 ? `${rawPreview.slice(0, 137)}...` : rawPreview

          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'task_progress_update',
              taskOwnerEmail: task.user.email,
              taskOwnerName: task.user.full_name || task.user.email,
              helperName,
              taskTitle: task.title,
              progressPreview,
              taskId,
            }),
          })
        } catch (emailError) {
          console.error('Error sending task progress update email:', emailError)
        }
      }
    } catch (error: any) {
      console.error('Error adding progress update:', error)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'Error adding progress update',
      })
    } finally {
      setAddingProgressUpdate(false)
    }
  }

  const handleRevisionRequestPhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user || !task || task.created_by !== user.id || task.status !== 'in_progress') {
      setModalState({
        isOpen: true,
        type: 'warning',
        title: 'Permission Denied',
        message: 'Only the task owner can add revision requests while a task is in progress.',
      })
      return
    }

    setUploadingRevisionRequestPhoto(true)
    try {
      const compressedImage = await compressTaskImage(file)
      const isCompressed = compressedImage.type === 'image/jpeg'
      const ext = isCompressed ? 'jpg' : (file.name.split('.').pop() || 'jpg')
      const fileName = `revision-${taskId}-${Date.now()}.${ext}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, compressedImage, {
          upsert: true,
          contentType: compressedImage.type || 'image/jpeg',
        })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('images').getPublicUrl(filePath)
      setRevisionRequestPhoto(data.publicUrl)
    } catch (error: any) {
      console.error('Error uploading revision request photo:', error)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'Error uploading revision photo',
      })
    } finally {
      setUploadingRevisionRequestPhoto(false)
      if (event.target) event.target.value = ''
    }
  }

  const handleRequestRevision = async () => {
    if (!user || !task || task.created_by !== user.id || task.status !== 'in_progress') {
      setModalState({
        isOpen: true,
        type: 'warning',
        title: 'Permission Denied',
        message: 'Only the task owner can request revisions while a task is in progress.',
      })
      return
    }

    const trimmedMessage = revisionRequestMessage.trim()
    if (!trimmedMessage && !revisionRequestPhoto) {
      setModalState({
        isOpen: true,
        type: 'warning',
        title: 'Missing Information',
        message: 'Please add a revision message or attach a photo.',
      })
      return
    }

    if (trimmedMessage) {
      const contentCheck = checkForContactInfo(trimmedMessage)
      if (!contentCheck.isClean) {
        setModalState({
          isOpen: true,
          type: 'warning',
          title: 'Contact Information Detected',
          message: contentCheck.message,
        })
        return
      }
    }

    setSubmittingRevisionRequest(true)
    try {
      const revisionMessage = trimmedMessage
        ? `🔁 Revision requested by task owner: ${trimmedMessage}`
        : '🔁 Revision requested by task owner. Please review the attached photo and update the task.'

      const { error: err1 } = await supabase
        .from('task_progress_updates')
        .insert({
          task_id: task.id,
          user_id: user.id,
          message: revisionMessage,
          image_url: revisionRequestPhoto || null,
          update_type: 'revision_requested',
        })

      if (err1) {
        if (err1.message?.includes('update_type') || err1.code === '42703') {
          const { error: err2 } = await supabase
            .from('task_progress_updates')
            .insert({
              task_id: task.id,
              user_id: user.id,
              message: revisionMessage,
              image_url: revisionRequestPhoto || null,
            })
          if (err2) throw err2
        } else {
          throw err1
        }
      }

      if (task.assigned_to) {
        try {
          const { data: helperProfile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', task.assigned_to)
            .single()

          if (helperProfile?.email) {
            const requestPreviewBase = trimmedMessage || (revisionRequestPhoto ? 'Please review the attached photo and update the task.' : 'Please review and update the task.')
            const requestPreview = requestPreviewBase.length > 140 ? `${requestPreviewBase.slice(0, 137)}...` : requestPreviewBase
            const taskOwnerName = task.user?.full_name || task.user?.email || user.email || 'Task Owner'

            await fetch('/api/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'revision_requested',
                recipientEmail: helperProfile.email,
                recipientName: helperProfile.full_name || helperProfile.email,
                taskOwnerName,
                taskTitle: task.title,
                requestPreview,
                taskId: task.id,
              }),
            })
          }
        } catch (emailError) {
          console.error('Error sending revision request email:', emailError)
        }
      }

      setRevisionRequestMessage('')
      setRevisionRequestPhoto(null)
      await loadProgressUpdates()
      setModalState({
        isOpen: true,
        type: 'success',
        title: 'Revision Requested',
        message: 'Your revision request was added and the helper has been notified by email.',
      })
    } catch (error: any) {
      console.error('Error requesting revision:', error)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to submit revision request.',
      })
    } finally {
      setSubmittingRevisionRequest(false)
    }
  }

  const handleRevisionCompletePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user || !task || task.assigned_to !== user.id || task.status !== 'in_progress') {
      setModalState({
        isOpen: true,
        type: 'warning',
        title: 'Permission Denied',
        message: 'Only the assigned helper can add a revision completion photo.',
      })
      return
    }

    setUploadingRevisionCompletePhoto(true)
    try {
      const compressedImage = await compressTaskImage(file)
      const isCompressed = compressedImage.type === 'image/jpeg'
      const ext = isCompressed ? 'jpg' : (file.name.split('.').pop() || 'jpg')
      const fileName = `revision-complete-${taskId}-${Date.now()}.${ext}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, compressedImage, {
          upsert: true,
          contentType: compressedImage.type || 'image/jpeg',
        })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('images').getPublicUrl(filePath)
      setRevisionCompletePhoto(data.publicUrl)
    } catch (error: any) {
      console.error('Error uploading revision completion photo:', error)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'Error uploading revision completion photo',
      })
    } finally {
      setUploadingRevisionCompletePhoto(false)
      if (event.target) event.target.value = ''
    }
  }

  const handlePayTask = async () => {
    if (!user || !task || task.created_by !== user.id) {
      setModalState({
        isOpen: true,
        type: 'warning',
        title: 'Permission Denied',
        message: 'You can only pay for tasks you created.',
      })
      return
    }

    // Get payment amount from task budget or accepted bid
    const acceptedBid = bids.find(b => b.status === 'accepted')
    const paymentAmount = task.budget || acceptedBid?.amount

    if (!paymentAmount || paymentAmount <= 0) {
      setModalState({
        isOpen: true,
        type: 'warning',
        title: 'No Budget Set',
        message: 'This task does not have a budget set. Please contact the helper to agree on a price.',
      })
      return
    }

    setProcessingPayment(true)
    setPaymentStatus(null)

    try {
      const taskId = task.id

      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          taskId,
          returnUrl: `${window.location.origin}/tasks/${taskId}?payment=success`,
          cancelUrl: `${window.location.origin}/tasks/${taskId}?payment=cancelled`,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Payment API error details:', data)
        const errorMessage = data.details?.message || data.details?.error || data.error || 'Failed to create payment'
        throw new Error(errorMessage)
      }

      console.log('Checkout created:', data)

      // Update task with payment intent/session ID
      const intentId = data.id || data.paymentIntentId || data.sessionId
      if (intentId) {
        try {
          await supabase
            .from('tasks')
            .update({
              payment_status: 'pending',
              payment_intent_id: intentId,
            })
            .eq('id', task.id)
        } catch (dbError) {
          console.error('Error updating task payment status:', dbError)
        }
      }

      // Redirect: use redirectUrl, next_action.url, or build our checkout page URL
      const redirectUrl = data.redirectUrl || data.checkoutUrl || data.next_action?.url
      if (redirectUrl) {
        window.location.href = redirectUrl
      } else if (intentId) {
        const params = new URLSearchParams()
        params.set('taskId', task.id)
        params.set('amount', String(data.amount ?? ''))
        if (data.clientSecret) {
          params.set('clientSecret', data.clientSecret)
        }
        window.location.href = `/checkout/${intentId}?${params.toString()}`
      } else {
        throw new Error('No redirect URL or checkout ID received')
      }
    } catch (error: any) {
      console.error('Payment error:', error)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Payment Error',
        message: error.message || 'Failed to create payment. Please try again.',
      })
    } finally {
      setProcessingPayment(false)
    }
  }

  const handleMarkRevisionComplete = async () => {
    if (!user || !task || task.assigned_to !== user.id || task.status !== 'in_progress') {
      setModalState({
        isOpen: true,
        type: 'warning',
        title: 'Permission Denied',
        message: 'Only the assigned helper can mark a revision as complete.',
      })
      return
    }

    if (submittingRevisionComplete) return

    setSubmittingRevisionComplete(true)
    try {
      const trimmedMessage = revisionCompleteMessage.trim()
      if (trimmedMessage) {
        const contentCheck = checkForContactInfo(trimmedMessage)
        if (!contentCheck.isClean) {
          setModalState({
            isOpen: true,
            type: 'warning',
            title: 'Contact Information Detected',
            message: contentCheck.message,
          })
          return
        }
      }
      const revisionCompleteUpdateMessage = trimmedMessage
        ? `✅ Helper has completed the requested revision and marked the task ready for final review: ${trimmedMessage}`
        : '✅ Helper has completed the requested revision and marked the task ready for final review.'

      const { error: err1 } = await supabase
        .from('task_progress_updates')
        .insert({
          task_id: task.id,
          user_id: user.id,
          message: revisionCompleteUpdateMessage,
          image_url: revisionCompletePhoto || null,
          update_type: 'revision_completed',
        })

      if (err1) {
        if (err1.message?.includes('update_type') || err1.code === '42703') {
          const { error: err2 } = await supabase
            .from('task_progress_updates')
            .insert({
              task_id: task.id,
              user_id: user.id,
              message: revisionCompleteUpdateMessage,
              image_url: revisionCompletePhoto || null,
            })
          if (err2) throw err2
        } else {
          throw err1
        }
      }

      if (task.user?.email) {
        try {
          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'revision_completed',
              recipientEmail: task.user.email,
              recipientName: task.user.full_name || task.user.email,
              helperName: user.full_name || user.email || 'Helper',
              taskTitle: task.title,
              completionSummary: trimmedMessage
                ? (trimmedMessage.length > 240 ? `${trimmedMessage.slice(0, 237)}...` : trimmedMessage)
                : '',
              taskId: task.id,
            }),
          })
        } catch (emailError) {
          console.error('Error sending revision completed email:', emailError)
        }
      }

      await loadProgressUpdates()
      await loadTask()
      setRevisionCompletePhoto(null)
      setRevisionCompleteMessage('')
      setModalState({
        isOpen: true,
        type: 'success',
        title: 'Revision Marked Complete',
        message: 'The task owner has been notified by email and this action has been added to the task timeline.',
      })
    } catch (error: any) {
      console.error('Error marking revision complete:', error)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to mark revision as complete.',
      })
    } finally {
      setSubmittingRevisionComplete(false)
    }
  }

  const handleHelperMarkComplete = async (skipCompletionPhotoPrompt = false) => {
    if (!user || !task || task.assigned_to !== user.id) {
      setModalState({
        isOpen: true,
        type: 'warning',
        title: 'Permission Denied',
        message: 'Only the assigned helper can mark work as complete.',
      })
      return
    }

    if (markingWorkComplete) return

    const hasCompletionPhoto = Boolean(task.completion_photos && task.completion_photos.length > 0)
    if (!skipCompletionPhotoPrompt && !hasCompletionPhoto) {
      setModalState({
        isOpen: true,
        type: 'confirm',
        title: 'Add Completion Photo?',
        message: 'Before marking work complete, we recommend uploading at least one completion photo so the task owner can quickly review your work.\n\nYou can still continue without a photo.',
        onConfirm: () => {
          setModalState({ ...modalState, isOpen: false })
          handleHelperMarkComplete(true)
        },
      })
      return
    }

    setMarkingWorkComplete(true)
    try {
      // Add a progress update to notify the task owner
      // Try with update_type first, fall back without it if column doesn't exist
      let progressError = null
      
      const { error: err1 } = await supabase
        .from('task_progress_updates')
        .insert({
          task_id: task.id,
          user_id: user.id,
          message: '✅ Helper has marked the work as COMPLETE and ready for review. Task owner can now confirm completion to process payment.',
          update_type: 'work_complete',
        })
      
      if (err1) {
        // If update_type column doesn't exist, try without it
        if (err1.message?.includes('update_type') || err1.code === '42703') {
          console.warn('update_type column not found, inserting without it')
          const { error: err2 } = await supabase
            .from('task_progress_updates')
            .insert({
              task_id: task.id,
              user_id: user.id,
              message: '✅ Helper has marked the work as COMPLETE and ready for review. Task owner can now confirm completion to process payment.',
            })
          progressError = err2
        } else {
          progressError = err1
        }
      }

      if (progressError) throw progressError

      // Send notification to task owner
      if (task.user?.email) {
        try {
          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'helper_finished',
              recipientEmail: task.user.email,
              recipientName: task.user.full_name || task.user.email,
              taskTitle: task.title,
              helperName: user.full_name || user.email || 'Helper',
              taskId: task.id,
            }),
          })
        } catch (emailError) {
          console.error('Error sending notification:', emailError)
        }
      }

      setModalState({
        isOpen: true,
        type: 'success',
        title: 'Work Marked Complete!',
        message: 'The task owner has been notified that your work is ready for review. Once they confirm, your payment will be processed.',
      })

      await loadProgressUpdates()
      await loadTask()
    } catch (error: any) {
      console.error('Error marking work complete:', error)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to mark work as complete.',
      })
    } finally {
      setMarkingWorkComplete(false)
    }
  }

  const handleDeleteTask = async () => {
    if (!user || !task || task.created_by !== user.id) {
      setModalState({
        isOpen: true,
        type: 'warning',
        title: 'Permission Denied',
        message: 'You can only delete tasks you created.',
      })
      return
    }

    setPendingDeleteTask(true)
    setModalState({
      isOpen: true,
      type: 'confirm',
      title: 'Confirm Deletion',
      message: 'Are you sure you want to delete this task? This action cannot be undone and will also delete all bids and conversations related to this task.',
      onConfirm: () => {
        setModalState({ ...modalState, isOpen: false })
        performDeleteTask()
      },
    })
  }

  const performDeleteTask = async () => {

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) {
        console.error('Delete error:', error)
        throw error
      }

      // Redirect immediately after successful delete
      setPendingDeleteTask(false)
      router.push('/tasks')
      router.refresh()
    } catch (error: any) {
      console.error('Error deleting task:', error)
      setPendingDeleteTask(false)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: `Error deleting task: ${error.message || 'You may not have permission to delete this task. Make sure you are the task owner and that the delete policy is set up in the database.'}`,
      })
    }
  }

  const handleArchiveTask = async () => {
    if (!user || !task || task.created_by !== user.id) {
      setModalState({
        isOpen: true,
        type: 'warning',
        title: 'Permission Denied',
        message: 'You can only archive tasks you created.',
      })
      return
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ archived: true })
        .eq('id', taskId)

      if (error) throw error

      loadTask()
      setModalState({
        isOpen: true,
        type: 'success',
        title: 'Task Archived',
        message: 'Task archived successfully',
      })
    } catch (error: any) {
      console.error('Error archiving task:', error)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Error archiving task',
      })
    }
  }

  const handleUnarchiveTask = async () => {
    if (!user || !task || task.created_by !== user.id) {
      setModalState({
        isOpen: true,
        type: 'warning',
        title: 'Permission Denied',
        message: 'You can only unarchive tasks you created.',
      })
      return
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ archived: false })
        .eq('id', taskId)

      if (error) throw error

      loadTask()
      setModalState({
        isOpen: true,
        type: 'success',
        title: 'Task Unarchived',
        message: 'Task unarchived successfully',
      })
    } catch (error: any) {
      console.error('Error unarchiving task:', error)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Error unarchiving task',
      })
    }
  }

  const handleStartConversation = async (otherUserId: string) => {
    if (!user) {
      router.push('/login')
      return
    }

    try {
      // Check if conversation already exists
      const { data: existing1 } = await supabase
        .from('conversations')
        .select('id')
        .eq('task_id', taskId)
        .eq('participant1_id', user.id)
        .eq('participant2_id', otherUserId)
        .single()

      const { data: existing2 } = await supabase
        .from('conversations')
        .select('id')
        .eq('task_id', taskId)
        .eq('participant1_id', otherUserId)
        .eq('participant2_id', user.id)
        .single()

      const existing = existing1 || existing2
      if (existing) {
        router.push(`/messages/${existing.id}`)
        return
      }

      // Create new conversation
      const participant1 = user.id < otherUserId ? user.id : otherUserId
      const participant2 = user.id < otherUserId ? otherUserId : user.id

      const { data, error } = await supabase
        .from('conversations')
        .insert({
          task_id: taskId,
          participant1_id: participant1,
          participant2_id: participant2,
        })
        .select()
        .single()

      if (error) throw error

      router.push(`/messages/${data.id}`)
    } catch (error: any) {
      // If conversation already exists, find it
      if (error.code === '23505') {
        const { data: existing1 } = await supabase
          .from('conversations')
          .select('id')
          .eq('task_id', taskId)
          .eq('participant1_id', user.id)
          .eq('participant2_id', otherUserId)
          .single()

        const { data: existing2 } = await supabase
          .from('conversations')
          .select('id')
          .eq('task_id', taskId)
          .eq('participant1_id', otherUserId)
          .eq('participant2_id', user.id)
          .single()

        const existing = existing1 || existing2
        if (existing) {
          router.push(`/messages/${existing.id}`)
        }
      } else {
        setModalState({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: error.message || 'Error starting conversation',
        })
      }
    }
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !task) {
      router.push('/login')
      return
    }

    if (!task.assigned_to) {
      setModalState({
        isOpen: true,
        type: 'warning',
        title: 'No Helper Assigned',
        message: 'No helper assigned to this task yet.',
      })
      return
    }

    const isTasker = user.id === task.created_by
    const isHelper = user.id === task.assigned_to

    // Check if helper is trying to review before tasker
    if (isHelper) {
      const taskerHasReviewed = reviews.some(
        review => review.reviewer_id === task.created_by && review.reviewee_id === task.assigned_to
      )
      if (!taskerHasReviewed) {
        setModalState({
          isOpen: true,
          type: 'warning',
          title: 'Review Order',
          message: 'The task owner must leave a review first before you can review them.',
        })
        return
      }
    }

    const revieweeId = isTasker ? task.assigned_to : task.created_by

    if (!revieweeId) {
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Reviewee not found.',
      })
      return
    }

    // Check review comment for contact information (email/phone) - block for safety
    if (reviewComment) {
      const contentCheck = checkForContactInfo(reviewComment)
      if (!contentCheck.isClean) {
        setModalState({
          isOpen: true,
          type: 'warning',
          title: 'Contact Information Detected',
          message: contentCheck.message,
        })
        return
      }
    }

    setSubmittingReview(true)
    try {
      const { error } = await supabase.from('reviews').insert({
        task_id: taskId,
        reviewer_id: user.id,
        reviewee_id: revieweeId,
        rating: Number(reviewRating),
        comment: reviewComment || null,
      })

      if (error) {
        if (error.code === '23505') {
          setModalState({
            isOpen: true,
            type: 'warning',
            title: 'Already Reviewed',
            message: 'You have already left a review for this task.',
          })
        } else {
          throw error
        }
      } else {
        setReviewRating('5')
        setReviewComment('')
        loadReviews()
        // Dispatch event to update navbar review count
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('review-submitted'))
        }
      }
    } catch (error: any) {
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'Error submitting review',
      })
    } finally {
      setSubmittingReview(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Loading task...</div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Task not found</div>
      </div>
    )
  }

  const isTaskOwner = user && task.created_by === user.id
  const hasBid = user && bids.some(bid => bid.user_id === user.id)
  const userHasHelperRole = userProfile?.is_helper === true
  const canBid = user && userHasHelperRole && !isTaskOwner && task.status === 'open' && !hasBid
  const helperHasMarkedComplete =
    Boolean(user && task.assigned_to === user.id) &&
    progressUpdates.some((update: any) =>
      update.user_id === user?.id &&
      typeof update.message === 'string' &&
      update.message.includes('Helper has marked the work as COMPLETE')
    )
  const latestRevisionRequestTime = progressUpdates.reduce((latest: number, update: any) => {
    const isRevisionRequested =
      update?.update_type === 'revision_requested' ||
      (typeof update?.message === 'string' && update.message.startsWith('🔁 Revision requested by task owner'))
    if (!isRevisionRequested || !update?.created_at) return latest
    const ts = new Date(update.created_at).getTime()
    return Number.isFinite(ts) ? Math.max(latest, ts) : latest
  }, 0)
  const latestRevisionCompletedTime = progressUpdates.reduce((latest: number, update: any) => {
    const isRevisionCompleted =
      update?.update_type === 'revision_completed' ||
      (typeof update?.message === 'string' && update.message.includes('completed the requested revision'))
    if (!isRevisionCompleted || !update?.created_at) return latest
    const ts = new Date(update.created_at).getTime()
    return Number.isFinite(ts) ? Math.max(latest, ts) : latest
  }, 0)
  const hasOutstandingRevisionRequest =
    latestRevisionRequestTime > 0 && latestRevisionCompletedTime < latestRevisionRequestTime
  
  // Helper function to check if user can see bid details
  const canSeeBidDetails = (bid: Bid) => {
    if (!user) return false
    return isTaskOwner || bid.user_id === user.id
  }
  const hasAssignedTasker = Boolean(task.assigned_to)
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : null
  const hasUserReviewed = user ? reviews.some(review => review.reviewer_id === user.id) : false
  
  // Check if tasker (task owner) has reviewed
  const taskerHasReviewed = task.created_by && task.assigned_to
    ? reviews.some(review => review.reviewer_id === task.created_by && review.reviewee_id === task.assigned_to)
    : false
  
  // Determine if current user is tasker or helper
  const isTasker = user && task.created_by === user.id
  const isHelper = user && task.assigned_to === user.id
  
  // Tasker can always review if task is completed
  // Helper can only review after tasker has reviewed
  const canLeaveReview =
    user &&
    task.status === 'completed' &&
    hasAssignedTasker &&
    !hasUserReviewed &&
    (
      isTasker || // Tasker can review immediately
      (isHelper && taskerHasReviewed) // Helper can only review after tasker
    )
  
  // Message to show if helper is waiting for tasker's review (only for completed tasks)
  const waitingForTaskerReview = isHelper && !taskerHasReviewed && !hasUserReviewed && task.status === 'completed'

  return (
    <>
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Bid Notification Toast */}
      {bidNotification && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2 animate-pulse">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{bidNotification}</span>
          <button
            onClick={() => setBidNotification(null)}
            className="ml-2 text-white hover:text-gray-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      <Link
        href="/tasks"
        className="text-primary-600 hover:text-primary-700 mb-4 inline-block"
      >
        ← Back to tasks
      </Link>

      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
          {(task.images && task.images.length > 0) || task.image_url ? (
            <div className="flex-shrink-0 w-full sm:w-auto">
              {task.images && task.images.length > 0 ? (
                <div className="space-y-2">
                  <div className="w-full sm:w-64 sm:h-64 md:w-80 md:h-80 h-48 sm:h-auto bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center mx-auto sm:mx-0">
                    <img
                      src={task.images[0].image_url}
                      alt={task.title}
                      className="w-full h-full object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  {task.images.length > 1 && (
                    <div className="grid grid-cols-3 gap-2">
                      {task.images.slice(1, 4).map((img, index) => (
                        <div key={img.id} className="w-full h-16 sm:h-20 bg-gray-100 rounded overflow-hidden">
                          <img
                            src={img.image_url}
                            alt={`${task.title} ${index + 2}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                      ))}
                      {task.images.length > 4 && (
                        <div className="w-full h-16 sm:h-20 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-600">
                          +{task.images.length - 4} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : task.image_url ? (
                <div className="w-full sm:w-64 sm:h-64 md:w-80 md:h-80 h-48 sm:h-auto bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center mx-auto sm:mx-0">
                  <img
                    src={task.image_url}
                    alt={task.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : null}
            </div>
          ) : null}
          
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 break-words">{task.title}</h1>
                {task.user && (
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="text-xs sm:text-sm text-gray-600">Posted by </span>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setSelectedUserId(task.created_by)
                        setIsProfileModalOpen(true)
                      }}
                      className="text-primary-600 hover:text-primary-700 hover:underline flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm min-w-0"
                    >
                      {task.user.avatar_url ? (
                        <img
                          src={task.user.avatar_url}
                          alt={task.user.full_name || task.user.email}
                          className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <UserIcon className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                        </div>
                      )}
                      <span className="truncate">{task.user.full_name || task.user.email}</span>
                    </button>
                    {task.user.userRatings ? (
                      <CompactUserRatingsDisplay 
                        ratings={task.user.userRatings} 
                        size="sm"
                        className="ml-2"
                      />
                    ) : userRatings.length > 0 && task.user.userRatings === null ? (
                      // Ratings loaded but user has no ratings
                      <span className="text-xs text-gray-400 ml-2">No ratings</span>
                    ) : null}
                  </div>
                )}
                {averageRating && reviews.length > 0 && (
                  <p className="text-sm text-amber-600 mt-2">
                    Task has {reviews.length} review{reviews.length === 1 ? '' : 's'} with ★ {averageRating.toFixed(1)} average
                  </p>
                )}
              </div>
              <span
                className={`px-3 py-1 text-xs sm:text-sm font-medium rounded flex-shrink-0 self-start ${
                  task.status === 'open'
                    ? 'bg-green-100 text-green-800'
                    : task.status === 'in_progress'
                    ? 'bg-blue-100 text-blue-800'
                    : task.status === 'completed'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {task.status.replace('_', ' ')}
              </span>
            </div>

            <div className="mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Description</h2>
              <p className="text-sm sm:text-base text-gray-700 whitespace-pre-wrap break-words">{task.description}</p>
            </div>

            {task.required_skills && task.required_skills.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Required Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {task.required_skills.map((skill, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-blue-100 text-blue-800"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {user && task.user && task.created_by !== user.id && (
          <div className="mt-2 mb-6">
            <button
              onClick={() => handleStartConversation(task.created_by)}
              className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700"
            >
              Message Task Poster
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div>
            <p className="text-xs sm:text-sm text-gray-500">Budget</p>
            <p className="text-xl sm:text-2xl font-bold text-primary-600">{task.budget ? formatEuro(task.budget, false) : 'Quote'}</p>
            {/* Payment Status Badge */}
            {task.payment_status && task.payment_status !== 'pending' && (
              <span className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded ${
                task.payment_status === 'paid' 
                  ? 'bg-green-100 text-green-800' 
                  : task.payment_status === 'failed'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                Payment: {task.payment_status}
              </span>
            )}
            {/* Payout breakdown for completed/paid tasks */}
            {task.status === 'completed' && task.payment_status === 'paid' && task.budget && (
              <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                <p>Platform fee (10%): -{formatEuro(task.budget * 0.1, false)}</p>
                <p className="font-semibold text-green-700">Payout: {formatEuro(task.budget * 0.9, false)}</p>
              </div>
            )}
          </div>
          {task.category && (
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Category</p>
              <p className="text-base sm:text-lg font-medium break-words">{task.category}</p>
            </div>
          )}
          {task.location && (
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Location</p>
              <p className="text-base sm:text-lg font-medium break-words">{extractTownName(task.location)}</p>
            </div>
          )}
          {task.due_date && (
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Due Date</p>
              <p className="text-base sm:text-lg font-medium">
                {format(new Date(task.due_date), 'MMM d, yyyy')}
              </p>
            </div>
          )}
        </div>

        {/* Payment Section - Show for task owner when task is assigned */}
        {isTaskOwner && task.status === 'in_progress' && task.assigned_to && (() => {
          // Get payment amount from task budget or accepted bid
          const acceptedBid = bids.find(b => b.status === 'accepted')
          const paymentAmount = task.budget || acceptedBid?.amount
          if (!paymentAmount) return null
          
          return (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Payment Required</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Task amount: {formatEuro(paymentAmount, false)}</p>
                    <p>Service fee: €2.00</p>
                    <p className="font-semibold text-gray-900">Total: {formatEuro(paymentAmount + 2, false)}</p>
                  </div>
                  {task.payment_status === 'paid' && (
                    <p className="text-sm text-green-600 mt-2 font-medium">✓ Payment completed</p>
                  )}
                  {task.payment_status === 'failed' && (
                    <p className="text-sm text-red-600 mt-2">Payment failed. Please try again.</p>
                  )}
                </div>
                {task.payment_status !== 'paid' && (
                  <button
                    onClick={handlePayTask}
                    disabled={processingPayment}
                    className="bg-primary-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingPayment ? 'Processing...' : `Pay ${formatEuro(paymentAmount + 2, false)}`}
                  </button>
                )}
              </div>
            </div>
          )
        })()}

        {/* Payout Summary - Show for completed tasks with payment */}
        {task.status === 'completed' && task.payment_status === 'paid' && task.budget && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-900 mb-3">Payout</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Task Amount:</span>
                <span className="font-medium">{formatEuro(task.budget, false)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Platform Fee (10%):</span>
                <span>-{formatEuro(task.budget * 0.1, false)}</span>
              </div>
              <div className="flex justify-between border-t border-green-200 pt-2">
                <span className="font-semibold text-green-800">Amount Received:</span>
                <span className="font-bold text-green-800 text-lg">{formatEuro(task.budget * 0.9, false)}</span>
              </div>
              {task.payout_status && (
                <div className="mt-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                    task.payout_status === 'completed' || task.payout_status === 'simulated'
                      ? 'bg-green-100 text-green-800'
                      : task.payout_status === 'processing' || task.payout_status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : task.payout_status === 'failed'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {task.payout_status === 'completed' || task.payout_status === 'simulated' 
                      ? 'Payout Sent' 
                      : task.payout_status === 'processing' || task.payout_status === 'pending'
                      ? 'Processing'
                      : task.payout_status === 'failed'
                      ? 'Payout Failed'
                      : 'Pending'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {isTaskOwner && (
          <div className="mb-6 flex flex-wrap gap-2 sm:gap-3">
            {task.status === 'open' && (
              <Link
                href={`/tasks/${taskId}/edit`}
                className="bg-primary-600 text-white px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium hover:bg-primary-700 flex-1 sm:flex-none min-w-[120px] text-center"
              >
                Edit Task
              </Link>
            )}
            {task.status === 'in_progress' && (
              <button
                onClick={handleMarkCompleted}
                className="bg-green-600 text-white px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium hover:bg-green-700 flex-1 sm:flex-none min-w-[120px]"
              >
                Mark as Completed
              </button>
            )}
            {task.archived ? (
              <button
                onClick={handleUnarchiveTask}
                className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium hover:bg-blue-700 flex-1 sm:flex-none min-w-[120px]"
              >
                Unarchive Task
              </button>
            ) : (
              <button
                onClick={handleArchiveTask}
                className="bg-gray-600 text-white px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium hover:bg-gray-700 flex-1 sm:flex-none min-w-[120px]"
              >
                Archive Task
              </button>
            )}
            <button
              onClick={handleDeleteTask}
              className="bg-red-600 text-white px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium hover:bg-red-700 flex-1 sm:flex-none min-w-[120px]"
            >
              Delete Task
            </button>
          </div>
        )}

        {isTaskOwner && task.status === 'in_progress' && task.assigned_to && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-amber-900 mb-2">Request Revision</h3>
            <p className="text-sm text-amber-800 mb-3">
              If any part needs to be corrected, send clear feedback to the helper. They will be notified by email.
            </p>
            <textarea
              value={revisionRequestMessage}
              onChange={(e) => setRevisionRequestMessage(e.target.value)}
              placeholder="Describe what still needs to be fixed..."
              rows={3}
              className="w-full px-3 py-2 border border-amber-300 rounded-md focus:outline-none focus:ring-amber-500 focus:border-amber-500 mb-3"
            />
            {revisionRequestPhoto && (
              <div className="mb-3 relative inline-block">
                <img
                  src={revisionRequestPhoto}
                  alt="Revision request preview"
                  className="max-w-xs max-h-32 rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={() => setRevisionRequestPhoto(null)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                >
                  ×
                </button>
              </div>
            )}
            <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
              <label className="cursor-pointer bg-amber-600 text-white px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium hover:bg-amber-700 min-w-[140px] text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleRevisionRequestPhotoUpload}
                  className="hidden"
                />
                {uploadingRevisionRequestPhoto ? 'Uploading...' : 'Attach Photo'}
              </label>
              <button
                onClick={handleRequestRevision}
                disabled={submittingRevisionRequest || uploadingRevisionRequestPhoto || (!revisionRequestMessage.trim() && !revisionRequestPhoto)}
                className="bg-amber-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingRevisionRequest ? 'Sending...' : 'Send Revision Request'}
              </button>
            </div>
          </div>
        )}

        {/* Progress Updates - Only show for in_progress tasks */}
        {task.status === 'in_progress' && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Progress Updates</h3>
            <p className="text-sm text-gray-600 mb-4">The Tasker will be automatically advised of any new update.</p>
            
            {/* Add Progress Update Form - Only for assigned helper */}
            {user && task.assigned_to === user.id && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Add Progress Update</h4>
                <textarea
                  value={newProgressMessage}
                  onChange={(e) => setNewProgressMessage(e.target.value)}
                  placeholder="What progress have you made? (optional)"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 mb-3"
                />
                {progressPhoto && (
                  <div className="mb-3 relative inline-block">
                    <img
                      src={progressPhoto}
                      alt="Progress preview"
                      className="max-w-xs max-h-32 rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setProgressPhoto(null)}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-700"
                    >
                      ×
                    </button>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                  <label className="cursor-pointer inline-flex items-center justify-center text-xs sm:text-sm text-gray-600 hover:text-primary-600 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProgressPhotoUpload}
                      disabled={uploadingProgressPhoto}
                      className="sr-only"
                    />
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {uploadingProgressPhoto ? 'Uploading...' : 'Add Photo'}
                  </label>
                  <button
                    onClick={handleAddProgressUpdate}
                    disabled={addingProgressUpdate || (!newProgressMessage.trim() && !progressPhoto)}
                    className="bg-primary-600 text-white px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-auto"
                  >
                    {addingProgressUpdate ? 'Adding...' : 'Add Update'}
                  </button>
                </div>
              </div>
            )}

            {/* Display Progress Updates */}
            {progressUpdates.length > 0 ? (
              <div className="space-y-4">
                {progressUpdates.map((update: any) => {
                  const isRevisionRequested =
                    update?.update_type === 'revision_requested' ||
                    (typeof update?.message === 'string' && update.message.startsWith('🔁 Revision requested by task owner'))
                  const isRevisionCompleted =
                    update?.update_type === 'revision_completed' ||
                    (typeof update?.message === 'string' && update.message.includes('completed the requested revision'))
                  const isWorkCompleteUpdate =
                    update?.update_type === 'work_complete' ||
                    (typeof update?.message === 'string' && update.message.includes('Helper has marked the work as COMPLETE'))
                  const completionPhotoForTasker =
                    isTaskOwner && isWorkCompleteUpdate && task.completion_photos && task.completion_photos.length > 0
                      ? task.completion_photos[0]
                      : null
                  const updateTimestamp = update?.created_at ? new Date(update.created_at).getTime() : 0
                  const showRevisionPendingActionCard =
                    Boolean(isHelper) &&
                    hasOutstandingRevisionRequest &&
                    isRevisionRequested &&
                    updateTimestamp === latestRevisionRequestTime
                  return (
                  <div key={update.id} className="space-y-3">
                    <div className={`bg-white border rounded-lg p-4 ${isRevisionRequested ? 'border-amber-300 bg-amber-50/40' : 'border-gray-200'}`}>
                      <div className="flex items-start gap-3 mb-2">
                        {update.user?.avatar_url && (
                          <img
                            src={update.user.avatar_url}
                            alt={update.user.full_name || 'User'}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">
                              {update.user?.full_name || 'Helper'}
                            </span>
                            {isRevisionRequested && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
                                Revision Requested
                              </span>
                            )}
                            {isRevisionCompleted && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-100 text-green-800 border border-green-200">
                                Revision Completed
                              </span>
                            )}
                            <span className="text-xs text-gray-500">
                              {format(new Date(update.created_at), 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                          {update.message && (
                            <p className="text-gray-700 mb-2">{update.message}</p>
                          )}
                          {update.image_url && (
                            <img
                              src={update.image_url}
                              alt="Progress update"
                              className="max-w-full max-h-64 rounded-lg object-cover border border-gray-200"
                            />
                          )}
                          {completionPhotoForTasker && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-gray-600 mb-1">Completion photo</p>
                              <img
                                src={completionPhotoForTasker.image_url}
                                alt="Completion photo"
                                className="max-w-full max-h-64 rounded-lg object-cover border border-gray-200"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {showRevisionPendingActionCard && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-amber-900 mb-2">Revision Request Pending</h4>
                        <p className="text-xs text-amber-800 mb-3">
                          Use this after addressing the latest revision request so the task owner receives a dedicated notification.
                        </p>
                        <textarea
                          value={revisionCompleteMessage}
                          onChange={(e) => setRevisionCompleteMessage(e.target.value)}
                          placeholder="Explain what you fixed for this revision..."
                          rows={3}
                          className="w-full px-3 py-2 border border-amber-300 rounded-md focus:outline-none focus:ring-amber-500 focus:border-amber-500 mb-3"
                        />
                        {revisionCompletePhoto && (
                          <div className="mb-3 relative inline-block">
                            <img
                              src={revisionCompletePhoto}
                              alt="Revision completion preview"
                              className="max-w-xs max-h-32 rounded-lg object-cover border border-amber-200"
                            />
                            <button
                              type="button"
                              onClick={() => setRevisionCompletePhoto(null)}
                              className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-700"
                            >
                              ×
                            </button>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
                          <label className="cursor-pointer bg-amber-600 text-white px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium hover:bg-amber-700 min-w-[140px] text-center">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleRevisionCompletePhotoUpload}
                              disabled={uploadingRevisionCompletePhoto}
                              className="hidden"
                            />
                            {uploadingRevisionCompletePhoto ? 'Uploading...' : 'Add Photo'}
                          </label>
                          <button
                            onClick={handleMarkRevisionComplete}
                            disabled={submittingRevisionComplete || uploadingRevisionCompletePhoto}
                            className="bg-amber-700 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-amber-800 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {submittingRevisionComplete ? 'Sending...' : 'Mark Revision Complete'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )})}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No progress updates yet.</p>
            )}
          </div>
        )}

        {/* Helper actions - shown after Progress Updates */}
        {user && task.assigned_to === user.id && task.status === 'in_progress' && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-2 sm:gap-3 mb-4">
              <button
                onClick={handleCancelTask}
                className="bg-orange-600 text-white px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium hover:bg-orange-700 flex-1 sm:flex-none min-w-[120px]"
              >
                Cancel Task
              </button>
              <label className="cursor-pointer bg-primary-600 text-white px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium hover:bg-primary-700 flex-1 sm:flex-none min-w-[120px] text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadCompletionPhoto}
                  className="hidden"
                />
                Upload Completion Photo
              </label>
            </div>

            {/* Completion action shown below progress updates as requested */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-900 mb-2">Ready to Submit Your Work?</h3>
              <p className="text-sm text-green-700 mb-3">
                Once you mark this task as completed, the task owner needs to confirm the completion. Then both of you can leave reviews for each other, and your payment will be processed.
              </p>
              <p className="text-xs text-green-800 mb-3">
                Tip: Upload at least one completion photo before marking work as complete.
              </p>
              {helperHasMarkedComplete ? (
                <div className="inline-flex items-center rounded-md bg-green-100 text-green-800 px-4 py-2 text-sm font-semibold">
                  ✅ Work marked complete. Tasker notified.
                </div>
              ) : (
                <button
                  onClick={() => handleHelperMarkComplete()}
                  disabled={markingWorkComplete}
                  className="bg-green-600 text-white px-6 py-2 rounded-md text-sm font-semibold hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {markingWorkComplete ? 'Marking as Complete...' : 'Mark Work as Complete'}
                </button>
              )}
            </div>

          </div>
        )}

        {/* Completion Photos Display */}
        {task.completion_photos && task.completion_photos.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Completion Photos</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {task.completion_photos.map((photo) => (
                <div key={photo.id} className="relative">
                  <img
                    src={photo.image_url}
                    alt="Completion proof"
                    className="w-full h-48 object-cover rounded-lg border border-gray-200"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {format(new Date(photo.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {user && !isTaskOwner && task.status === 'open' && !hasBid && !userHasHelperRole && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800">Helper Role Required</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>You must enable the Helper role in your profile to bid on tasks.</p>
                <Link
                  href="/profile"
                  className="mt-2 inline-block font-medium text-yellow-800 hover:text-yellow-900 underline"
                >
                  Go to Profile to enable Helper role →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {canBid && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Submit a Bid</h2>
          <form onSubmit={handleSubmitBid} className="space-y-4">
            <div>
              <label htmlFor="bidAmount" className="block text-sm font-medium text-gray-700 mb-2">
                Total price (€)
              </label>
              <input
                type="number"
                id="bidAmount"
                required
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                placeholder="Enter the total amount you will charge"
              />
            </div>
            <div>
              <label htmlFor="bidMessage" className="block text-sm font-medium text-gray-700 mb-2">
                Price justification / notes *
              </label>
              <textarea
                id="bidMessage"
                rows={4}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={bidMessage}
                onChange={(e) => setBidMessage(e.target.value)}
                placeholder="Explain what’s included, materials or time required, and anything the poster should know."
              />
            </div>
            <button
              type="submit"
              disabled={submittingBid}
              className="w-full bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {submittingBid ? 'Submitting bid...' : 'Submit Bid'}
            </button>
            {(submittingBid || bidSubmitStatus) && (
              <p className="text-xs text-blue-700 text-center" aria-live="polite">
                {bidSubmitStatus || 'Submitting your bid...'}
              </p>
            )}
            <p className="text-xs text-gray-500 text-center">
              Tasker sets price at their own risk — final price is fixed once accepted.
            </p>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Bids ({bids.length})
        </h2>
        {acceptBidStatus && (
          <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800" aria-live="polite">
            {acceptBidStatus}
          </div>
        )}
        {bids.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No bids yet. Be the first to bid!</p>
        ) : (
          <div className="space-y-4">
            {bids.map((bid) => (
              <div
                key={bid.id}
                className={`border rounded-lg p-4 ${
                  bid.status === 'accepted' ? 'border-green-500 bg-green-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {canSeeBidDetails(bid) ? (
                      <>
                        <div className="flex items-center space-x-2 mb-2">
                          {isTaskOwner ? (
                            <div className="flex items-center gap-2">
                              {bid.user?.is_helper ? (
                                <>
                                  <Link
                                    href={`/user/${bid.user.profile_slug || bid.user_id}`}
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      router.push(`/user/${bid.user?.profile_slug || bid.user_id}`)
                                    }}
                                    className="font-semibold text-primary-600 hover:text-primary-700 hover:underline flex items-center gap-2"
                                  >
                                    {bid.user?.avatar_url && (
                                      <img
                                        src={bid.user.avatar_url}
                                        alt={bid.user.full_name || bid.user.email}
                                        className="w-6 h-6 rounded-full object-cover"
                                      />
                                    )}
                                    <span>{bid.user?.full_name || bid.user?.email}</span>
                                  </Link>
                                  <span className={`text-xs px-2 py-0.5 rounded ${
                                    bid.user?.professions && bid.user.professions.length > 0 
                                      ? 'bg-purple-100 text-purple-700' 
                                      : 'bg-primary-100 text-primary-700'
                                  }`}>
                                    {bid.user?.professions && bid.user.professions.length > 0 ? 'Professional' : 'Helper'}
                                  </span>
                                </>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setSelectedUserId(bid.user_id)
                                    setIsProfileModalOpen(true)
                                  }}
                                  className="font-semibold text-primary-600 hover:text-primary-700 hover:underline flex items-center gap-2"
                                >
                                  {bid.user?.avatar_url && (
                                    <img
                                      src={bid.user.avatar_url}
                                      alt={bid.user.full_name || bid.user.email}
                                      className="w-6 h-6 rounded-full object-cover"
                                    />
                                  )}
                                  <span>{bid.user?.full_name || bid.user?.email}</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <p className="font-semibold text-gray-900">
                              {bid.user?.full_name || bid.user?.email}
                            </p>
                          )}
                          {bid.user?.rating && (
                            <span className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                              <span>★ {bid.user.rating.toFixed(1)}</span>
                              {(bid.user.reviewCount ?? 0) > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setExpandedBidBadges(null) // Close badges when opening reviews
                                    setExpandedBidReviews(expandedBidReviews === bid.id ? null : bid.id)
                                  }}
                                  className="text-primary-600 hover:text-primary-700 hover:underline cursor-pointer"
                                  title="Click to view reviews"
                                >
                                  ({bid.user.reviewCount})
                                </button>
                              )}
                            </span>
                          )}
                          {/* Helper Badges - Clickable to show details */}
                          {bid.user?.badges && bid.user.badges.length > 0 && (
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setExpandedBidReviews(null) // Close reviews when opening badges
                                setExpandedBidBadges(expandedBidBadges === bid.id ? null : bid.id)
                              }}
                              className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                              title="Click to learn about badges"
                            >
                              {bid.user.badges.map((badge: string, idx: number) => {
                                const getBadgeImage = (badgeName: string) => {
                                  const lower = badgeName.toLowerCase()
                                  if (lower.includes('fast')) return '/images/fast.png'
                                  if (lower.includes('top')) return '/images/top_helper.png'
                                  if (lower.includes('expert')) return '/images/expert.png'
                                  return null
                                }
                                const img = getBadgeImage(badge)
                                return img ? (
                                  <img
                                    key={idx}
                                    src={img}
                                    alt={badge}
                                    className="h-6 w-6 object-contain"
                                  />
                                ) : (
                                  <span key={idx} className="text-sm">🏆</span>
                                )
                              })}
                            </button>
                          )}
                          {bid.status === 'accepted' && (
                            <span className="px-2 py-1 text-xs font-medium bg-green-500 text-white rounded">
                              Accepted
                            </span>
                          )}
                          {bid.status === 'rejected' && (
                            <span className="px-2 py-1 text-xs font-medium bg-red-500 text-white rounded">
                              Rejected
                            </span>
                          )}
                        </div>
                        <p className="text-2xl font-bold text-primary-600 mb-2">
                          {formatEuro(bid.amount)}
                        </p>
                        {bid.message && (
                          <div className="mb-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
                              Price justification
                            </p>
                            <p className="text-gray-700 whitespace-pre-line">{bid.message}</p>
                          </div>
                        )}
                        
                        {/* Reviews Preview - Shows when user clicks on review count */}
                        {isTaskOwner && expandedBidReviews === bid.id && (
                          <div className="mt-3 border-t border-gray-100 pt-3">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium text-gray-700">
                                Reviews for {bid.user?.full_name?.split(' ')[0] || 'this helper'}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  setExpandedBidReviews(null)
                                }}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                            
                            {bid.user?.recentReviews && bid.user.recentReviews.length > 0 ? (
                              <div className="space-y-3">
                                {bid.user.recentReviews.map((review: any, idx: number) => (
                                  <div key={idx} className="bg-gray-50 rounded-lg p-3 text-sm">
                                    <div className="flex items-center justify-between mb-1 flex-wrap gap-1 sm:gap-2">
                                      <span className="text-amber-500 font-medium text-xs sm:text-sm">
                                        {'★'.repeat(review.rating)}
                                        <span className="text-gray-300">{'★'.repeat(5 - review.rating)}</span>
                                      </span>
                                      <span className="text-xs text-gray-400">
                                        {format(new Date(review.created_at), 'MMM d, yyyy')}
                                      </span>
                                    </div>
                                    <p className="text-gray-700 text-sm">{review.comment}</p>
                                    {review.reviewer?.full_name && (
                                      <p className="text-xs text-gray-400 mt-1">— {review.reviewer.full_name}</p>
                                    )}
                                  </div>
                                ))}
                                {(bid.user.reviewCount ?? 0) > 3 && (
                                  <Link
                                    href={`/user/${bid.user.profile_slug || bid.user_id}`}
                                    className="block text-center text-sm text-primary-600 hover:text-primary-700 font-medium py-2"
                                  >
                                    View all {bid.user.reviewCount} reviews →
                                  </Link>
                                )}
                              </div>
                            ) : (
                              <div className="text-center py-4">
                                <p className="text-sm text-gray-500 mb-2">
                                  {(bid.user?.reviewCount ?? 0) > 0 
                                    ? 'Reviews available on profile' 
                                    : 'No reviews yet for this helper'}
                                </p>
                                {bid.user?.is_helper && (
                                  <Link
                                    href={`/user/${bid.user.profile_slug || bid.user_id}`}
                                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                                  >
                                    View full profile →
                                  </Link>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Badges Info Panel - Shows when user clicks on badges */}
                        {isTaskOwner && expandedBidBadges === bid.id && bid.user?.badges && bid.user.badges.length > 0 && (
                          <div className="mt-3 border-t border-gray-100 pt-3">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium text-gray-700">
                                Badges earned by {bid.user?.full_name?.split(' ')[0] || 'this helper'}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  setExpandedBidBadges(null)
                                }}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                            
                            <div className="space-y-3">
                              {bid.user.badges.map((badge: string, idx: number) => {
                                const getBadgeDetails = (badgeName: string) => {
                                  const lower = badgeName.toLowerCase()
                                  if (lower.includes('fast')) return {
                                    img: '/images/fast.png',
                                    name: 'Fast Responder',
                                    description: 'This helper typically responds to messages within 2 hours. Quick communication means your task gets moving faster!',
                                    color: 'bg-blue-50 border-blue-200'
                                  }
                                  if (lower.includes('top')) return {
                                    img: '/images/top_helper.png',
                                    name: 'Top Helper',
                                    description: 'This helper has maintained a rating of 4.5+ stars across 10+ completed tasks. A proven track record of quality work!',
                                    color: 'bg-amber-50 border-amber-200'
                                  }
                                  if (lower.includes('expert')) return {
                                    img: '/images/expert.png',
                                    name: 'Expert Skills',
                                    description: 'This helper has 5 or more verified skills. A versatile professional who can handle diverse tasks!',
                                    color: 'bg-purple-50 border-purple-200'
                                  }
                                  return {
                                    img: null,
                                    name: badgeName,
                                    description: 'A special badge earned for outstanding performance.',
                                    color: 'bg-gray-50 border-gray-200'
                                  }
                                }
                                const details = getBadgeDetails(badge)
                                return (
                                  <div key={idx} className={`rounded-lg p-3 border ${details.color}`}>
                                    <div className="flex items-start gap-3">
                                      {details.img ? (
                                        <img
                                          src={details.img}
                                          alt={details.name}
                                          className="h-10 w-10 object-contain flex-shrink-0"
                                        />
                                      ) : (
                                        <span className="text-2xl flex-shrink-0">🏆</span>
                                      )}
                                      <div>
                                        <p className="font-semibold text-gray-900 text-sm">{details.name}</p>
                                        <p className="text-xs text-gray-600 mt-1">{details.description}</p>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="mb-2">
                          <p className="text-sm text-gray-500 mb-1">Bidder</p>
                        </div>
                        <p className="text-2xl font-bold text-primary-600 mb-2">
                          {formatEuro(bid.amount)}
                        </p>
                      </>
                    )}
                    <p className="text-xs text-gray-500">
                      {format(new Date(bid.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <div className="ml-4 flex space-x-2">
                    {isTaskOwner && task.status === 'open' && bid.status === 'pending' && (
                      <button
                        onClick={() => handleAcceptBid(bid.id)}
                        disabled={Boolean(acceptingBidId)}
                        className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {acceptingBidId === bid.id ? 'Accepting...' : acceptingBidId ? 'Please wait...' : 'Accept Bid'}
                      </button>
                    )}
                    {canSeeBidDetails(bid) && user && bid.user_id && (
                      <button
                        onClick={() => handleStartConversation(bid.user_id!)}
                        className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700"
                      >
                        Message
                      </button>
                    )}
                  </div>
                </div>
                {isTaskOwner && canSeeBidDetails(bid) && (
                  <p className="text-xs text-gray-500 mt-2">
                    Tasker sets price at their own risk — final price is fixed once accepted.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Reviews ({reviews.length})
            {canLeaveReview && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                Review Pending
              </span>
            )}
          </h2>
          {canLeaveReview && (
            <button
              onClick={() => {
                const reviewForm = document.getElementById('review-form')
                if (reviewForm) {
                  reviewForm.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              Leave Review
            </button>
          )}
        </div>

        {/* Persistent small reminder if user hasn't reviewed yet */}
        {canLeaveReview && !showReviewReminder && (
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 mb-6">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <p className="text-sm text-gray-700">
                <strong>You can leave a review!</strong> Scroll down or click the "Leave Review" button above.
              </p>
            </div>
          </div>
        )}

        {waitingForTaskerReview && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">How Reviews Work</h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              The task owner will leave their review first. After that, you'll be able to share your review of them. 
              Simple, fair, and helps the whole community!
            </p>
          </div>
        )}

        {canLeaveReview && (
          <div id="review-form" className="bg-primary-50 border-2 border-primary-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Leave a Review</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Help others by sharing your experience with {isTasker
                    ? (task.assigned_to_user?.full_name || 'the helper')
                    : (task.user?.full_name || 'the tasker')}. Your feedback helps build trust in the community.
                </p>
              </div>
            </div>
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="rating" className="block text-sm font-medium text-gray-700 mb-2">
                    Rating *
                  </label>
                  <select
                    id="rating"
                    value={reviewRating}
                    onChange={(e) => setReviewRating(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                  >
                    {[5, 4, 3, 2, 1].map((value) => (
                      <option value={value} key={value}>
                        {value} {value === 1 ? 'Star' : 'Stars'} {value === 5 ? '⭐ Excellent' : value === 4 ? '👍 Good' : value === 3 ? '😐 Average' : value === 2 ? '👎 Poor' : '❌ Very Poor'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-3">
                  <label htmlFor="reviewComment" className="block text-sm font-medium text-gray-700 mb-2">
                    Comment (optional but helpful)
                  </label>
                  <textarea
                    id="reviewComment"
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Share your experience... What went well? What could be improved?"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submittingReview}
                className="bg-primary-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          </div>
        )}

        {reviews.length === 0 ? (
          <p className="text-gray-500 text-center py-6">No reviews yet.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {review.reviewer?.full_name || review.reviewer?.email || 'Anonymous'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(review.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="text-amber-600 font-semibold text-xs sm:text-sm">
                    {'★'.repeat(review.rating)}{' '}
                    <span className="text-gray-400">
                      {'★'.repeat(5 - review.rating)}
                    </span>
                  </div>
                </div>
                {review.comment && <p className="text-gray-700">{review.comment}</p>}
                <p className="text-xs text-gray-500 mt-2">
                  Review for {review.reviewee?.full_name || review.reviewee?.email || 'user'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Profile Modal */}
      <UserProfileModal
        userId={selectedUserId}
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false)
          setSelectedUserId(null)
        }}
      />
    </div>

    {/* Complete Task Confirmation Modal - Outside container for proper overlay */}
    {showCompleteModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
        <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
          <div className="p-6">
            {/* Icon */}
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
              Mark Task as Completed?
            </h3>

            {/* Description */}
            <p className="text-sm text-gray-600 text-center mb-6">
              Once you mark this task as completed, the helper will be notified and payout processing will start. 
              Reviews are optional and can be left afterward by both of you.
            </p>

            {/* How Reviews Work */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">How Reviews Work</h4>
              <p className="text-xs text-blue-800 leading-relaxed">
                You, as the task owner, leave your review first. After that, your helper can share their review of you.
                Reviews are optional, but they help build trust and help others choose reliable people.
              </p>
            </div>

            {/* Task Info */}
            {task && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm font-medium text-gray-900 mb-1">Task:</p>
                <p className="text-sm text-gray-700">{task.title}</p>
              </div>
            )}

            {/* Payment Status */}
            {task && (
              <div
                className={`rounded-lg p-3 mb-6 border ${
                  task.payment_status === 'paid' || paymentStatus === 'paid'
                    ? 'bg-green-50 border-green-200'
                    : task.payment_status === 'pending' || paymentStatus === 'processing'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <p
                  className={`text-sm font-semibold ${
                    task.payment_status === 'paid' || paymentStatus === 'paid'
                      ? 'text-green-800'
                      : task.payment_status === 'pending' || paymentStatus === 'processing'
                      ? 'text-yellow-800'
                      : 'text-red-800'
                  }`}
                >
                  {task.payment_status === 'paid' || paymentStatus === 'paid'
                    ? 'Payment status: Paid'
                    : task.payment_status === 'pending' || paymentStatus === 'processing'
                    ? 'Payment status: In progress'
                    : 'Payment status: To be paid'}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowCompleteModal(false)}
                disabled={completingTask}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmMarkCompleted}
                disabled={completingTask}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {completingTask ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Completing...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Mark as Completed
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Standard Modal */}
    <StandardModal
      isOpen={modalState.isOpen}
      onClose={() => {
        setModalState({ ...modalState, isOpen: false })
        setPendingDeleteTask(false)
        setPendingCancelTask(false)
      }}
      onConfirm={modalState.onConfirm}
      type={modalState.type}
      title={modalState.title}
      message={modalState.message}
      confirmText={modalState.type === 'confirm' ? 'Yes, Continue' : 'OK'}
    />
  </>
  )
}


