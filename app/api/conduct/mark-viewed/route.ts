import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('conduct_guide_viewed_at')
      .eq('id', user.id)
      .single()

    if (profile?.conduct_guide_viewed_at) {
      return NextResponse.json({ already_viewed: true, viewed_at: profile.conduct_guide_viewed_at })
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ conduct_guide_viewed_at: new Date().toISOString() })
      .eq('id', user.id)

    if (updateError) {
      console.error('[conduct/mark-viewed] update failed:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, viewed_at: new Date().toISOString() })
  } catch (err: any) {
    console.error('[conduct/mark-viewed] error:', err)
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}
