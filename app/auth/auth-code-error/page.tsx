'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { readSignupConfirmationContext } from '@/lib/signup-confirmation-context'

const RESEND_COOLDOWN_SEC = 60

function AuthCodeErrorContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const type = searchParams.get('type')
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [nextPath, setNextPath] = useState<string>('/profile?setup=required')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  useEffect(() => {
    const ctx = readSignupConfirmationContext()
    if (ctx?.email) {
      setPendingEmail(ctx.email)
      setNextPath(ctx.nextPath || '/profile?setup=required')
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const bootstrap = async () => {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      if (data.session?.user) {
        const hasPendingTask = typeof window !== 'undefined' && localStorage.getItem('pendingTaskData')
        const destination = hasPendingTask ? '/tasks/new' : nextPath
        router.replace(destination)
      } else {
        setIsCheckingSession(false)
      }
    }
    void bootstrap()
    return () => {
      mounted = false
    }
  }, [nextPath, router])

  useEffect(() => {
    if (isCheckingSession) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const hasPendingTask = typeof window !== 'undefined' && localStorage.getItem('pendingTaskData')
        const destination = hasPendingTask ? '/tasks/new' : nextPath
        router.replace(destination)
      }
    })
    return () => subscription.unsubscribe()
  }, [isCheckingSession, nextPath, router])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => {
      setResendCooldown((s) => (s <= 1 ? 0 : s - 1))
    }, 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  const handleResendConfirmation = async () => {
    if (!pendingEmail || resendCooldown > 0 || resendStatus === 'sending') return
    setResendStatus('sending')
    setResendMessage(null)
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: pendingEmail,
      options: { emailRedirectTo },
    })
    if (error) {
      setResendStatus('error')
      const lower = (error.message || '').toLowerCase()
      if (lower.includes('rate limit') || lower.includes('email rate limit')) {
        setResendMessage(
          'Too many emails sent. Wait a few minutes and try again, or check Supabase Auth rate limits.'
        )
      } else {
        setResendMessage(error.message || 'Could not resend. Try again or use another email.')
      }
      return
    }
    setResendStatus('sent')
    setResendMessage('Another confirmation email is on its way. Check spam and promotions folders too.')
    setResendCooldown(RESEND_COOLDOWN_SEC)
  }

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] bg-[radial-gradient(#c9d2dc_0.8px,transparent_0.8px)] [background-size:16px_16px]">
        Loading...
      </div>
    )
  }

  if (type === 'confirmation') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] bg-[radial-gradient(#c9d2dc_0.8px,transparent_0.8px)] [background-size:16px_16px] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div>
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Check Your Email
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              We&apos;ve sent a confirmation email to your inbox. Please click the link in the email to verify your
              account.
            </p>
            {pendingEmail && (
              <p className="mt-3 text-sm text-gray-700 break-all">
                Sent to: <span className="font-medium">{pendingEmail}</span>
              </p>
            )}
            <p className="mt-4 text-sm text-gray-500">
              Didn&apos;t receive the email?{' '}
              <span className="text-red-600 font-medium">Check your spam / promotions folder</span> and try resend
              below.
            </p>
          </div>
          {pendingEmail && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={resendCooldown > 0 || resendStatus === 'sending'}
                className="w-full rounded-md bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendStatus === 'sending'
                  ? 'Sending…'
                  : resendCooldown > 0
                    ? `Resend available in ${resendCooldown}s`
                    : 'Resend confirmation email'}
              </button>
              {resendMessage && (
                <p
                  className={`text-sm ${resendStatus === 'error' ? 'text-red-600' : 'text-gray-600'}`}
                >
                  {resendMessage}
                </p>
              )}
            </div>
          )}
          {!pendingEmail && (
            <p className="text-xs text-gray-500">
              Open this page right after signing up to enable resend. Or register again with the same email (Supabase
              may resend on repeat signup depending on settings).
            </p>
          )}
          <div className="space-y-4">
            <Link
              href={`/login?redirect=${encodeURIComponent(nextPath)}`}
              className="block font-medium text-primary-600 hover:text-primary-500"
            >
              Go to Login
            </Link>
            <Link
              href={`/register?redirect=${encodeURIComponent(nextPath)}`}
              className="block text-sm text-gray-600 hover:text-gray-900"
            >
              Register with a different email
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] bg-[radial-gradient(#c9d2dc_0.8px,transparent_0.8px)] [background-size:16px_16px] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Authentication Error
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            There was an issue verifying your email. Please try again or contact support.
          </p>
        </div>
        <div>
          <Link
            href={`/login?redirect=${encodeURIComponent(nextPath)}`}
            className="font-medium text-primary-600 hover:text-primary-500"
          >
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function AuthCodeError() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] bg-[radial-gradient(#c9d2dc_0.8px,transparent_0.8px)] [background-size:16px_16px]">Loading...</div>}>
      <AuthCodeErrorContent />
    </Suspense>
  )
}





