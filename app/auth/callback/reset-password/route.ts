import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const token = requestUrl.searchParams.get('token')
  const type = requestUrl.searchParams.get('type')
  const email = requestUrl.searchParams.get('email')

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

  const redirectSuccess = () =>
    NextResponse.redirect(new URL('/reset-password?mode=recovery', requestUrl.origin))
  const redirectError = (message: string) =>
    NextResponse.redirect(
      new URL(
        `/reset-password?error=invalid_token&error_description=${encodeURIComponent(message)}`,
        requestUrl.origin
      )
    )

  // PKCE/code flow
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return redirectSuccess()
    console.error('Password recovery code exchange error:', error)
    return redirectError(error.message)
  }

  // token_hash recovery flow
  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      type: 'recovery',
      token_hash: tokenHash,
    })
    if (!error) return redirectSuccess()
    console.error('Password recovery token_hash error:', error)
    return redirectError(error.message)
  }

  // token recovery flow
  if (token && (type === 'recovery' || !type)) {
    const verifyPayload: any = {
      type: 'recovery',
      token,
    }
    if (email) verifyPayload.email = email
    const { error } = await supabase.auth.verifyOtp(verifyPayload)
    if (!error) return redirectSuccess()
    console.error('Password recovery token error:', error)
    return redirectError(error.message)
  }

  // If user is already authenticated, let them continue to set a new password.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) return redirectSuccess()

  return redirectError('Invalid or expired password reset link.')
}

