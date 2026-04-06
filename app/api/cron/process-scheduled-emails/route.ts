import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { renderEmailTemplate, sendTemplateEmail } from '@/lib/email'
import { logEmail } from '@/lib/email-logger'

const MAX_ATTEMPTS = 5
const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const MAX_WEEKLY_TASKER_BID_REMINDERS = 4
const TASKER_BID_TEMPLATE = 'tasker_bid_received'

function getFirstName(input: string | null | undefined): string {
  const raw = String(input || '').trim()
  if (!raw) return 'there'
  const first = raw.split(/\s+/)[0]?.trim()
  return first || 'there'
}

function authorizeCron(request: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') {
    return true
  }
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return false
  }
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${secret}`
}

export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const supabaseAdmin = createClient(url, serviceKey)

  const { data: rows, error: selectError } = await supabaseAdmin
    .from('scheduled_emails')
    .select('*')
    .is('sent_at', null)
    .lte('send_after', new Date().toISOString())
    .lt('send_attempts', MAX_ATTEMPTS)
    .order('send_after', { ascending: true })
    .limit(30)

  if (selectError) {
    console.error('process-scheduled-emails select:', selectError)
    return NextResponse.json(
      { error: selectError.message, hint: 'Run supabase/add_scheduled_emails.sql if the table is missing.' },
      { status: 503 }
    )
  }

  let processed = 0
  let failed = 0

  for (const row of rows || []) {
    const attempts = (row.send_attempts ?? 0) + 1
    const markAttempt = async (lastError: string, abandon: boolean) => {
      await supabaseAdmin
        .from('scheduled_emails')
        .update({
          send_attempts: attempts,
          last_error: lastError.slice(0, 2000),
          ...(abandon ? { sent_at: new Date().toISOString() } : {}),
        })
        .eq('id', row.id)
    }

    try {
      const appUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
      const { data: template, error: tplError } = await supabaseAdmin
        .from('email_templates')
        .select('subject, html_content')
        .eq('template_type', row.template_type)
        .maybeSingle()

      if (tplError || !template) {
        await markAttempt(tplError?.message || 'Template not found', attempts >= MAX_ATTEMPTS)
        failed += 1
        continue
      }

      let registrationDate = ''
      if (row.related_user_id) {
        const { data: userProfile } = await supabaseAdmin
          .from('profiles')
          .select('created_at')
          .eq('id', row.related_user_id)
          .maybeSingle()
        if (userProfile?.created_at) {
          registrationDate = new Date(userProfile.created_at).toLocaleDateString()
        }
      }

      let variables: Record<string, string> = {
        registration_date: registrationDate,
      }

      if (row.template_type === TASKER_BID_TEMPLATE) {
        if (!row.related_task_id) {
          await markAttempt('Missing related_task_id for tasker bid reminder', true)
          failed += 1
          continue
        }

        const { data: task } = await supabaseAdmin
          .from('tasks')
          .select('id, title, status')
          .eq('id', row.related_task_id)
          .maybeSingle()
        if (!task) {
          await markAttempt('Task not found', true)
          failed += 1
          continue
        }

        const isActionable = task.status === 'open' || task.status === 'pending'
        const { count: pendingBidCount } = await supabaseAdmin
          .from('bids')
          .select('id', { count: 'exact', head: true })
          .eq('task_id', row.related_task_id)
          .eq('status', 'pending')

        if (!isActionable || (pendingBidCount || 0) <= 0) {
          await supabaseAdmin
            .from('scheduled_emails')
            .update({
              sent_at: new Date().toISOString(),
              last_error: `Skipped: task_not_actionable_or_no_pending_bids (${task.status})`,
              send_attempts: attempts,
            })
            .eq('id', row.id)
          processed += 1
          continue
        }

        const taskUrl = `${appUrl}/tasks/${row.related_task_id}`
        variables = {
          ...variables,
          task_title: task.title || 'your task',
          'task title': task.title || 'your task',
          bid_count: String(pendingBidCount || 1),
          task_url: taskUrl,
          task_url_html: `<a href="${taskUrl}" target="_blank" rel="noopener noreferrer">View bid</a>`,
          has_multiple_bids: (pendingBidCount || 0) > 1 ? 'true' : 'false',
          user_first_name: getFirstName(row.recipient_name || row.recipient_email || ''),
          recipient_name: row.recipient_name || row.recipient_email || '',
        }
      }

      const renderedSubject = renderEmailTemplate(template.subject, variables)
      const htmlContent = await sendTemplateEmail(
        row.recipient_email,
        row.recipient_name || '',
        renderedSubject,
        template.html_content,
        variables
      )

      await logEmail(
        {
          recipient_email: row.recipient_email,
          recipient_name: row.recipient_name || undefined,
          subject: renderedSubject,
          email_type: 'template_email',
          status: 'sent',
          related_user_id: row.related_user_id || undefined,
          metadata: {
            template_type: row.template_type,
            scheduled_send: true,
            html_content: htmlContent,
            variables,
            related_task_id: row.related_task_id || null,
            related_bid_id: row.related_bid_id || null,
            reminder_kind: row.reminder_kind || 'one_off',
            weekly_reminder_index: row.weekly_reminder_index || 0,
          },
        },
        supabaseAdmin
      )

      await supabaseAdmin
        .from('scheduled_emails')
        .update({
          sent_at: new Date().toISOString(),
          last_error: null,
          send_attempts: attempts,
        })
        .eq('id', row.id)

      if (
        row.template_type === TASKER_BID_TEMPLATE &&
        row.reminder_kind === 'weekly' &&
        (row.weekly_reminder_index || 0) < MAX_WEEKLY_TASKER_BID_REMINDERS
      ) {
        const nextIndex = (row.weekly_reminder_index || 0) + 1
        const nextAfter = new Date(Date.now() + WEEK_MS).toISOString()
        const { error: nextErr } = await supabaseAdmin.from('scheduled_emails').insert({
          send_after: nextAfter,
          template_type: TASKER_BID_TEMPLATE,
          recipient_email: row.recipient_email,
          recipient_name: row.recipient_name || null,
          related_user_id: row.related_user_id || null,
          related_task_id: row.related_task_id || null,
          reminder_kind: 'weekly',
          weekly_reminder_index: nextIndex,
          payload: row.payload || {},
        })
        if (nextErr && nextErr.code !== '23505') {
          console.error('process-scheduled-emails weekly requeue:', nextErr.message)
        }
      }

      processed += 1
    } catch (e: any) {
      const msg = e?.message || 'Send failed'
      console.error('process-scheduled-emails row', row.id, msg)
      await markAttempt(msg, attempts >= MAX_ATTEMPTS)
      failed += 1
    }
  }

  return NextResponse.json({
    ok: true,
    processed,
    failed,
    batchSize: (rows || []).length,
  })
}
