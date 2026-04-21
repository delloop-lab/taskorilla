import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { buildTaskTypeKey } from '@/lib/helper-match-feedback'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    const hasServiceRole =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !!process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAdmin = hasServiceRole
      ? createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || '',
          process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        )
      : null
    const body = await request.json().catch(() => null)

    const taskId = body?.taskId as string | undefined
    const helperId = body?.helperId as string | undefined
    const action = body?.action as 'exclude' | 'clear' | undefined
    const reason = (body?.reason as string | undefined)?.trim() || 'not_suitable'
    const notesRaw = (body?.notes as string | undefined)?.trim() || null
    const notes = notesRaw && notesRaw.length > 1000 ? notesRaw.slice(0, 1000) : notesRaw

    if (!taskId || !helperId || !action) {
      return NextResponse.json({ error: 'taskId, helperId and action are required' }, { status: 400 })
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const { data: taskRow, error: taskError } = await supabase
      .from('tasks')
      .select('id, required_skills, required_professions')
      .eq('id', taskId)
      .single()

    if (taskError || !taskRow) {
      return NextResponse.json({ error: 'Task not found', details: taskError?.message }, { status: 404 })
    }

    const { data: tagJoinData } = await supabase
      .from('tasks')
      .select('id, task_tags(task_id, tag_id, tags(id, name))')
      .eq('id', taskId)
      .single()

    const directTags: string[] = []
    const tt = (tagJoinData as any)?.task_tags || []
    tt.forEach((ttItem: any) => {
      const t = ttItem?.tags
      if (Array.isArray(t)) {
        t.forEach((x: any) => x?.name && directTags.push(x.name))
      } else if (t && t.name) {
        directTags.push(t.name)
      }
    })

    const skillTags = Array.isArray(taskRow.required_skills) ? taskRow.required_skills : []
    const allTags = Array.from(new Set([...directTags, ...skillTags]))
    const taskTypeKey = buildTaskTypeKey(taskRow, allTags)

    if (action === 'clear') {
      // Clear both scopes used by preview/send:
      // 1) task_type_key exclusions (cross-task type)
      // 2) task_id exclusions (task-specific safety-net rows)
      const db = supabaseAdmin ?? supabase
      const { error: clearByTypeError } = await db
        .from('helper_match_feedback')
        .delete()
        .eq('helper_id', helperId)
        .eq('task_type_key', taskTypeKey)
        .eq('feedback', 'exclude')

      if (clearByTypeError) {
        return NextResponse.json({ error: clearByTypeError.message }, { status: 500 })
      }

      const { error: clearByTaskError } = await db
        .from('helper_match_feedback')
        .delete()
        .eq('helper_id', helperId)
        .eq('task_id', taskId)
        .eq('feedback', 'exclude')

      if (clearByTaskError) {
        return NextResponse.json({ error: clearByTaskError.message }, { status: 500 })
      }

      return NextResponse.json({ ok: true, action: 'cleared', taskTypeKey })
    }

    const db = supabaseAdmin ?? supabase
    const { error: upsertError } = await db
      .from('helper_match_feedback')
      .upsert(
        {
          helper_id: helperId,
          task_id: taskId,
          task_type_key: taskTypeKey,
          feedback: 'exclude',
          reason,
          notes,
          created_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'helper_id,task_type_key' }
      )

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    // Verify persistence immediately so the UI can surface a concrete failure reason.
    const { data: persistedRow, error: persistedReadError } = await db
      .from('helper_match_feedback')
      .select('id, helper_id, task_type_key, feedback, reason, notes, created_at')
      .eq('helper_id', helperId)
      .eq('task_type_key', taskTypeKey)
      .eq('feedback', 'exclude')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (persistedReadError) {
      return NextResponse.json(
        { error: `Saved but failed to verify persisted state: ${persistedReadError.message}`, taskTypeKey },
        { status: 500 }
      )
    }

    if (!persistedRow) {
      return NextResponse.json(
        {
          error: 'Saved request completed but exclusion row was not found when re-reading.',
          helperId,
          taskId,
          taskTypeKey,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, action: 'excluded', taskTypeKey, persisted: persistedRow })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

