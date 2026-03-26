'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function PausedBanner() {
  const [paused, setPaused] = useState(false)
  const [reason, setReason] = useState<string | null>(null)

  useEffect(() => {
    async function check() {
      const { data: { user }, error: authErr } = await supabase.auth.getUser()
      if (authErr || !user) return
      const { data } = await supabase
        .from('profiles')
        .select('is_paused, paused_reason')
        .eq('id', user.id)
        .single()
      if (data?.is_paused) {
        setPaused(true)
        setReason(data.paused_reason ?? null)
      }
    }
    check()
  }, [])

  if (!paused) return null

  return (
    <div className="w-full bg-red-600 text-white text-sm px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">⏸</span>
        <span className="font-semibold">Your account has been paused.</span>
        {reason && <span className="opacity-90">Reason: {reason}</span>}
      </div>
      <Link
        href="/contact"
        className="underline text-white font-medium whitespace-nowrap hover:opacity-80"
      >
        Contact support →
      </Link>
    </div>
  )
}
