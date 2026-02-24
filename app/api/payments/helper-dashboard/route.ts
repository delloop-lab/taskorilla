import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { executeHelperDashboard } from '@/services/payments/helper-dashboard'

export const dynamic = 'force-dynamic'

/**
 * Helper Dashboard Access API
 * GET /api/payments/helper-dashboard
 * Provider selection is handled entirely in services/payments/helper-dashboard.ts
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, is_helper, stripe_account_id, iban')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (!profile.is_helper) {
      return NextResponse.json(
        { error: 'User is not registered as a helper' },
        { status: 400 }
      )
    }

    const result = await executeHelperDashboard({ profile })

    if ('status' in result && result.status >= 400) {
      return NextResponse.json(result.body, { status: result.status })
    }

    return NextResponse.json((result as { success: true; data: object }).data)
  } catch (error) {
    console.error('[Helper Dashboard] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to get dashboard access', details: message },
      { status: 500 }
    )
  }
}
