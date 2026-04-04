import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTemplateEmail } from '@/lib/email'
import { logEmail } from '@/lib/email-logger'

const MAX_ATTEMPTS = 5

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

      const htmlContent = await sendTemplateEmail(
        row.recipient_email,
        row.recipient_name || '',
        template.subject,
        template.html_content,
        {
          registration_date: registrationDate,
        }
      )

      await logEmail(
        {
          recipient_email: row.recipient_email,
          recipient_name: row.recipient_name || undefined,
          subject: template.subject,
          email_type: 'template_email',
          status: 'sent',
          related_user_id: row.related_user_id || undefined,
          metadata: {
            template_type: row.template_type,
            scheduled_send: true,
            html_content: htmlContent,
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
