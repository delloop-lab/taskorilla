'use client'

import { Facebook, Instagram } from 'lucide-react'
import clsx from 'clsx'

interface SocialBarProps {
  className?: string
}

export function SocialBar({ className }: SocialBarProps) {
  return (
    <div
      className={clsx(
        'flex items-center gap-3 text-muted-foreground',
        'bg-background/80 backdrop-blur-sm rounded-full px-3.5 py-1.5 shadow-sm',
        'border border-border/60',
        className
      )}
    >
      <span className="text-sm font-medium hidden sm:inline-block">
        Follow me!
      </span>
      <div className="flex items-center gap-2">
        <a
          href="https://www.facebook.com/profile.php?id=61584791914940"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center"
          aria-label="Follow Taskorilla on Facebook"
        >
          <Facebook className="w-5 h-5 sm:w-6 sm:h-6" />
        </a>
        <a
          href="https://www.instagram.com/taskorilla"
          target="_blank"
          rel="noopener noreferrer"
          className="text-pink-600 hover:text-pink-700 transition-colors inline-flex items-center"
          aria-label="Follow Taskorilla on Instagram"
        >
          <Instagram className="w-5 h-5 sm:w-6 sm:h-6" />
        </a>
      </div>
    </div>
  )
}

