import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendHelperAlert } from '@/lib/sms'
import { hasSpacedDigitsPattern } from '@/lib/content-filter'

/**
 * Fires an SMS to every superadmin when a user sends an image in a
 * conversation where no bid has been accepted yet.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const conversationId: string | undefined = body?.conversationId
    const taskTitle: string | undefined = body?.taskTitle
    const messagePreview: string = typeof body?.messagePreview === 'string' ? body.messagePreview : ''

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 })
    }

    const { data: sender } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    const senderLabel = sender?.full_name || sender?.email || user.id

    const { data: admins } = await supabase
      .from('profiles')
      .select('phone_number, phone_country_code')
      .eq('role', 'superadmin')
      .not('phone_number', 'is', null)

    if (!admins || admins.length === 0) {
      return NextResponse.json({ sent: false, reason: 'no admin phones' })
    }

    const phones = admins
      .map(a => {
        const phone = (a.phone_number || '').trim()
        if (!phone) return null
        const cc = (a.phone_country_code || '').trim()
        return cc && !phone.startsWith('+') ? `${cc}${phone}` : phone
      })
      .filter(Boolean) as string[]

    if (phones.length === 0) {
      return NextResponse.json({ sent: false, reason: 'no valid phones' })
    }

    const taskLabel = taskTitle ? ` (task: ${taskTitle})` : ''
    const hasSpacedDigits = hasSpacedDigitsPattern(messagePreview)
    const spacedDigitsFlag = hasSpacedDigits ? ' Possible spaced-digit contact pattern detected in message text.' : ''
    const msg = `⚠️ Taskorilla alert: ${senderLabel} sent an IMAGE in a conversation before bid accepted${taskLabel}.${spacedDigitsFlag} Review in admin.`

    const result = await sendHelperAlert(phones, msg)
    return NextResponse.json({ sent: result.success, error: result.error })
  } catch (err: any) {
    console.error('alert-admin-image error:', err)
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}
