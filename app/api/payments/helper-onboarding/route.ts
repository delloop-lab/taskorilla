import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { executeHelperOnboardingPost, executeHelperOnboardingGet } from '@/services/payments/helper-onboarding'

/**
 * Helper Onboarding API
 * POST /api/payments/helper-onboarding - Start onboarding
 * GET /api/payments/helper-onboarding - Get status
 * Provider selection is handled entirely in services/payments/helper-onboarding.ts
 */

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', debug: { authError: authError?.message, hasUser: !!user } },
        { status: 401 }
      )
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, is_helper, stripe_account_id, iban, paypal_email')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (!profile.is_helper) {
      return NextResponse.json({ error: 'User is not registered as a helper' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const result = await executeHelperOnboardingPost(supabase, {
      userId: user.id,
      userEmail: user.email ?? null,
      profile,
      body,
    })

    if ('status' in result && result.status >= 400) {
      return NextResponse.json(result.body, { status: result.status })
    }

    return NextResponse.json((result as { success: true; data: object }).data)
  } catch (error) {
    console.error('[Helper Onboarding] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to process helper onboarding', details: message },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, is_helper, stripe_account_id, iban, paypal_email')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const result = await executeHelperOnboardingGet({ profile })

    if ('status' in result && result.status >= 400) {
      return NextResponse.json(result.body, { status: result.status })
    }

    return NextResponse.json((result as { success: true; data: object }).data)
  } catch (error) {
    console.error('[Helper Onboarding] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to get onboarding status', details: message },
      { status: 500 }
    )
  }
}
