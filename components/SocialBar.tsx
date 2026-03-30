'use client'

import { FaFacebookF, FaInstagram, FaTiktok, FaYoutube } from 'react-icons/fa6'
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
          href="https://www.facebook.com/groups/taskorilla/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center"
          aria-label="Follow Taskorilla on Facebook"
        >
          <FaFacebookF className="w-4 h-4 sm:w-5 sm:h-5" />
        </a>
        <a
          href="https://www.instagram.com/taskorilla"
          target="_blank"
          rel="noopener noreferrer"
          className="text-pink-600 hover:text-pink-700 transition-colors inline-flex items-center"
          aria-label="Follow Taskorilla on Instagram"
        >
          <FaInstagram className="w-4 h-4 sm:w-5 sm:h-5" />
        </a>
        <a
          href="https://www.tiktok.com/@taskorilla"
          target="_blank"
          rel="noopener noreferrer"
          className="text-black hover:text-gray-800 dark:text-gray-100 dark:hover:text-white transition-colors inline-flex items-center"
          aria-label="Follow Taskorilla on TikTok"
        >
          <FaTiktok className="w-4 h-4 sm:w-5 sm:h-5" />
        </a>
        <a
          href="https://www.youtube.com/@gettaskorilla"
          target="_blank"
          rel="noopener noreferrer"
          className="text-red-600 hover:text-red-700 transition-colors inline-flex items-center"
          aria-label="Follow Taskorilla on YouTube"
        >
          <FaYoutube className="w-4 h-4 sm:w-5 sm:h-5" />
        </a>
      </div>
    </div>
  )
}

