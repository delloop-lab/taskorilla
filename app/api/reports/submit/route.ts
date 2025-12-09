import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    // Create authenticated Supabase client from request
    const supabase = createServerSupabaseClient(request)
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to submit a report' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { reportType, targetId, reason, details } = body

    // Validate input
    if (!reportType || !['task', 'user'].includes(reportType)) {
      return NextResponse.json(
        { error: 'Invalid report type. Must be "task" or "user"' },
        { status: 400 }
      )
    }

    if (!targetId) {
      return NextResponse.json(
        { error: 'Target ID is required' },
        { status: 400 }
      )
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'Reason is required' },
        { status: 400 }
      )
    }

    // Verify the target exists
    if (reportType === 'task') {
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('id, created_by')
        .eq('id', targetId)
        .single()

      if (taskError || !task) {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        )
      }

      // Don't allow users to report their own tasks
      if (task.created_by === user.id) {
        return NextResponse.json(
          { error: 'You cannot report your own task' },
          { status: 400 }
        )
      }

      // Insert report
      const { data: report, error: reportError } = await supabase
        .from('reports')
        .insert({
          reported_by: user.id,
          task_id: targetId,
          report_type: 'task',
          reason: reason.trim(),
          details: details?.trim() || null,
        })
        .select()
        .single()

      if (reportError) {
        console.error('Error creating report:', reportError)
        return NextResponse.json(
          { error: 'Failed to submit report', details: reportError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, report })
    } else {
      // User report
      // Verify the user exists in profiles table (required for reporting)
      const { data: reportedUser, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', targetId)
        .single()

      if (userError || !reportedUser) {
        console.error('Error checking user profile:', userError)
        return NextResponse.json(
          { error: 'User not found. The user must have a profile to be reported.' },
          { status: 404 }
        )
      }

      // Don't allow users to report themselves
      if (targetId === user.id) {
        return NextResponse.json(
          { error: 'You cannot report yourself' },
          { status: 400 }
        )
      }

      // Insert report
      const { data: report, error: reportError } = await supabase
        .from('reports')
        .insert({
          reported_by: user.id,
          reported_user_id: targetId,
          report_type: 'user',
          reason: reason.trim(),
          details: details?.trim() || null,
        })
        .select()
        .single()

      if (reportError) {
        console.error('Error creating report:', reportError)
        return NextResponse.json(
          { error: 'Failed to submit report', details: reportError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, report })
    }
  } catch (error: any) {
    console.error('Error in submit report:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

