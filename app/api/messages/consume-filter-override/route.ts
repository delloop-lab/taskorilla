import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ allowed: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const conversationId = typeof body?.conversationId === 'string' ? body.conversationId : null
    const detectedReason = typeof body?.detectedReason === 'string' ? body.detectedReason : null

    if (!conversationId) {
      return NextResponse.json({ allowed: false, error: 'conversationId is required' }, { status: 400 })
    }

    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, participant1_id, participant2_id')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      return NextResponse.json({ allowed: false, error: 'Conversation not found' }, { status: 404 })
    }

    if (conversation.participant1_id !== user.id && conversation.participant2_id !== user.id) {
      return NextResponse.json({ allowed: false, error: 'Forbidden' }, { status: 403 })
    }

    const { data: row, error: rowError } = await supabase
      .from('message_filter_overrides')
      .select('id, remaining_uses')
      .eq('conversation_id', conversationId)
      .maybeSingle()

    if (rowError) {
      return NextResponse.json({ allowed: false, error: 'Failed to load override', details: rowError.message }, { status: 500 })
    }

    if (!row || row.remaining_uses <= 0) {
      return NextResponse.json({ allowed: false }, { status: 200 })
    }

    const nextUses = Math.max(0, row.remaining_uses - 1)
    const { error: updateError } = await supabase
      .from('message_filter_overrides')
      .update({
        remaining_uses: nextUses,
        used_at: new Date().toISOString(),
        last_reason: detectedReason,
      })
      .eq('id', row.id)
      .eq('remaining_uses', row.remaining_uses)

    if (updateError) {
      return NextResponse.json({ allowed: false, error: 'Failed to consume override', details: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ allowed: true, remainingUses: nextUses }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ allowed: false, error: 'Internal server error', details: error?.message || 'Unknown error' }, { status: 500 })
  }
}
