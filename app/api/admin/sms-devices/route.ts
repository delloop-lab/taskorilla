import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const user_ = process.env.SMS_GATE_USER
    const pass = process.env.SMS_GATE_PASS

    if (!user_ || !pass) {
      return NextResponse.json({ error: 'SMS_GATE_USER or SMS_GATE_PASS env vars are not set' }, { status: 500 })
    }

    const credentials = Buffer.from(`${user_}:${pass}`).toString('base64')

    const res = await fetch('https://api.sms-gate.app/3rdparty/v1/devices', {
      headers: { Authorization: `Basic ${credentials}` },
    })

    const text = await res.text()
    if (!res.ok) {
      return NextResponse.json({ error: `SMSGate returned ${res.status}: ${text}` }, { status: 500 })
    }

    const devices = JSON.parse(text)
    return NextResponse.json({ devices })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}
