import { supabase } from './supabase'

export interface PendingReview {
  task_id: string
  task_title: string
  other_user_id: string
  other_user_name: string | null
  other_user_avatar: string | null
  is_tasker: boolean // true if current user is tasker, false if helper
}

/**
 * Helper function to add timeout to promises
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T> {
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
    // Get all completed tasks where user participated
    const queryPromise = supabase
      .from('tasks')
      .select('id, title, created_by, assigned_to, status')
      .eq('status', 'completed')
      .or(`created_by.eq.${userId},assigned_to.eq.${userId}`)
      .limit(100) // Limit to prevent large queries

    const { data: completedTasks, error: tasksError } = await withTimeout(queryPromise as unknown as Promise<any>).catch(() => {
      console.warn('Timeout fetching completed tasks for pending reviews')
      return { data: null, error: { message: 'Request timeout' } }
    }) as any

    if (tasksError) {
      console.warn('Error fetching completed tasks for pending reviews:', tasksError)
      return [] // Return empty array instead of throwing
    }
    if (!completedTasks || completedTasks.length === 0) return []

    // Get all reviews the user has already left
    const reviewsQueryPromise = supabase
      .from('reviews')
      .select('task_id, reviewer_id, reviewee_id')
      .eq('reviewer_id', userId)
      .limit(200) // Limit to prevent large queries

    const { data: existingReviews, error: reviewsError } = await withTimeout(reviewsQueryPromise as unknown as Promise<any>).catch(() => {
      console.warn('Timeout fetching existing reviews')
      return { data: null, error: { message: 'Request timeout' } }
    }) as any

    if (reviewsError) {
      console.warn('Error fetching existing reviews:', reviewsError)
      return [] // Return empty array instead of throwing
    }

    const reviewedTaskIds = new Set(
      existingReviews?.map(r => `${r.task_id}-${r.reviewee_id}`) || []
    )

    // Get all reviews for these tasks to check if tasker has reviewed (for helpers)
    const allReviewsQueryPromise = supabase
      .from('reviews')
      .select('task_id, reviewer_id, reviewee_id')
      .in('task_id', completedTasks.map(t => t.id))
      .limit(500) // Limit to prevent large queries

    const { data: allTaskReviews, error: allReviewsError } = await withTimeout(allReviewsQueryPromise as unknown as Promise<any>).catch(() => {
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
      completedTasks.forEach(task => {
        if (task.created_by && task.assigned_to) {
          const taskerHasReviewed = allTaskReviews.some(
            r => r.task_id === task.id && r.reviewer_id === task.created_by && r.reviewee_id === task.assigned_to
          )
          taskerReviewsByTask.set(task.id, taskerHasReviewed)
        }
      })
    }

    // Filter tasks that need reviews
    const pendingReviews: PendingReview[] = []

    for (const task of completedTasks) {
      if (!task.assigned_to || !task.created_by) continue

      const isTasker = task.created_by === userId
      const isHelper = task.assigned_to === userId

      if (isTasker) {
        // Tasker can review immediately
        const reviewKey = `${task.id}-${task.assigned_to}`
        if (!reviewedTaskIds.has(reviewKey)) {
          // Get helper profile (with timeout)
          try {
            const profileQuery = supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', task.assigned_to)
              .single()

            const { data: helperProfile } = await withTimeout(profileQuery as unknown as Promise<any>, 5000).catch(() => {
              console.warn('Timeout fetching helper profile')
              return { data: null }
            }) as any

            pendingReviews.push({
              task_id: task.id,
              task_title: task.title,
              other_user_id: task.assigned_to,
              other_user_name: helperProfile?.full_name || null,
              other_user_avatar: helperProfile?.avatar_url || null,
              is_tasker: true,
            })
          } catch (error) {
            // If profile fetch fails, still add the review but without profile data
            pendingReviews.push({
              task_id: task.id,
              task_title: task.title,
              other_user_id: task.assigned_to,
              other_user_name: null,
              other_user_avatar: null,
              is_tasker: true,
            })
          }
        }
      } else if (isHelper) {
        // Helper can only review after tasker has reviewed
        const taskerHasReviewed = taskerReviewsByTask.get(task.id) || false
        if (taskerHasReviewed) {
          const reviewKey = `${task.id}-${task.created_by}`
          if (!reviewedTaskIds.has(reviewKey)) {
            // Get tasker profile (with timeout)
            try {
              const profileQuery = supabase
                .from('profiles')
                .select('full_name, avatar_url')
                .eq('id', task.created_by)
                .single()

              const { data: taskerProfile } = await withTimeout(profileQuery as unknown as Promise<any>, 5000).catch(() => {
                console.warn('Timeout fetching tasker profile')
                return { data: null }
              }) as any

              pendingReviews.push({
                task_id: task.id,
                task_title: task.title,
                other_user_id: task.created_by,
                other_user_name: taskerProfile?.full_name || null,
                other_user_avatar: taskerProfile?.avatar_url || null,
                is_tasker: false,
              })
            } catch (error) {
              // If profile fetch fails, still add the review but without profile data
              pendingReviews.push({
                task_id: task.id,
                task_title: task.title,
                other_user_id: task.created_by,
                other_user_name: null,
                other_user_avatar: null,
                is_tasker: false,
              })
            }
          }
        }
      }
    }

    return pendingReviews
  } catch (error) {
    console.error('Error getting pending reviews:', error)
    return []
  }
}
