import { supabase } from './supabase'

export interface PendingReview {
  task_id: string
  task_title: string
  other_user_id: string
  other_user_name: string | null
  other_user_avatar: string | null
  is_tasker: boolean // true if current user is tasker, false if helper
}

interface ReviewRecord {
  task_id: string
  reviewer_id: string
  reviewee_id: string
}

interface CompletedTask {
  id: string
  title: string
  created_by: string
  assigned_to: string
  status: string
}

/**
 * Helper function to add timeout to promises
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 5000): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
  })
  return Promise.race([promise, timeoutPromise])
}

/**
 * Get tasks that need reviews from the current user
 */
export async function getPendingReviews(userId: string): Promise<PendingReview[]> {
  try {
    // Get all completed tasks where user participated (optimized with limit and order)
    const queryPromise = supabase
      .from('tasks')
      .select('id, title, created_by, assigned_to, status')
      .eq('status', 'completed')
      .or(`created_by.eq.${userId},assigned_to.eq.${userId}`)
      .order('updated_at', { ascending: false }) // Most recent first
      .limit(50) // Reduced limit for faster queries

    const { data: completedTasks, error: tasksError } = await withTimeout(queryPromise as unknown as Promise<{ data: CompletedTask[] | null; error: any }>, 3000).catch(() => {
      console.warn('Timeout fetching completed tasks for pending reviews')
      return { data: null, error: { message: 'Request timeout' } }
    }) as { data: CompletedTask[] | null; error: any }

    if (tasksError) {
      console.warn('Error fetching completed tasks for pending reviews:', tasksError)
      return [] // Return empty array instead of throwing
    }
    if (!completedTasks || completedTasks.length === 0) return []

    // Get all reviews the user has already left (only for the tasks we're checking)
    const taskIds = completedTasks.map((t: CompletedTask) => t.id)
    if (taskIds.length === 0) return []
    
    const reviewsQueryPromise = supabase
      .from('reviews')
      .select('task_id, reviewer_id, reviewee_id')
      .eq('reviewer_id', userId)
      .in('task_id', taskIds) // Only get reviews for tasks we're checking
      .limit(100) // Reduced limit

    const { data: existingReviews, error: reviewsError } = await withTimeout(reviewsQueryPromise as unknown as Promise<any>, 3000).catch(() => {
      console.warn('Timeout fetching existing reviews')
      return { data: null, error: { message: 'Request timeout' } }
    }) as any

    if (reviewsError) {
      console.warn('Error fetching existing reviews:', reviewsError)
      return [] // Return empty array instead of throwing
    }

    const reviewedTaskIds = new Set(
      (existingReviews as ReviewRecord[] | null)?.map((r: ReviewRecord) => `${r.task_id}-${r.reviewee_id}`) || []
    )

    // Get all reviews for these tasks to check if tasker has reviewed (for helpers)
    // Only get reviews where tasker reviewed helper (for helper review eligibility check)
    const allReviewsQueryPromise = supabase
      .from('reviews')
      .select('task_id, reviewer_id, reviewee_id')
      .in('task_id', taskIds)
      .limit(100) // Reduced limit

    const { data: allTaskReviews, error: allReviewsError } = await withTimeout(allReviewsQueryPromise as unknown as Promise<any>, 3000).catch(() => {
      console.warn('Timeout fetching all task reviews')
      return { data: null, error: { message: 'Request timeout' } }
    }) as any

    if (allReviewsError) {
      console.warn('Error fetching all task reviews:', allReviewsError)
      // Continue with empty array - we'll just miss some review checks
    }

    // Build map of tasker reviews by task
    const taskerReviewsByTask = new Map<string, boolean>()
    if (allTaskReviews) {
      completedTasks.forEach((task: CompletedTask) => {
        if (task.created_by && task.assigned_to) {
          const taskerHasReviewed = (allTaskReviews as ReviewRecord[] | null)?.some(
            (r: ReviewRecord) => r.task_id === task.id && r.reviewer_id === task.created_by && r.reviewee_id === task.assigned_to
          ) || false
          taskerReviewsByTask.set(task.id, taskerHasReviewed)
        }
      })
    }

    // Filter tasks that need reviews
    const pendingReviews: PendingReview[] = []
    
    // Collect all user IDs we need profiles for (to batch fetch)
    const userIdsToFetch = new Set<string>()

    for (const task of completedTasks) {
      if (!task.assigned_to || !task.created_by) continue

      const isTasker = task.created_by === userId
      const isHelper = task.assigned_to === userId

      if (isTasker) {
        // Tasker can review immediately
        const reviewKey = `${task.id}-${task.assigned_to}`
        if (!reviewedTaskIds.has(reviewKey)) {
          userIdsToFetch.add(task.assigned_to)
          pendingReviews.push({
            task_id: task.id,
            task_title: task.title,
            other_user_id: task.assigned_to,
            other_user_name: null, // Will be filled after batch fetch
            other_user_avatar: null,
            is_tasker: true,
          })
        }
      } else if (isHelper) {
        // Helper can only review after tasker has reviewed
        const taskerHasReviewed = taskerReviewsByTask.get(task.id) || false
        if (taskerHasReviewed) {
          const reviewKey = `${task.id}-${task.created_by}`
          if (!reviewedTaskIds.has(reviewKey)) {
            userIdsToFetch.add(task.created_by)
            pendingReviews.push({
              task_id: task.id,
              task_title: task.title,
              other_user_id: task.created_by,
              other_user_name: null, // Will be filled after batch fetch
              other_user_avatar: null,
              is_tasker: false,
            })
          }
        }
      }
    }

    // Batch fetch all profiles at once (much faster than individual queries)
    if (userIdsToFetch.size > 0) {
      try {
        const profileQuery = supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', Array.from(userIdsToFetch))
          .limit(50)

        const { data: profiles } = await withTimeout(profileQuery as unknown as Promise<any>, 3000).catch(() => {
          console.warn('Timeout fetching profiles for pending reviews')
          return { data: null }
        }) as any

        if (profiles && Array.isArray(profiles)) {
          const profileMap = new Map(profiles.map((p: any) => [p.id, p]))
          // Fill in profile data
          pendingReviews.forEach(review => {
            const profile = profileMap.get(review.other_user_id)
            if (profile) {
              review.other_user_name = profile.full_name || null
              review.other_user_avatar = profile.avatar_url || null
            }
          })
        }
      } catch (error) {
        console.warn('Error fetching profiles for pending reviews:', error)
        // Continue without profile data - reviews will still work
      }
    }

    return pendingReviews
  } catch (error) {
    console.error('Error getting pending reviews:', error)
    return []
  }
}
