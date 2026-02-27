'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Footer from '@/components/Footer'
import { MapPin, Mail, Phone, Facebook, Instagram, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const TILE_COUNT = 5
const SLOT_HEIGHT = 56 // px – height of each tile and row

// Tool / task themed icons (wide support)
const BASE_ICONS = ['🔨', '🔧', '🖌️', '🧹', '📋', '💻', '📦', '📏', '💡', '🛠️', '✏️', '🛍️', '🧰', '📞']

// Reel strip with Tee mixed in once, plus a couple of extra icons for smooth looping
const REEL_STRIP = [...BASE_ICONS, 'TEE', ...BASE_ICONS.slice(0, 3)]
const STRIP_LENGTH = REEL_STRIP.length
const TEE_INDEX = REEL_STRIP.indexOf('TEE')
const NON_TEE_INDICES = BASE_ICONS.map((icon) => REEL_STRIP.indexOf(icon))

type TeeSlotCaptchaProps = {
  onValidChange?: (isValid: boolean) => void
}

const sampleDistinctNonTeeOffsets = (count: number) => {
  const pool = [...NON_TEE_INDICES]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count)
}

function TeeSlotCaptcha({ onValidChange }: TeeSlotCaptchaProps) {
  // Deterministic initial icons so server and client match for hydration,
  // while still showing different symbols in each box.
  const [reelOffsets, setReelOffsets] = useState<number[]>(() =>
    Array.from({ length: TILE_COUNT }, (_, i) => i % BASE_ICONS.length)
  )
  const [spinning, setSpinning] = useState(false)
  const [selectedTile, setSelectedTile] = useState<number | null>(null)
  const [teeRevealed, setTeeRevealed] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const runningReelsRef = useRef(0)
  const [hasShownTeeOnce, setHasShownTeeOnce] = useState(false)

  const getAudioCtx = () => {
    if (typeof window === 'undefined') return null
    const AnyWindow = window as any
    const Ctx = (window.AudioContext || AnyWindow.webkitAudioContext) as typeof AudioContext | undefined
    if (!Ctx) return null
    if (!audioCtxRef.current) {
      audioCtxRef.current = new Ctx()
    }
    return audioCtxRef.current
  }

  const playTickSound = () => {
    // Audio disabled for captcha spinner
  }

  const playSuccessSound = () => {
    // Audio disabled for captcha spinner
  }

  const startSpin = () => {
    if (spinning) return

    setSpinning(true)
    setSelectedTile(null)
    setTeeRevealed(false)
    setLocalError(null)
    onValidChange?.(false)

    // Decide target offsets for this spin
    const targets: number[] = []

    if (!hasShownTeeOnce) {
      // First spin: always land Tee on the last reel
      const nonTeeTargets = sampleDistinctNonTeeOffsets(TILE_COUNT - 1)
      let cursor = 0
      for (let reel = 0; reel < TILE_COUNT; reel++) {
        if (reel === TILE_COUNT - 1) {
          targets.push(TEE_INDEX)
        } else {
          targets.push(nonTeeTargets[cursor++])
        }
      }
      setHasShownTeeOnce(true)
    } else {
      // Subsequent spins: Tee can appear on any reel
      const teeReel = Math.floor(Math.random() * TILE_COUNT)
      const nonTeeTargets = sampleDistinctNonTeeOffsets(TILE_COUNT - 1)
      let cursor = 0
      for (let reel = 0; reel < TILE_COUNT; reel++) {
        if (reel === teeReel) {
          targets.push(TEE_INDEX)
        } else {
          targets.push(nonTeeTargets[cursor++])
        }
      }
    }

    runningReelsRef.current = TILE_COUNT

    for (let reel = 0; reel < TILE_COUNT; reel++) {
      spinSingleReel(reel, targets[reel])
    }
  }

  const spinSingleReel = (reelIndex: number, targetOffset: number) => {
    const currentOffset = reelOffsets[reelIndex] ?? 0
    const minSteps = 18 + Math.floor(Math.random() * 6)

    const rawDelta = (targetOffset - currentOffset + STRIP_LENGTH) % STRIP_LENGTH
    const minCycles = Math.max(0, Math.ceil((minSteps - rawDelta) / STRIP_LENGTH))
    const extraCycles = Math.floor(Math.random() * 2)
    const totalSteps = rawDelta + (minCycles + extraCycles) * STRIP_LENGTH

    const startDelay = reelIndex * 120
    let step = 0

    const doStep = () => {
      step += 1

      setReelOffsets((prev) => {
        const next = [...prev]
        next[reelIndex] = (next[reelIndex] + 1) % STRIP_LENGTH
        return next
      })

      playTickSound()

      if (step < totalSteps) {
        const progress = step / totalSteps
        const baseDelay = 45
        const extra = 220 * progress * progress
        const delay = baseDelay + extra
        window.setTimeout(doStep, delay)
      } else {
        runningReelsRef.current -= 1
        if (runningReelsRef.current === 0) {
          setSpinning(false)
        }
      }
    }

    window.setTimeout(doStep, startDelay)
  }

  const handleTileClick = (index: number) => {
    if (spinning) return

    setSelectedTile(index)

    const offset = reelOffsets[index]
    const symbol = REEL_STRIP[offset]
    const isCorrect = symbol === 'TEE'
    if (isCorrect) {
      setTeeRevealed(true)
      setLocalError(null)
      onValidChange?.(true)
      playSuccessSound()
    } else {
      setTeeRevealed(false)
      setLocalError("Nope, that's not Tee!")
      onValidChange?.(false)
    }
  }

  const renderReel = (reelIndex: number) => {
    const offset = reelOffsets[reelIndex]
    const rawSymbol = REEL_STRIP[offset]
    const isTeeSymbol = rawSymbol === 'TEE'
    const icon = !isTeeSymbol && rawSymbol && String(rawSymbol).trim().length > 0 ? rawSymbol : '🔨'
    const isSelectedWrong = selectedTile === reelIndex && !spinning && !teeRevealed && !isTeeSymbol

    return (
      <button
        key={reelIndex}
        type="button"
        onClick={() => handleTileClick(reelIndex)}
        className="flex flex-col items-center justify-center rounded-2xl border px-2 py-3 text-center text-xs font-medium transition-all border-gray-200 bg-gray-50 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        aria-label="Captcha slot reel"
      >
        <div className="relative w-14 h-16 flex items-center justify-center overflow-hidden rounded-2xl bg-white">
          {isSelectedWrong && (
            <span className="absolute inset-0 z-10 flex items-center justify-center text-3xl font-bold text-red-500 pointer-events-none">
              ×
            </span>
          )}
          {isTeeSymbol ? (
            <img
              src="/images/taskorilla-mascot.png"
              alt="Tee the Taskorilla mascot"
              className="h-10 w-auto object-contain"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className="text-2xl leading-none">{icon}</span>
          )}
        </div>
      </button>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-800">Friendly check</p>

      <div className="mt-1 space-y-3">
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: TILE_COUNT }).map((_, idx) => renderReel(idx))}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={startSpin}
            disabled={spinning}
            className="inline-flex items-center justify-center px-3 py-1.5 rounded-full bg-primary-600 text-white text-xs font-semibold shadow-sm hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {spinning ? 'Spinning…' : 'Spin'}
          </button>

          {teeRevealed && !localError ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
              <span className="text-xs leading-none">✓</span>
              <span>Great, you&apos;re good to go!</span>
            </span>
          ) : localError ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-red-700 max-w-[220px]">
              <span className="text-xs leading-none">⚠️</span>
              <span className="leading-snug">{localError}</span>
            </span>
          ) : (
            <span className="text-[11px] text-gray-500">Find Tee to confirm you’re human.</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ContactPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [captchaValid, setCaptchaValid] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Prefill contact details for logged-in users
  useEffect(() => {
    let isMounted = true

    const loadUser = async () => {
      try {
        const { data } = await supabase.auth.getUser()
        const user = data?.user
        if (!user || !isMounted) return

        // Only prefill fields the user hasn't already started typing
        if (!email) {
          setEmail(user.email || '')
        }

        const fullName = (user.user_metadata as any)?.full_name as string | undefined
        if (fullName && !firstName && !lastName) {
          const parts = fullName.trim().split(/\s+/)
          const first = parts[0] || ''
          const last = parts.slice(1).join(' ')

          if (first) setFirstName(first)
          if (last) setLastName(last)
        }
      } catch (err) {
        console.error('Error pre-filling contact form from user profile:', err)
      }
    }

    loadUser()

    return () => {
      isMounted = false
    }
    // Run once on mount; we intentionally don't depend on state setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!captchaValid) {
      setError('Please find Tee to confirm you’re human.')
      return
    }

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setError('Please fill in all required fields.')
      return
    }

    setSubmitting(true)
    try {
      const escapeHtml = (text: string) =>
        text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;')

      const safeMessage = escapeHtml(message).replace(/\n/g, '<br />')

      const htmlMessage = `
        <p><strong>New contact form submission from Taskorilla.com</strong></p>
        <p><strong>Name:</strong> ${escapeHtml(firstName)} ${escapeHtml(lastName)}</p>
        <p><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
        <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
        <p><strong>Message:</strong><br />${safeMessage}</p>
      `.trim()

      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'admin_email',
          recipientEmail: 'tee@taskorilla.com',
          recipientName: 'Tee at Taskorilla',
          subject: `Contact form: ${subject}`,
          message: htmlMessage,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to send message. Please try again.')
      }

      setSuccess('Thanks! Tee has received your message and will get back to you shortly.')
      setFirstName('')
      setLastName('')
      setEmail('')
      setSubject('')
      setMessage('')
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 mb-4"
          >
            <span className="mr-1">←</span> Back to Home
          </Link>

          <div className="max-w-3xl mb-8">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-3">
              Contact Us
            </h1>
            <p className="text-gray-700 text-base sm:text-lg leading-relaxed">
              We’d love to hear from you! Whether it’s questions, feedback, or partnership inquiries,
              fill out the form below and we’ll get back to you as soon as possible.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)] items-start">
            {/* Contact form */}
            <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 sm:p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Send us a message
              </h2>

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                      autoComplete="given-name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                      autoComplete="family-name"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                    autoComplete="email"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white resize-vertical"
                    required
                  />
                </div>

                {/* Fun captcha with Tee */}
                <TeeSlotCaptcha onValidChange={setCaptchaValid} />

                <div className="pt-2 flex justify-center">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                  >
                    {submitting && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                    )}
                    {submitting ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </form>
            </section>

            {/* Contact details */}
            <section className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 sm:p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Contact details
                </h2>
                <div className="space-y-3 text-sm text-gray-700">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Taskorilla HQ</p>
                      <p>202/1101 Hay Street</p>
                      <p>Western Australia 6005</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Taskorilla Europe</p>
                      <p>Apartado 682</p>
                      <p>EC Lagos 8600-999</p>
                      <p>Portugal</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-primary-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Email</p>
                      <a
                        href="mailto:tee@taskorilla.com"
                        className="text-primary-700 hover:text-primary-800 break-all"
                      >
                        tee@taskorilla.com
                      </a>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 space-y-2">
                  <p className="text-sm font-medium text-gray-900">
                    Connect with us
                  </p>
                  <div className="flex items-center gap-3">
                    <a
                      href="https://www.facebook.com/profile.php?id=61584791914940"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100"
                      aria-label="Taskorilla on Facebook"
                    >
                      <Facebook className="w-5 h-5" />
                    </a>
                    <a
                      href="https://www.instagram.com/taskorilla"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-pink-50 text-pink-600 hover:bg-pink-100"
                      aria-label="Taskorilla on Instagram"
                    >
                      <Instagram className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

