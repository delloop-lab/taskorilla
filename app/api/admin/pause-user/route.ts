import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendTemplateEmail, sendUserPausedNotification } from '@/lib/email'
import { logEmail } from '@/lib/email-logger'

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
    const { userId, pause, reason } = body ?? {}

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Prevent pausing other admins/superadmins
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('role, conduct_guide_viewed_at, pause_warning_sent_at, full_name, email')
      .eq('id', userId)
      .single()

    if (targetProfile?.role === 'admin' || targetProfile?.role === 'superadmin') {
      return NextResponse.json({ error: 'Cannot pause admin accounts' }, { status: 403 })
    }

    const previouslyWarned = !!targetProfile?.pause_warning_sent_at || !!targetProfile?.conduct_guide_viewed_at
    const repeatOffender = pause === true && previouslyWarned

    const updateData: Record<string, unknown> = {
      is_paused: pause === true,
    }
    if (pause === true) {
      updateData.paused_reason = reason || null
      updateData.paused_at = new Date().toISOString()
    } else {
      updateData.paused_reason = null
      updateData.paused_at = null
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    let emailSent = false
    if (pause === true && targetProfile?.email) {
      try {
        const baseUrl = (
          process.env.NEXT_PUBLIC_SITE_URL ||
          process.env.NEXT_PUBLIC_APP_URL ||
          'http://localhost:3000'
        ).replace(/\/$/, '')
        const conductUrl = `${baseUrl}/conduct`

        const { data: template } = await supabase
          .from('email_templates')
          .select('subject, html_content')
          .eq('template_type', 'helper_paused')
          .maybeSingle()

        let emailSubject: string
        if (template) {
          emailSubject = template.subject
            .replace(/\{\{user_name\}\}/g, targetProfile.full_name || 'there')
          await sendTemplateEmail(
            targetProfile.email,
            targetProfile.full_name || '',
            emailSubject,
            template.html_content,
            {
              reason: reason || 'No specific reason provided',
              conduct_url: conductUrl,
            }
          )
        } else {
          emailSubject = 'Your Taskorilla account has been paused'
          await sendUserPausedNotification(
            targetProfile.email,
            targetProfile.full_name || '',
            reason
          )
        }

        emailSent = true
        await supabase
          .from('profiles')
          .update({ pause_warning_sent_at: new Date().toISOString() })
          .eq('id', userId)
        await logEmail({
          recipient_email: targetProfile.email,
          recipient_name: targetProfile.full_name || undefined,
          subject: emailSubject,
          email_type: 'user_paused',
          status: 'sent',
          related_user_id: userId,
          metadata: { reason: reason || null, repeat_offender: repeatOffender, used_db_template: !!template },
        }, supabase)
      } catch (emailErr: any) {
        console.error('[pause-user] failed to send paused email:', emailErr)
      }
    }

    return NextResponse.json({
      success: true,
      is_paused: pause === true,
      email_sent: emailSent,
      repeat_offender: repeatOffender,
      conduct_guide_viewed_at: targetProfile?.conduct_guide_viewed_at || null,
      user_name: targetProfile?.full_name || targetProfile?.email || userId,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}
