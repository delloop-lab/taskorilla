import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)

  const token = requestUrl.searchParams.get('token') // Email confirmation token
  const token_hash = requestUrl.searchParams.get('token_hash') // OTP token hash
  const type = requestUrl.searchParams.get('type')
  const email = requestUrl.searchParams.get('email') // required for email verification
  const next = requestUrl.searchParams.get('next') ?? '/tasks'

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Handle email confirmation token (signup link)
  if (token && type === 'signup' && email) {
    const { error } = await supabase.auth.verifyOtp({
      type: 'email',
      token,
      email, // required by Supabase type
    })

    if (!error) {
      return NextResponse.redirect(new URL('/login?confirmed=true', requestUrl.origin))
    } else {
      console.error('Email confirmation error:', error)
      return NextResponse.redirect(
        new URL('/auth/auth-code-error?type=confirmation&error=' + encodeURIComponent(error.message), requestUrl.origin)
      )
    }
  }

  // Handle OTP token_hash (other auth flows, like login)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      // For token_hash flows we only support email-based OTP right now
      // Supabase expects an EmailOtpType here (e.g. 'magiclink' or 'signup')
      type: type as 'magiclink' | 'signup',
      token_hash,
    })

    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    } else {
      console.error('OTP verification error:', error)
      return NextResponse.redirect(
        new URL('/auth/auth-code-error?error=' + encodeURIComponent(error.message), requestUrl.origin)
      )
    }
  }

  // No valid token provided
  return NextResponse.redirect(new URL('/auth/auth-code-error', requestUrl.origin))
}

