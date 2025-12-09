import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Query for archived tasks
    const { data: archivedTasks, error } = await supabase
      .from('tasks')
      .select('id, title, status, created_at, archived, created_by')
      .eq('archived', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching archived tasks:', error)
      return NextResponse.json(
        { error: 'Failed to fetch archived tasks', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      count: archivedTasks?.length || 0,
      tasks: archivedTasks || []
    })
  } catch (error: any) {
    console.error('Error in check-archived-tasks:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

