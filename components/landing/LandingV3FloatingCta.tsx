'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function LandingV3FloatingCta() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 340)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      className={`fixed inset-x-3 bottom-3 z-40 md:hidden transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0 pointer-events-none'
      }`}
    >
      <Link
        href="/tasks/new"
        className="inline-flex w-full items-center justify-center rounded-2xl bg-primary-600 px-5 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary-600/30"
      >
        Post a Task
      </Link>
    </div>
  )
}

