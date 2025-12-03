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
 * Get tasks that need reviews from the current user
 */
export async function getPendingReviews(userId: string): Promise<PendingReview[]> {
  try {
    // Get all completed tasks where user participated
    const { data: completedTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, created_by, assigned_to, status')
      .eq('status', 'completed')
      .or(`created_by.eq.${userId},assigned_to.eq.${userId}`)

    if (tasksError) throw tasksError
    if (!completedTasks || completedTasks.length === 0) return []

    // Get all reviews the user has already left
    const { data: existingReviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('task_id, reviewer_id, reviewee_id')
      .eq('reviewer_id', userId)

    if (reviewsError) throw reviewsError

    const reviewedTaskIds = new Set(
      existingReviews?.map(r => `${r.task_id}-${r.reviewee_id}`) || []
    )

    // Get all reviews for these tasks to check if tasker has reviewed (for helpers)
    const { data: allTaskReviews, error: allReviewsError } = await supabase
      .from('reviews')
      .select('task_id, reviewer_id, reviewee_id')
      .in('task_id', completedTasks.map(t => t.id))

    if (allReviewsError) throw allReviewsError

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
          // Get helper profile
          const { data: helperProfile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', task.assigned_to)
            .single()

          pendingReviews.push({
            task_id: task.id,
            task_title: task.title,
            other_user_id: task.assigned_to,
            other_user_name: helperProfile?.full_name || null,
            other_user_avatar: helperProfile?.avatar_url || null,
            is_tasker: true,
          })
        }
      } else if (isHelper) {
        // Helper can only review after tasker has reviewed
        const taskerHasReviewed = taskerReviewsByTask.get(task.id) || false
        if (taskerHasReviewed) {
          const reviewKey = `${task.id}-${task.created_by}`
          if (!reviewedTaskIds.has(reviewKey)) {
            // Get tasker profile
            const { data: taskerProfile } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', task.created_by)
              .single()

            pendingReviews.push({
              task_id: task.id,
              task_title: task.title,
              other_user_id: task.created_by,
              other_user_name: taskerProfile?.full_name || null,
              other_user_avatar: taskerProfile?.avatar_url || null,
              is_tasker: false,
            })
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




