import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendHelperAlert } from '@/lib/sms'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const phone: string = body?.phone

    if (!phone || phone.trim() === '') {
      return NextResponse.json({ error: 'phone is required' }, { status: 400 })
    }

    const result = await sendHelperAlert(phone.trim(), 'This is a test SMS from Taskorilla admin panel. ✅')

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, messageId: result.messageId })
  } catch (err: any) {
    console.error('Error in test-sms route:', err)
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}
