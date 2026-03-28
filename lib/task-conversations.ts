import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Find or create the 1:1 conversation for a task between two participants.
 * participant1_id / participant2_id are stored in sorted UUID order (same as task detail).
 */
export async function getOrCreateTaskConversation(
  supabase: SupabaseClient,
  params: { taskId: string; userId: string; otherUserId: string }
): Promise<{ id: string }> {
  const { taskId, userId, otherUserId } = params

  const { data: existing1 } = await supabase
    .from('conversations')
    .select('id')
    .eq('task_id', taskId)
    .eq('participant1_id', userId)
    .eq('participant2_id', otherUserId)
    .maybeSingle()

  const { data: existing2 } = await supabase
    .from('conversations')
    .select('id')
    .eq('task_id', taskId)
    .eq('participant1_id', otherUserId)
    .eq('participant2_id', userId)
    .maybeSingle()

  const existing = existing1 || existing2
  if (existing?.id) {
    return { id: existing.id }
  }

  const participant1 = userId < otherUserId ? userId : otherUserId
  const participant2 = userId < otherUserId ? otherUserId : userId

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      task_id: taskId,
      participant1_id: participant1,
      participant2_id: participant2,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      const { data: retry1 } = await supabase
        .from('conversations')
        .select('id')
        .eq('task_id', taskId)
        .eq('participant1_id', userId)
        .eq('participant2_id', otherUserId)
        .maybeSingle()
      const { data: retry2 } = await supabase
        .from('conversations')
        .select('id')
        .eq('task_id', taskId)
        .eq('participant1_id', otherUserId)
        .eq('participant2_id', userId)
        .maybeSingle()
      const retry = retry1 || retry2
      if (retry?.id) return { id: retry.id }
    }
    throw error
  }

  if (!data?.id) {
    throw new Error('Failed to create conversation')
  }

  return { id: data.id }
}
