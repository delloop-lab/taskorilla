import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

type GuideFeedbackPayload = {
  guideId?: string
  guideTitle?: string
  guideSlug?: string
  feedback?: 'yes' | 'no'
  language?: string
  sessionKey?: string | null
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    const body = (await request.json()) as GuideFeedbackPayload

    const guideId = (body.guideId || '').trim()
    const guideTitle = (body.guideTitle || '').trim()
    const guideSlug = (body.guideSlug || '').trim()
    const feedback = body.feedback
    const language = (body.language || 'en').trim().slice(0, 10)
    const sessionKey = body.sessionKey ? String(body.sessionKey).trim().slice(0, 128) : null

    if (!guideId || !guideTitle || !guideSlug || (feedback !== 'yes' && feedback !== 'no')) {
      return NextResponse.json({ error: 'Invalid feedback payload' }, { status: 400 })
    }

    if (sessionKey) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data: existing, error: dedupeError } = await supabase
        .from('guide_feedback')
        .select('id')
        .eq('guide_slug', guideSlug)
        .eq('session_key', sessionKey)
        .eq('feedback', feedback)
        .gte('created_at', since)
        .limit(1)

      if (!dedupeError && existing && existing.length > 0) {
        return NextResponse.json({ ok: true, deduped: true })
      }
    }

    const { error } = await supabase
      .from('guide_feedback')
      .insert({
        guide_id: guideId,
        guide_title: guideTitle,
        guide_slug: guideSlug,
        feedback,
        language,
        session_key: sessionKey,
      })

    if (error) {
      return NextResponse.json({ error: 'Failed to save feedback', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error', details: error?.message || 'Unknown error' }, { status: 500 })
  }
}

