'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Task, Bid, Review } from '@/lib/types'
import { format } from 'date-fns'
import Link from 'next/link'
import UserProfileModal from '@/components/UserProfileModal'

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = params.id as string

  const [task, setTask] = useState<Task | null>(null)
  const [bids, setBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [bidAmount, setBidAmount] = useState('')
  const [bidMessage, setBidMessage] = useState('')
  const [submittingBid, setSubmittingBid] = useState(false)
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewRating, setReviewRating] = useState('5')
  const [reviewComment, setReviewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [bidNotification, setBidNotification] = useState<string | null>(null)

  useEffect(() => {
    loadTask()
    loadBids()
    loadReviews()
    checkUser()
  }, [taskId])

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
  }

  const loadTask = async () => {
    try {
      const { data: taskData, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single()

      if (error) throw error

      // Fetch profile and rating for task creator
      if (taskData) {
        const [profileResult, reviewsResult, imagesResult, completionPhotosResult] = await Promise.all([
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
            .order('created_at', { ascending: false })
        ])

        const profileData = profileResult.data
        const reviewsData = reviewsResult.data || []
        const imagesData = imagesResult.data || []
        const completionPhotosData = completionPhotosResult.data || []

        // Calculate average rating
        let averageRating = null
        if (reviewsData.length > 0) {
          const sum = reviewsData.reduce((acc, r) => acc + r.rating, 0)
          averageRating = sum / reviewsData.length
        }

        setTask({
          ...taskData,
          user: profileData ? {
            ...profileData,
            rating: averageRating,
            reviewCount: reviewsData.length
          } : null,
          images: imagesData.length > 0 ? imagesData : undefined,
          completion_photos: completionPhotosData.length > 0 ? completionPhotosData : undefined
        })
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

      // Fetch profiles and ratings for bidders
      if (bidsData && bidsData.length > 0) {
        const bidderIds = Array.from(new Set(bidsData.map(b => b.user_id)))
        const [profilesResult, reviewsResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, email, full_name, avatar_url')
            .in('id', bidderIds),
          supabase
            .from('reviews')
            .select('reviewee_id, rating')
            .in('reviewee_id', bidderIds)
        ])

        const profilesData = profilesResult.data || []
        const reviewsData = reviewsResult.data || []

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

        // Map profiles and ratings to bids
        const bidsWithProfiles = bidsData.map(bid => {
          const user = profilesData.find(p => p.id === bid.user_id)
          const rating = ratingsByUser[bid.user_id]
          return {
            ...bid,
            user: user ? { ...user, rating: rating ? rating.avg : null, reviewCount: rating?.count || 0 } : undefined
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
        const profileIds = [
          ...new Set(reviewsData.flatMap((review) => [review.reviewer_id, review.reviewee_id])),
        ]

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

    setSubmittingBid(true)
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
      loadBids()
    } catch (error: any) {
      alert(error.message || 'Error submitting bid')
    } finally {
      setSubmittingBid(false)
    }
  }

  const handleAcceptBid = async (bidId: string) => {
    if (!user || !task || task.created_by !== user.id) return

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

      // Update task
      const acceptedBid = bids.find(b => b.id === bidId)
      if (acceptedBid) {
        await supabase
          .from('tasks')
          .update({
            status: 'in_progress',
            assigned_to: acceptedBid.user_id,
          })
          .eq('id', taskId)

        // Send email notifications
        try {
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
      }

      loadTask()
      loadBids()
    } catch (error) {
      console.error('Error accepting bid:', error)
    }
  }

  const handleCancelTask = async () => {
    if (!user || !task || task.assigned_to !== user.id) {
      alert('You can only cancel tasks you are assigned to.')
      return
    }

    if (!confirm('Are you sure you want to cancel this task? This will set the task back to open status.')) {
      return
    }

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
      alert('Task cancelled successfully. The task is now open for new bids.')
    } catch (error: any) {
      console.error('Error cancelling task:', error)
      alert('Error cancelling task')
    }
  }

  const handleMarkCompleted = async () => {
    if (!user || !task || task.created_by !== user.id) return

    if (!confirm('Mark this task as completed? This will allow both parties to leave reviews.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'completed' })
        .eq('id', taskId)

      if (error) throw error

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

      loadTask()
    } catch (error) {
      console.error('Error marking task as completed:', error)
      alert('Error marking task as completed')
    }
  }

  const handleUploadCompletionPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user || !task || task.assigned_to !== user.id) {
      alert('You can only upload completion photos for tasks you are assigned to.')
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
      alert('Completion photo uploaded successfully')
    } catch (error: any) {
      console.error('Error uploading completion photo:', error)
      alert(error.message || 'Error uploading completion photo')
    } finally {
      if (event.target) {
        event.target.value = ''
      }
    }
  }

  const handleDeleteTask = async () => {
    if (!user || !task || task.created_by !== user.id) {
      alert('You can only delete tasks you created.')
      return
    }

    if (!confirm('Are you sure you want to delete this task? This action cannot be undone and will also delete all bids and conversations related to this task.')) {
      return
    }

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
      router.push('/tasks')
      router.refresh()
    } catch (error: any) {
      console.error('Error deleting task:', error)
      alert(`Error deleting task: ${error.message || 'You may not have permission to delete this task. Make sure you are the task owner and that the delete policy is set up in the database.'}`)
    }
  }

  const handleArchiveTask = async () => {
    if (!user || !task || task.created_by !== user.id) {
      alert('You can only archive tasks you created.')
      return
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ archived: true })
        .eq('id', taskId)

      if (error) throw error

      loadTask()
      alert('Task archived successfully')
    } catch (error: any) {
      console.error('Error archiving task:', error)
      alert('Error archiving task')
    }
  }

  const handleUnarchiveTask = async () => {
    if (!user || !task || task.created_by !== user.id) {
      alert('You can only unarchive tasks you created.')
      return
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ archived: false })
        .eq('id', taskId)

      if (error) throw error

      loadTask()
      alert('Task unarchived successfully')
    } catch (error: any) {
      console.error('Error unarchiving task:', error)
      alert('Error unarchiving task')
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
        alert(error.message || 'Error starting conversation')
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
      alert('No tasker assigned to this task yet.')
      return
    }

    const revieweeId = user.id === task.created_by ? task.assigned_to : task.created_by

    if (!revieweeId) {
      alert('Reviewee not found.')
      return
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
          alert('You have already left a review for this task.')
        } else {
          throw error
        }
      } else {
        setReviewRating('5')
        setReviewComment('')
        loadReviews()
      }
    } catch (error: any) {
      alert(error.message || 'Error submitting review')
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
  const canBid = user && !isTaskOwner && task.status === 'open' && !hasBid
  
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
  const canLeaveReview =
    user &&
    task.status === 'completed' &&
    hasAssignedTasker &&
    !hasUserReviewed &&
    (user.id === task.created_by || user.id === task.assigned_to)

  return (
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

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex gap-6">
          {(task.images && task.images.length > 0) || task.image_url ? (
            <div className="flex-shrink-0">
              {task.images && task.images.length > 0 ? (
                <div className="space-y-2">
                  <div className="w-64 h-64 md:w-80 md:h-80 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                    <img
                      src={task.images[0].image_url}
                      alt={task.title}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  {task.images.length > 1 && (
                    <div className="grid grid-cols-3 gap-2">
                      {task.images.slice(1, 4).map((img, index) => (
                        <div key={img.id} className="w-full h-20 bg-gray-100 rounded overflow-hidden">
                          <img
                            src={img.image_url}
                            alt={`${task.title} ${index + 2}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      {task.images.length > 4 && (
                        <div className="w-full h-20 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-600">
                          +{task.images.length - 4} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : task.image_url ? (
                <div className="w-64 h-64 md:w-80 md:h-80 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                  <img
                    src={task.image_url}
                    alt={task.title}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : null}
            </div>
          ) : null}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{task.title}</h1>
                {task.user && (
                  <div className="flex items-center space-x-2 flex-wrap">
                    <span className="text-gray-600">Posted by </span>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setSelectedUserId(task.created_by)
                        setIsProfileModalOpen(true)
                      }}
                      className="text-primary-600 hover:text-primary-700 hover:underline flex items-center gap-2"
                    >
                      {task.user.avatar_url && (
                        <img
                          src={task.user.avatar_url}
                          alt={task.user.full_name || task.user.email}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      )}
                      <span>{task.user.full_name || task.user.email}</span>
                    </button>
                    {task.user.rating !== null && task.user.rating !== undefined && (
                      <span className="text-sm text-amber-600 font-semibold flex items-center">
                        <span className="mr-1">★</span>
                        <span>{task.user.rating.toFixed(1)}</span>
                        {task.user.reviewCount && task.user.reviewCount > 0 && (
                          <span className="text-gray-500 ml-1">({task.user.reviewCount})</span>
                        )}
                      </span>
                    )}
                  </div>
                )}
                {averageRating && reviews.length > 0 && (
                  <p className="text-sm text-amber-600 mt-2">
                    Task has {reviews.length} review{reviews.length === 1 ? '' : 's'} with ★ {averageRating.toFixed(1)} average
                  </p>
                )}
              </div>
              <span
                className={`px-3 py-1 text-sm font-medium rounded flex-shrink-0 ${
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
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Description</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
            </div>
          </div>
        </div>

        {user && task.user && task.created_by !== user.id && (
          <div className="mb-6">
            <button
              onClick={() => handleStartConversation(task.created_by)}
              className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700"
            >
              Message Task Poster
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-500">Budget</p>
            <p className="text-2xl font-bold text-primary-600">${task.budget}</p>
          </div>
          {task.category && (
            <div>
              <p className="text-sm text-gray-500">Category</p>
              <p className="text-lg font-medium">{task.category}</p>
            </div>
          )}
          {task.location && (
            <div>
              <p className="text-sm text-gray-500">Location</p>
              <p className="text-lg font-medium">{task.location}</p>
            </div>
          )}
          {task.due_date && (
            <div>
              <p className="text-sm text-gray-500">Due Date</p>
              <p className="text-lg font-medium">
                {format(new Date(task.due_date), 'MMM d, yyyy')}
              </p>
            </div>
          )}
        </div>

        {isTaskOwner && (
          <div className="mb-6 flex space-x-3">
            {task.status === 'open' && (
              <Link
                href={`/tasks/${taskId}/edit`}
                className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700"
              >
                Edit Task
              </Link>
            )}
            {task.status === 'in_progress' && (
              <button
                onClick={handleMarkCompleted}
                className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700"
              >
                Mark as Completed
              </button>
            )}
            {task.archived ? (
              <button
                onClick={handleUnarchiveTask}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Unarchive Task
              </button>
            ) : (
              <button
                onClick={handleArchiveTask}
                className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700"
              >
                Archive Task
              </button>
            )}
            <button
              onClick={handleDeleteTask}
              className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700"
            >
              Delete Task
            </button>
          </div>
        )}

        {/* Tasker actions - Cancel task and upload completion photos */}
        {user && task.assigned_to === user.id && task.status === 'in_progress' && (
          <div className="mb-6 flex space-x-3">
            <button
              onClick={handleCancelTask}
              className="bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-orange-700"
            >
              Cancel Task
            </button>
            <label className="cursor-pointer bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700">
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadCompletionPhoto}
                className="hidden"
              />
              Upload Completion Photo
            </label>
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

      {canBid && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Submit a Bid</h2>
          <form onSubmit={handleSubmitBid} className="space-y-4">
            <div>
              <label htmlFor="bidAmount" className="block text-sm font-medium text-gray-700 mb-2">
                Your Bid Amount ($)
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
              />
            </div>
            <div>
              <label htmlFor="bidMessage" className="block text-sm font-medium text-gray-700 mb-2">
                Message (Optional)
              </label>
              <textarea
                id="bidMessage"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={bidMessage}
                onChange={(e) => setBidMessage(e.target.value)}
                placeholder="Tell the task poster why you're the right person for this job..."
              />
            </div>
            <button
              type="submit"
              disabled={submittingBid}
              className="w-full bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {submittingBid ? 'Submitting...' : 'Submit Bid'}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Bids ({bids.length})
        </h2>
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
                          ) : (
                            <p className="font-semibold text-gray-900">
                              {bid.user?.full_name || bid.user?.email}
                            </p>
                          )}
                          {bid.user?.rating && (
                            <span className="text-xs text-amber-600 font-semibold">
                              ★ {bid.user.rating.toFixed(1)}
                              {bid.user.reviewCount > 0 && (
                                <span className="text-gray-400"> ({bid.user.reviewCount})</span>
                              )}
                            </span>
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
                        <p className="text-2xl font-bold text-primary-600 mb-2">${bid.amount}</p>
                        {bid.message && (
                          <p className="text-gray-700 mb-2">{bid.message}</p>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="mb-2">
                          <p className="text-sm text-gray-500 mb-1">Bidder</p>
                        </div>
                        <p className="text-2xl font-bold text-primary-600 mb-2">${bid.amount}</p>
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
                        className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700"
                      >
                        Accept Bid
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
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Reviews ({reviews.length})
        </h2>

        {canLeaveReview && (
          <form onSubmit={handleSubmitReview} className="mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label htmlFor="rating" className="block text-sm font-medium text-gray-700 mb-2">
                  Rating
                </label>
                <select
                  id="rating"
                  value={reviewRating}
                  onChange={(e) => setReviewRating(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option value={value} key={value}>
                      {value} {value === 1 ? 'Star' : 'Stars'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-3">
                <label htmlFor="reviewComment" className="block text-sm font-medium text-gray-700 mb-2">
                  Comment (optional)
                </label>
                <textarea
                  id="reviewComment"
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Share your experience..."
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submittingReview}
              className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {submittingReview ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
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
                  <div className="text-amber-600 font-semibold">
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
        taskOwnerId={task?.created_by || null}
      />
    </div>
  )
}

