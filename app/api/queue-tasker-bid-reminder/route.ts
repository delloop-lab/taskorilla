import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { renderEmailTemplate, sendTemplateEmail } from '@/lib/email'
import { logEmail } from '@/lib/email-logger'

const TEMPLATE_TYPE = 'tasker_bid_received'
const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const MAX_WEEKLY_REMINDERS = 4

function getFirstName(input: string | null | undefined): string {
  const raw = String(input || '').trim()
  if (!raw) return 'there'
  const first = raw.split(/\s+/)[0]?.trim()
  return first || 'there'
}

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

    const body = await request.json().catch(() => ({}))
    const taskId = String(body?.taskId || '').trim()
    const bidId = String(body?.bidId || '').trim()
    if (!taskId) {
      return NextResponse.json({ error: 'Missing taskId' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }
    const admin = createClient(url, serviceKey)

    const { data: task, error: taskError } = await admin
      .from('tasks')
      .select('id, title, status, created_by')
      .eq('id', taskId)
      .maybeSingle()
    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Only bidders on the task can trigger this.
    if (task.created_by === user.id) {
      return NextResponse.json({ error: 'Task owner cannot trigger bid reminders' }, { status: 403 })
    }

    const { data: ownerProfile } = await admin
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', task.created_by)
      .maybeSingle()
    if (!ownerProfile?.email) {
      return NextResponse.json({ error: 'Task owner email not found' }, { status: 400 })
    }

    const { count: bidCount } = await admin
      .from('bids')
      .select('id', { count: 'exact', head: true })
      .eq('task_id', taskId)
      .eq('status', 'pending')

    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).replace(/\/$/, '')
    const taskUrl = `${baseUrl}/tasks/${taskId}`
    const taskUrlHtml = `<a href="${taskUrl}" target="_blank" rel="noopener noreferrer">View bid</a>`
    const variables = {
      task_title: task.title || 'your task',
      'task title': task.title || 'your task',
      bid_count: String(bidCount || 1),
      task_url: taskUrl,
      task_url_html: taskUrlHtml,
      has_multiple_bids: (bidCount || 0) > 1 ? 'true' : 'false',
      user_first_name: getFirstName(ownerProfile.full_name || ownerProfile.email || ''),
      recipient_name: ownerProfile.full_name || ownerProfile.email || '',
    }

    const { data: template } = await admin
      .from('email_templates')
      .select('subject, html_content')
      .eq('template_type', TEMPLATE_TYPE)
      .maybeSingle()
    if (template) {
      const renderedSubject = renderEmailTemplate(template.subject, variables)
      const htmlContent = await sendTemplateEmail(
        ownerProfile.email,
        ownerProfile.full_name || ownerProfile.email,
        renderedSubject,
        template.html_content,
        variables
      )
      await logEmail(
        {
          recipient_email: ownerProfile.email,
          recipient_name: ownerProfile.full_name || undefined,
          subject: renderedSubject,
          email_type: 'template_email',
          status: 'sent',
          related_user_id: task.created_by,
          related_task_id: taskId,
          metadata: {
            template_type: TEMPLATE_TYPE,
            send_kind: 'immediate_bid_event',
            related_bid_id: bidId || null,
            html_content: htmlContent,
            variables,
          },
        },
        admin
      )
    }

    // Ensure weekly chain exists (index 1 only; cron schedules 2-4).
    const week1 = new Date(Date.now() + WEEK_MS).toISOString()
    const { error: insertErr } = await admin.from('scheduled_emails').insert({
      send_after: week1,
      template_type: TEMPLATE_TYPE,
      recipient_email: ownerProfile.email,
      recipient_name: ownerProfile.full_name || null,
      related_user_id: task.created_by,
      related_task_id: taskId,
      related_bid_id: bidId || null,
      reminder_kind: 'weekly',
      weekly_reminder_index: 1,
      payload: variables,
    })

    if (insertErr && insertErr.code !== '23505') {
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    const { count: weeklyCount } = await admin
      .from('scheduled_emails')
      .select('id', { count: 'exact', head: true })
      .eq('template_type', TEMPLATE_TYPE)
      .eq('related_task_id', taskId)
      .eq('reminder_kind', 'weekly')

    return NextResponse.json({
      ok: true,
      weeklyCount: weeklyCount || 0,
      maxWeekly: MAX_WEEKLY_REMINDERS,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}
