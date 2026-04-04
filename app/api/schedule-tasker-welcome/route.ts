import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const TEMPLATE_TYPE = 'tasker_welcome'
const DELAY_MS = 60 * 60 * 1000 // 1 hour
const MAX_PROFILE_AGE_MS = 20 * 60 * 1000 // must have been created recently (signup window)

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

/**
 * Queues the tasker welcome email ~1h after signup so it does not arrive
 * immediately after the Supabase confirmation email.
 */
export async function POST(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    const body = await request.json().catch(() => null)
    const recipientEmail = typeof body?.recipientEmail === 'string' ? body.recipientEmail.trim() : ''
    const recipientName = typeof body?.recipientName === 'string' ? body.recipientName.trim() : ''
    const relatedUserId = typeof body?.relatedUserId === 'string' ? body.relatedUserId.trim() : ''

    if (!recipientEmail || !isValidEmail(recipientEmail) || !relatedUserId) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const supabaseAdmin = createClient(url, serviceKey)

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, created_at')
      .eq('id', relatedUserId)
      .maybeSingle()

    if (profileError || !profile?.created_at) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 400 })
    }

    const createdAt = new Date(profile.created_at).getTime()
    if (Number.isNaN(createdAt) || Date.now() - createdAt > MAX_PROFILE_AGE_MS) {
      return NextResponse.json({ error: 'Invalid signup window' }, { status: 400 })
    }

    const sendAfter = new Date(Date.now() + DELAY_MS).toISOString()

    const { error: insertError } = await supabaseAdmin.from('scheduled_emails').insert({
      send_after: sendAfter,
      template_type: TEMPLATE_TYPE,
      recipient_email: recipientEmail,
      recipient_name: recipientName || null,
      related_user_id: relatedUserId,
    })

    if (insertError) {
      console.error('schedule-tasker-welcome insert:', insertError)
      return NextResponse.json(
        { error: 'Could not queue email. Ensure scheduled_emails migration is applied.' },
        { status: 503 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('schedule-tasker-welcome:', e)
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}
