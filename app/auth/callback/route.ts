import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { getSafeInternalPath } from '@/lib/safe-next-path'
import { queueWelcomeEmailAfterEmailConfirmation } from '@/lib/queue-scheduled-welcome-email'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)

  const token = requestUrl.searchParams.get('token') // Email confirmation token
  const token_hash = requestUrl.searchParams.get('token_hash') // OTP token hash
  const code = requestUrl.searchParams.get('code') // PKCE auth code
  const type = requestUrl.searchParams.get('type')
  const email = requestUrl.searchParams.get('email') // required for email verification
  const nextParam = requestUrl.searchParams.get('next')
  const nextAfterCode = getSafeInternalPath(nextParam, '/tasks')
  const nextAfterSignup = getSafeInternalPath(nextParam, '/profile?setup=required')

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
    const { data: exchangeData, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      const isRecoveryFlow = type === 'recovery' || nextAfterCode === '/reset-password'
      if (!isRecoveryFlow) {
        const exchangeUserId =
          exchangeData?.user?.id || exchangeData?.session?.user?.id || null

        let confirmedUserId = exchangeUserId
        if (!confirmedUserId) {
          const {
            data: { user },
          } = await supabase.auth.getUser()
          confirmedUserId = user?.id || null
        }

        if (confirmedUserId) {
          console.info('welcome_queue_attempt', {
            userId: confirmedUserId,
            flow: 'code_exchange',
            type,
            requireRecentEmailConfirmation: type !== 'signup',
          })
          const welcomeResult = await queueWelcomeEmailAfterEmailConfirmation(confirmedUserId, {
            // For explicit signup callbacks, queue directly.
            // For ambiguous code flows, require recent confirmation to avoid stale-login enqueueing.
            requireRecentEmailConfirmation: type !== 'signup',
            source: 'auth_callback',
            meta: {
              callbackFlow: 'code_exchange',
              callbackType: type || null,
            },
          })
          console.info('welcome_queue_result', {
            userId: confirmedUserId,
            flow: 'code_exchange',
            type,
            ...welcomeResult,
          })
          if (!welcomeResult.ok) {
            console.error('Welcome email queue after code confirm:', welcomeResult.reason)
          }
        } else {
          console.error('Welcome email queue after code confirm: no user id available')
        }
      }
      // If this is a recovery flow, redirect to reset-password
      if (nextAfterCode === '/reset-password') {
        return NextResponse.redirect(new URL('/reset-password?mode=recovery', requestUrl.origin))
      }
      return NextResponse.redirect(new URL(nextAfterCode, requestUrl.origin))
    } else {
      console.error('Code exchange error:', error)
      if (nextAfterCode === '/reset-password') {
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
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user?.id) {
        console.info('welcome_queue_attempt', {
          userId: user.id,
          flow: 'token_signup',
          type,
        })
        const welcomeResult = await queueWelcomeEmailAfterEmailConfirmation(user.id, {
          requireRecentEmailConfirmation: false,
          source: 'auth_callback',
          meta: {
            callbackFlow: 'token_signup',
            callbackType: type || null,
          },
        })
        console.info('welcome_queue_result', {
          userId: user.id,
          flow: 'token_signup',
          type,
          ...welcomeResult,
        })
        if (!welcomeResult.ok) {
          console.error('Welcome email queue after email confirm:', welcomeResult.reason)
        }
      }
      return NextResponse.redirect(new URL(nextAfterSignup, requestUrl.origin))
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
      type: type as 'magiclink' | 'signup' | 'email',
      token_hash,
    })

    if (!error) {
      // New signup confirmations should go to profile setup unless a safe next was provided
      if (type === 'signup' || type === 'email') {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user?.id) {
          console.info('welcome_queue_attempt', {
            userId: user.id,
            flow: 'token_hash',
            type,
            requireRecentEmailConfirmation: type === 'email',
          })
          // `type=email` is the usual Supabase confirm link; guard so stale magic-link logins
          // do not enqueue a welcome. `type=signup` is explicit signup confirmation.
          const welcomeResult = await queueWelcomeEmailAfterEmailConfirmation(user.id, {
            requireRecentEmailConfirmation: type === 'email',
            source: 'auth_callback',
            meta: {
              callbackFlow: 'token_hash',
              callbackType: type || null,
            },
          })
          console.info('welcome_queue_result', {
            userId: user.id,
            flow: 'token_hash',
            type,
            ...welcomeResult,
          })
          if (!welcomeResult.ok) {
            console.error('Welcome email queue after email confirm:', welcomeResult.reason)
          }
        }
        return NextResponse.redirect(new URL(nextAfterSignup, requestUrl.origin))
      }
      return NextResponse.redirect(new URL(nextAfterCode, requestUrl.origin))
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

