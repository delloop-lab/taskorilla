import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendTemplateEmail } from '@/lib/email'
import { logEmail } from '@/lib/email-logger'
import { sendHelperAlert } from '@/lib/sms'
import { shortenUrl } from '@/lib/url-shortener'
import { logSms } from '@/lib/sms-logger'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (adminProfile?.role !== 'admin' && adminProfile?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const taskId: string = body?.taskId
    const userId: string = body?.userId
    const channels: string[] = Array.isArray(body?.channels) ? body.channels : ['email']

    if (!taskId || !userId) {
      return NextResponse.json({ error: 'taskId and userId are required' }, { status: 400 })
    }

    const sendEmail = channels.includes('email')
    const sendSms = channels.includes('sms')

    if (!sendEmail && !sendSms) {
      return NextResponse.json({ error: 'At least one channel (email or sms) must be selected' }, { status: 400 })
    }

    // Fetch task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, title, budget, location, latitude, longitude')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Fetch recipient profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone_number, phone_country_code, sms_opt_out')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Hard de-dupe guard: if this helper was already allocated to this task,
    // skip additional manual match alerts.
    const { data: existingAllocation } = await supabase
      .from('helper_task_allocations')
      .select('id, first_allocated_at, last_notified_at, allocated_via, channels')
      .eq('task_id', taskId)
      .eq('helper_id', userId)
      .maybeSingle()

    if (existingAllocation) {
      return NextResponse.json({
        emailSent: false,
        smsSent: false,
        errors: [],
        alreadyAllocated: true,
        allocation: existingAllocation,
      })
    }

    const baseUrl = (
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.NEXT_PUBLIC_VERCEL_URL
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL.replace(/^https?:\/\//, '')}`
        : null) ||
      'http://localhost:3000'
    ).replace(/\/$/, '')

    const taskUrl = `${baseUrl}/tasks/${task.id}`
    const profileUrl = `${baseUrl}/profile`

    let emailSent = false
    let smsSent = false
    const errors: string[] = []

    // ── Email ────────────────────────────────────────────────────────────────
    if (sendEmail) {
      const recipientEmail = (profile.email || '').trim()
      if (!recipientEmail || !recipientEmail.includes('@')) {
        errors.push('User has no valid email address')
      } else {
        const { data: template, error: templateError } = await supabase
          .from('email_templates')
          .select('subject, html_content')
          .eq('template_type', 'helper_task_match')
          .single()

        if (templateError || !template) {
          errors.push('Email template not found')
        } else {
          const hasAmount = typeof task.budget === 'number' && task.budget > 0
          const amountLabel = hasAmount ? `€${task.budget!.toFixed(2)}` : 'Quote needed'
          const locationLabel = task.location || 'Unknown'
          const renderedSubject = template.subject.replace(/\{\{task_title\}\}/g, task.title)

          await sendTemplateEmail(
            recipientEmail,
            profile.full_name || 'Helper',
            renderedSubject,
            template.html_content,
            {
              task_title: task.title,
              amount_label: amountLabel,
              location_label: locationLabel,
              distance_label: 'N/A',
              task_url: taskUrl,
            },
          )

          await logEmail({
            recipient_email: recipientEmail,
            recipient_name: profile.full_name || undefined,
            subject: renderedSubject,
            email_type: 'helper_task_match',
            status: 'sent',
            related_task_id: task.id,
            related_user_id: profile.id,
            metadata: { sent_by_admin: true, task_url: taskUrl },
          }, supabase)

          emailSent = true
        }
      }
    }

    // ── SMS ──────────────────────────────────────────────────────────────────
    if (sendSms) {
      if (profile.sms_opt_out) {
        errors.push('User has opted out of SMS alerts')
      } else {
        const phone = (profile.phone_number || '').trim()
        if (!phone) {
          errors.push('User has no phone number on file')
        } else {
          const countryCode = (profile.phone_country_code || '').trim()
          const fullPhone = countryCode && !phone.startsWith('+')
            ? `${countryCode}${phone}`
            : phone

          const [shortTaskUrl, shortProfileUrl] = await Promise.all([
            shortenUrl(taskUrl, supabase),
            shortenUrl(profileUrl, supabase),
          ])

          const smsText = `New task near you on Taskorilla: ${task.title} – View it: ${shortTaskUrl} | To opt out visit your profile: ${shortProfileUrl}`

          const result = await sendHelperAlert(fullPhone, smsText)
          if (result.success) {
            smsSent = true
            await logSms({
              recipient_phone: fullPhone,
              recipient_name: profile.full_name || undefined,
              message: smsText,
              status: 'sent',
              related_task_id: task.id,
              related_user_id: profile.id,
              metadata: { channel: 'admin_alert' },
            }, supabase)
          } else {
            errors.push(`SMS failed: ${result.error}`)
          }
        }
      }
    }

    if (emailSent || smsSent) {
      const channelsSent: string[] = [
        ...(emailSent ? ['email'] : []),
        ...(smsSent ? ['sms'] : []),
      ]

      await supabase
        .from('helper_task_allocations')
        .upsert(
          {
            task_id: task.id,
            helper_id: profile.id,
            allocated_via: 'admin_manual_alert',
            channels: channelsSent,
            first_allocated_at: new Date().toISOString(),
            last_notified_at: new Date().toISOString(),
            last_notified_channels: channelsSent,
            created_by: user.id,
            metadata: {
              source: 'send-user-alert',
              channels_requested: channels,
              task_title: task.title,
            },
          },
          { onConflict: 'task_id,helper_id' }
        )
    }

    return NextResponse.json({ emailSent, smsSent, errors, alreadyAllocated: false })
  } catch (err: any) {
    console.error('Error in send-user-alert route:', err)
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}
