import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Admin client with service role key - bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

/**
 * Update Task Payment Status (Admin endpoint - bypasses RLS)
 * POST /api/admin/update-payment-status
 * 
 * This endpoint uses the service role key to update payment status
 * directly in the database, bypassing Row Level Security.
 */
export async function POST(request: NextRequest) {
  console.log('[Update Payment Status] === Starting ===')
  
  try {
    // Validate service role key is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[Update Payment Status] SUPABASE_SERVICE_ROLE_KEY is not configured')
      return NextResponse.json(
        { success: false, error: 'Server configuration error: Service role key not set' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { taskId, paymentStatus, paymentIntentId } = body

    console.log('[Update Payment Status] Request:', { taskId, paymentStatus, paymentIntentId })

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: taskId' },
        { status: 400 }
      )
    }

    if (!paymentStatus) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: paymentStatus' },
        { status: 400 }
      )
    }

    // Validate payment status value
    const validStatuses = ['pending', 'paid', 'failed', 'refunded']
    if (!validStatuses.includes(paymentStatus)) {
      return NextResponse.json(
        { success: false, error: `Invalid paymentStatus. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // First, verify the task exists
    const { data: existingTask, error: fetchError } = await supabaseAdmin
      .from('tasks')
      .select('id, payment_status, payment_intent_id')
      .eq('id', taskId)
      .single()

    if (fetchError) {
      console.error('[Update Payment Status] Error fetching task:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Task not found', details: fetchError.message },
        { status: 404 }
      )
    }

    console.log('[Update Payment Status] Existing task:', existingTask)

    // Build update object
    const updateData: Record<string, any> = {
      payment_status: paymentStatus,
    }

    if (paymentIntentId) {
      updateData.payment_intent_id = paymentIntentId
    }

    // Update the task using admin client (bypasses RLS)
    const { data: updatedTask, error: updateError } = await supabaseAdmin
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select('id, payment_status, payment_intent_id, title')
      .single()

    if (updateError) {
      console.error('[Update Payment Status] Update error:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update task', details: updateError.message },
        { status: 500 }
      )
    }

    console.log('[Update Payment Status] ✅ Task updated successfully:', updatedTask)

    return NextResponse.json({
      success: true,
      message: `Payment status updated to "${paymentStatus}"`,
      task: updatedTask,
      previousStatus: existingTask.payment_status
    })

  } catch (err: any) {
    console.error('[Update Payment Status] Unexpected error:', err)
    return NextResponse.json(
      { success: false, error: 'Server error', details: err.message },
      { status: 500 }
    )
  }
}

