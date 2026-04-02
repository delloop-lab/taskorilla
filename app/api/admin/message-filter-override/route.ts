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

    const body = await request.json()
    const conversationId = typeof body?.conversationId === 'string' ? body.conversationId : null
    const note = typeof body?.note === 'string' ? body.note.trim() : null

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 })
    }

    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, task_id')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const payload = {
      conversation_id: conversation.id,
      task_id: conversation.task_id,
      granted_by: user.id,
      note: note || null,
      remaining_uses: 1,
      used_at: null,
      last_reason: null,
    }

    const { data, error } = await supabase
      .from('message_filter_overrides')
      .upsert(payload, { onConflict: 'conversation_id' })
      .select('id, conversation_id, remaining_uses, created_at')
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to grant override', details: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      override: data,
      message: 'One-time message override granted',
    })
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error', details: error?.message || 'Unknown error' }, { status: 500 })
  }
}
