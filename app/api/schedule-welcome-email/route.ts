import { NextRequest, NextResponse } from 'next/server'
import {
  queueScheduledWelcomeEmail,
  type QueueWelcomeSource,
  type WelcomeTemplateType,
} from '@/lib/queue-scheduled-welcome-email'

const ALLOWED_TEMPLATES = ['tasker_welcome', 'helper_welcome'] as const
const ALLOWED_SOURCES = ['register', 'become_helper', 'unknown'] as const

function parseTemplateType(raw: unknown): WelcomeTemplateType | null {
  if (typeof raw !== 'string') return null
  const t = raw.trim()
  return (ALLOWED_TEMPLATES as readonly string[]).includes(t) ? (t as WelcomeTemplateType) : null
}

function parseSource(raw: unknown): QueueWelcomeSource {
  if (typeof raw !== 'string') return 'unknown'
  const source = raw.trim()
  return (ALLOWED_SOURCES as readonly string[]).includes(source)
    ? (source as QueueWelcomeSource)
    : 'unknown'
}

/**
 * Queues tasker_welcome or helper_welcome ~1h later (used when signup returns
 * an immediate session). When the user must confirm email first, the callback
 * queues the welcome after confirmation instead.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const recipientEmail = typeof body?.recipientEmail === 'string' ? body.recipientEmail.trim() : ''
    const recipientName = typeof body?.recipientName === 'string' ? body.recipientName.trim() : ''
    const relatedUserId = typeof body?.relatedUserId === 'string' ? body.relatedUserId.trim() : ''
    const templateType = parseTemplateType(body?.templateType) ?? 'tasker_welcome'
    const source = parseSource(body?.source)

    const result = await queueScheduledWelcomeEmail({
      recipientEmail,
      recipientName,
      relatedUserId,
      templateType,
      source,
      meta: { route: '/api/schedule-welcome-email' },
      enforceRecentProfile: true,
    })

    if (!result.ok) {
      const status =
        result.reason === 'Invalid payload' || result.reason === 'Profile not found'
          ? 400
          : result.reason === 'Invalid signup window'
            ? 400
            : result.reason === 'Server misconfiguration'
              ? 500
              : 503
      const body =
        status === 503
          ? {
              error:
                'Could not queue email. Ensure scheduled_emails migration is applied.',
            }
          : { error: result.reason }
      return NextResponse.json(body, { status })
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    console.error('schedule-welcome-email:', e)
    const message = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
