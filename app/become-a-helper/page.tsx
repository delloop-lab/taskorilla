'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle } from 'lucide-react'
import Footer from '@/components/Footer'

const STEPS = [
  {
    num: 1,
    colorClass: 'bg-primary/10 text-primary',
    title: 'Create your account',
    text: 'Sign up with your name, email, and password in seconds.',
  },
  {
    num: 2,
    colorClass: 'bg-secondary/10 text-secondary',
    title: 'Verify your email',
    text: "Check your inbox and click the confirmation link we'll send you.",
  },
  {
    num: 3,
    colorClass: 'bg-accent/10 text-accent',
    title: 'Complete your profile',
    text: 'Add your skills, rates, and availability to start receiving tasks.',
  },
]

const BENEFITS = [
  'You set your own rates',
  'Work when you want',
  'No long-term commitment',
  'Earn locally or remotely and build your reputation',
]

const RESEND_COOLDOWN_SECONDS = 300

export default function HelperOnboardingPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showEmailPauseModal, setShowEmailPauseModal] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(0)

  const startResendCooldown = () => {
    setResendCountdown(RESEND_COOLDOWN_SECONDS)
    const interval = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  const attemptSignUp = async () => {
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    if (signUpError) {
      const lower = (signUpError.message || '').toLowerCase()
      if (lower.includes('email rate limit') || lower.includes('rate limit')) {
        setShowEmailPauseModal(true)
        startResendCooldown()
        return
      }
      let msg = signUpError.message || 'An error occurred during registration'
      if (signUpError.message.includes('User already registered')) {
        msg = 'An account with this email already exists. Please sign in instead.'
      } else if (signUpError.message.includes('Password')) {
        msg = 'Password does not meet requirements. Please choose a stronger password.'
      } else if (signUpError.message.includes('Email')) {
        msg = 'Please enter a valid email address.'
      }
      setError(msg)
      return
    }

    if (data.user) {
      await supabase
        .from('profiles')
        .update({ terms_accepted_at: new Date().toISOString() })
        .eq('id', data.user.id)

      if (data.session) {
        router.push('/profile?setup=required')
        router.refresh()
      } else {
        setTimeout(() => router.push('/auth/auth-code-error?type=confirmation'), 100)
      }
    } else {
      setError('Registration failed. Please try again.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!termsAccepted) {
      setError('You must accept the Terms of Service to create an account')
      setLoading(false)
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    try {
      await attemptSignUp()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-accent text-white py-8 sm:py-12 md:py-16 px-4 relative overflow-hidden">
        <div className="container mx-auto max-w-4xl relative z-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-4 md:mb-6 transition-colors text-sm"
          >
            ← Back to Home
          </Link>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="text-5xl mb-4">🤝</div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3">
                Become a Taskorilla Helper
              </h1>
              <p className="text-lg sm:text-xl opacity-90 max-w-xl">
                Help people, earn money, and work on your schedule. Start by creating your account.
              </p>
            </div>
            <a
              href="#register"
              className="inline-flex items-center justify-center gap-2 bg-white text-primary font-bold px-6 py-3 rounded-xl shadow hover:shadow-md hover:-translate-y-0.5 transition-all text-base whitespace-nowrap self-start md:self-center flex-shrink-0"
            >
              Get Started →
            </a>
          </div>
        </div>
      </section>

      {/* Main content */}
      <main className="py-10 md:py-14 px-4 flex-1">
        <div className="container mx-auto max-w-4xl space-y-10">

          {/* How It Works */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 text-center">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {STEPS.map((step) => (
                <Card key={step.num} className="hover-scale">
                  <CardContent className="p-6 space-y-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${step.colorClass}`}>
                      {step.num}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{step.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-bold text-blue-900 mb-5">Why become a Helper?</h2>
            <ul className="space-y-3">
              {BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span className="text-blue-800 text-sm sm:text-base">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Registration Form */}
          <div id="register" className="bg-white rounded-xl shadow-sm p-6 md:p-8 max-w-md mx-auto w-full scroll-mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Create Your Helper Account</h2>
            <p className="text-gray-500 text-sm mb-6">
              Already have an account?{' '}
              <Link href="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                  {error}
                </div>
              )}

              <input
                type="text"
                required
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <input
                type="email"
                required
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Password (min. 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>

              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />

              <div className="flex items-start gap-3">
                <input
                  id="terms"
                  type="checkbox"
                  required
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="h-4 w-4 mt-0.5 text-primary border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="terms" className="text-sm text-gray-700 cursor-pointer">
                  I accept the{' '}
                  <Link href="/terms" target="_blank" className="text-primary hover:underline">
                    Terms of Service
                  </Link>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !termsAccepted}
                className="w-full py-2.5 px-4 bg-primary text-primary-foreground font-semibold rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {loading ? 'Creating account...' : 'Create My Helper Account'}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-gray-500 pb-2">
            After registration, complete your Helper profile to start receiving tasks.
          </p>

        </div>
      </main>

      {/* Email rate-limit modal */}
      {showEmailPauseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Email on Pause ⏳</h3>
            <p className="text-sm text-gray-700 mb-6">
              We&apos;ve hit a short pause on sending confirmation emails because lots of people are signing up right now.
              Your verification email didn&apos;t go out — please try again in a few minutes. Check your spam folder just in case.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => setShowEmailPauseModal(false)}
                className="px-4 py-2 rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200 text-sm"
              >
                Got it, I&apos;ll retry later
              </button>
              <button
                type="button"
                disabled={resendCountdown > 0 || loading}
                onClick={async () => {
                  setShowEmailPauseModal(false)
                  setLoading(true)
                  setError(null)
                  try { await attemptSignUp() } catch (err: unknown) {
                    setError(err instanceof Error ? err.message : 'Unexpected error')
                  } finally { setLoading(false) }
                }}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {resendCountdown > 0 ? `Resend email (${Math.ceil(resendCountdown / 60)}m)` : 'Resend email'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}
