import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const token = requestUrl.searchParams.get('token') // Email confirmation token
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') ?? '/tasks'

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Handle email confirmation token (from confirmation email link)
  if (token && type === 'signup') {
    const { error } = await supabase.auth.verifyOtp({
      type: 'email',
      token,
    })

    if (!error) {
      // Email confirmed successfully - redirect to login or tasks
      return NextResponse.redirect(new URL('/login?confirmed=true', requestUrl.origin))
    } else {
      console.error('Email confirmation error:', error)
      return NextResponse.redirect(new URL('/auth/auth-code-error?type=confirmation&error=' + encodeURIComponent(error.message), requestUrl.origin))
    }
  }

  // Handle OTP token_hash (for other auth flows)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash,
    })

    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    } else {
      console.error('OTP verification error:', error)
      return NextResponse.redirect(new URL('/auth/auth-code-error?error=' + encodeURIComponent(error.message), requestUrl.origin))
    }
  }

  // No valid token provided
  return NextResponse.redirect(new URL('/auth/auth-code-error', requestUrl.origin))
}

