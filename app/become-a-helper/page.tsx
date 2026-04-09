'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle } from 'lucide-react'
import Footer from '@/components/Footer'
import { saveSignupConfirmationContext } from '@/lib/signup-confirmation-context'
import { useLanguage } from '@/lib/i18n'

const STEPS_EN = [
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

const BENEFITS_EN = [
  'You set your own rates',
  'Work when you want',
  'No long-term commitment',
  'Earn locally or remotely and build your reputation',
]

const RESEND_COOLDOWN_SECONDS = 300

export default function HelperOnboardingPage() {
  const { language } = useLanguage()
  const isPt = language === 'pt'
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
  const STEPS = isPt
    ? [
        { num: 1, colorClass: 'bg-primary/10 text-primary', title: 'Crie a sua conta', text: 'Registe-se com nome, email e palavra-passe em segundos.' },
        { num: 2, colorClass: 'bg-secondary/10 text-secondary', title: 'Verifique o seu email', text: 'Abra a sua caixa de entrada e clique no link de confirmação que enviamos.' },
        { num: 3, colorClass: 'bg-accent/10 text-accent', title: 'Complete o seu perfil', text: 'Adicione competências, valores e disponibilidade para começar a receber tarefas.' },
      ]
    : STEPS_EN
  const BENEFITS = isPt
    ? [
        'Define os seus próprios preços',
        'Trabalha quando quiser',
        'Sem compromisso de longo prazo',
        'Ganhe localmente ou remotamente e construa a sua reputação',
      ]
    : BENEFITS_EN

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
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/profile?setup=required')}`,
      },
    })

    if (signUpError) {
      const lower = (signUpError.message || '').toLowerCase()
      if (lower.includes('email rate limit') || lower.includes('rate limit')) {
        setShowEmailPauseModal(true)
        startResendCooldown()
        return
      }
      let msg = signUpError.message || (isPt ? 'Ocorreu um erro durante o registo' : 'An error occurred during registration')
      if (signUpError.message.includes('User already registered')) {
        msg = isPt ? 'Já existe uma conta com este email. Inicie sessão em vez disso.' : 'An account with this email already exists. Please sign in instead.'
      } else if (signUpError.message.includes('Password')) {
        msg = isPt ? 'A palavra-passe não cumpre os requisitos. Escolha uma palavra-passe mais forte.' : 'Password does not meet requirements. Please choose a stronger password.'
      } else if (signUpError.message.includes('Email')) {
        msg = isPt ? 'Por favor, introduza um email válido.' : 'Please enter a valid email address.'
      }
      setError(msg)
      return
    }

    if (data.user?.identities?.length === 0) {
      setError('duplicate-email')
      return
    }

    if (data.user) {
      const foundingBadges = ['Founding Tasker', 'Founding Helper']
      await supabase
        .from('profiles')
        .update({
          terms_accepted_at: new Date().toISOString(),
          is_tasker: true,
          is_helper: true,
          badges: foundingBadges,
        })
        .eq('id', data.user.id)

      if (data.session) {
        const queueRes = await fetch('/api/schedule-welcome-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateType: 'helper_welcome',
            source: 'become_helper',
            recipientEmail: email,
            recipientName: fullName,
            relatedUserId: data.user.id,
          }),
        }).catch((err) => {
          console.error('schedule-welcome-email request failed:', err)
          return null
        })
        if (queueRes && !queueRes.ok) {
          const text = await queueRes.text().catch(() => '')
          console.error('schedule-welcome-email non-OK response:', queueRes.status, text)
        }
        router.push('/profile?setup=required')
        router.refresh()
      } else {
        saveSignupConfirmationContext({ email, nextPath: '/profile?setup=required' })
        setTimeout(() => router.push('/auth/auth-code-error?type=confirmation'), 100)
      }
    } else {
      setError(isPt ? 'Falha no registo. Tente novamente.' : 'Registration failed. Please try again.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!termsAccepted) {
      setError(isPt ? 'Tem de aceitar os Termos de Serviço para criar uma conta' : 'You must accept the Terms of Service to create an account')
      setLoading(false)
      return
    }
    if (password !== confirmPassword) {
      setError(isPt ? 'As palavras-passe não coincidem' : 'Passwords do not match')
      setLoading(false)
      return
    }
    if (password.length < 6) {
      setError(isPt ? 'A palavra-passe deve ter pelo menos 6 caracteres' : 'Password must be at least 6 characters long')
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
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] bg-[radial-gradient(#c9d2dc_0.8px,transparent_0.8px)] [background-size:16px_16px]">

      {/* Hero */}
      <section className="bg-[#F8F9FA] py-8 sm:py-12 md:py-16 px-4 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.10),transparent_40%)]" />
        <div className="container mx-auto max-w-4xl relative z-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 md:mb-6 transition-colors text-sm"
          >
            ← {isPt ? 'Voltar ao Início' : 'Back to Home'}
          </Link>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold tracking-wide text-orange-700 shadow-sm mb-4">
                {isPt ? 'Junte-se como Ajudante' : 'Join as a Helper'}
              </p>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-3">
                {isPt ? 'Torne-se um Ajudante Taskorilla' : 'Become a Taskorilla Helper'}
              </h1>
              <p className="text-lg sm:text-xl text-gray-700 max-w-xl">
                {isPt ? 'Ajude pessoas, ganhe dinheiro e trabalhe no seu horário. Comece por criar a sua conta.' : 'Help people, earn money, and work on your schedule. Start by creating your account.'}
              </p>
            </div>
            <a
              href="#register"
              className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold px-6 py-3 rounded-xl shadow hover:shadow-md hover:-translate-y-0.5 transition-all text-base whitespace-nowrap self-start md:self-center flex-shrink-0"
            >
              {isPt ? 'Começar →' : 'Get Started →'}
            </a>
          </div>
        </div>
      </section>

      {/* Main content */}
      <main className="py-10 md:py-14 px-4 flex-1">
        <div className="container mx-auto max-w-4xl space-y-10">

          {/* How It Works */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 text-center">{isPt ? 'Como Funciona' : 'How It Works'}</h2>
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
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-5">{isPt ? 'Porque tornar-se Ajudante?' : 'Why become a Helper?'}</h2>
            <ul className="space-y-3 mb-5">
              {BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-sm sm:text-base">{benefit}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/help/category/helper-guide"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary-700 hover:text-primary-800 hover:underline transition-colors"
            >
              📖 {isPt ? 'Ler o Guia Completo do Ajudante →' : 'Read the full Helper Guide →'}
            </Link>
          </div>

          {/* Registration Form */}
          <div id="register" className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 md:p-8 max-w-md mx-auto w-full scroll-mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{isPt ? 'Crie a Sua Conta de Ajudante' : 'Create Your Helper Account'}</h2>
            <p className="text-gray-500 text-sm mb-6">
              {isPt ? 'Já tem conta?' : 'Already have an account?'}{' '}
              <Link href="/login" className="text-primary font-medium hover:underline">
                {isPt ? 'Iniciar sessão' : 'Sign in'}
              </Link>
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                  {error === 'duplicate-email' ? (
                    <>
                      {isPt ? 'Já existe uma conta com este email. ' : 'An account with this email already exists. '}
                      <Link href="/login" className="font-medium underline text-primary-600 hover:text-primary-500">
                        {isPt ? 'Iniciar sessão em vez disso' : 'Sign in instead'}
                      </Link>.
                    </>
                  ) : (
                    error
                  )}
                </div>
              )}

              <input
                type="text"
                required
                placeholder={isPt ? 'Nome Completo' : 'Full Name'}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <input
                type="email"
                required
                placeholder={isPt ? 'Endereço de email' : 'Email address'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder={isPt ? 'Palavra-passe (mín. 6 caracteres)' : 'Password (min. 6 characters)'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? (isPt ? 'Ocultar palavra-passe' : 'Hide password') : (isPt ? 'Mostrar palavra-passe' : 'Show password')}
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
                placeholder={isPt ? 'Confirmar Palavra-passe' : 'Confirm Password'}
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
                  {isPt ? 'Aceito os ' : 'I accept the '}
                  <Link href="/terms" target="_blank" className="text-primary hover:underline">
                    {isPt ? 'Termos de Serviço' : 'Terms of Service'}
                  </Link>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !termsAccepted}
                className="w-full py-2.5 px-4 bg-primary text-primary-foreground font-semibold rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {loading ? (isPt ? 'A criar conta...' : 'Creating account...') : (isPt ? 'Criar a Minha Conta de Ajudante' : 'Create My Helper Account')}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-gray-500 pb-2">
            {isPt ? 'Após o registo, complete o seu perfil de Ajudante para começar a receber tarefas.' : 'After registration, complete your Helper profile to start receiving tasks.'}
          </p>

        </div>
      </main>

      {/* Email rate-limit modal */}
      {showEmailPauseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">{isPt ? 'Email em Pausa ⏳' : 'Email on Pause ⏳'}</h3>
            <p className="text-sm text-gray-700 mb-6">
              {isPt
                ? 'Tivemos uma pequena pausa no envio de emails de confirmação porque muitas pessoas estão a registar-se agora. O seu email de verificação não foi enviado — tente novamente dentro de alguns minutos. Verifique também a pasta de spam.'
                : 'We&apos;ve hit a short pause on sending confirmation emails because lots of people are signing up right now. Your verification email didn&apos;t go out — please try again in a few minutes. Check your spam folder just in case.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => setShowEmailPauseModal(false)}
                className="px-4 py-2 rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200 text-sm"
              >
                {isPt ? 'Entendi, volto a tentar mais tarde' : 'Got it, I&apos;ll retry later'}
              </button>
              <button
                type="button"
                disabled={resendCountdown > 0 || loading}
                onClick={async () => {
                  setShowEmailPauseModal(false)
                  setLoading(true)
                  setError(null)
                  try { await attemptSignUp() } catch (err: unknown) {
                    setError(err instanceof Error ? err.message : (isPt ? 'Erro inesperado' : 'Unexpected error'))
                  } finally { setLoading(false) }
                }}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {resendCountdown > 0
                  ? (isPt ? `Reenviar email (${Math.ceil(resendCountdown / 60)}m)` : `Resend email (${Math.ceil(resendCountdown / 60)}m)`)
                  : (isPt ? 'Reenviar email' : 'Resend email')}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}
