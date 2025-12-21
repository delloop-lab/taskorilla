import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)

  const token = requestUrl.searchParams.get('token') // Email confirmation token
  const token_hash = requestUrl.searchParams.get('token_hash') // OTP token hash
  const code = requestUrl.searchParams.get('code') // PKCE auth code
  const type = requestUrl.searchParams.get('type')
  const email = requestUrl.searchParams.get('email') // required for email verification
  const next = requestUrl.searchParams.get('next') ?? '/tasks'

  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  // Handle PKCE code exchange (used by password recovery and other flows)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // If this is a recovery flow, redirect to reset-password
      if (next === '/reset-password') {
        return NextResponse.redirect(new URL('/reset-password?mode=recovery', requestUrl.origin))
      }
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    } else {
      console.error('Code exchange error:', error)
      if (next === '/reset-password') {
        return NextResponse.redirect(
          new URL('/reset-password?error=invalid_token&error_description=' + encodeURIComponent(error.message), requestUrl.origin)
        )
      }
      return NextResponse.redirect(
        new URL('/auth/auth-code-error?error=' + encodeURIComponent(error.message), requestUrl.origin)
      )
    }
  }

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

  // Handle password recovery flow
  if (token_hash && type === 'recovery') {
    const { error } = await supabase.auth.verifyOtp({
      type: 'recovery',
      token_hash,
    })

    if (!error) {
      // Redirect to reset password page - the session is now active
      return NextResponse.redirect(new URL('/reset-password', requestUrl.origin))
    } else {
      console.error('Password recovery error:', error)
      return NextResponse.redirect(
        new URL('/reset-password?error=invalid_token&error_description=' + encodeURIComponent(error.message), requestUrl.origin)
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

