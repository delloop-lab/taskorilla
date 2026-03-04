'use client'

import { useEffect, useState } from 'react'
import { Share2, Linkedin, Facebook, Twitter } from 'lucide-react'

interface SocialShareButtonsProps {
  url: string
  title: string
  description?: string
}

export default function SocialShareButtons({ url, title, description }: SocialShareButtonsProps) {
  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)
  const encodedDescription = encodeURIComponent(description || '')

  const shareLinks = {
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    // Use Facebook's share dialog - it will scrape OG tags from the URL
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}${encodedDescription ? `&via=taskorilla` : ''}`,
  }

  const handleShare = async (platform: 'linkedin' | 'facebook' | 'twitter') => {
    const link = shareLinks[platform]
    if (link) {
      window.open(link, '_blank', 'width=600,height=400,scrollbars=yes,resizable=yes')
    }
  }

  const handleCopyLink = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url)
        alert('Link copied to clipboard!')
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = url
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        alert('Link copied to clipboard!')
      }
    } catch (err) {
      console.error('Failed to copy link')
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm font-medium text-gray-700">Share:</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleShare('linkedin')}
          className="flex items-center gap-2 px-4 py-2 bg-[#0077b5] text-white rounded-lg hover:bg-[#006399] transition-colors text-sm font-medium"
          aria-label="Share on LinkedIn"
        >
          <Linkedin className="w-4 h-4" />
          LinkedIn
        </button>
        <button
          onClick={() => handleShare('facebook')}
          className="flex items-center gap-2 px-4 py-2 bg-[#1877f2] text-white rounded-lg hover:bg-[#166fe5] transition-colors text-sm font-medium"
          aria-label="Share on Facebook"
        >
          <Facebook className="w-4 h-4" />
          Facebook
        </button>
        <button
          onClick={() => handleShare('twitter')}
          className="flex items-center gap-2 px-4 py-2 bg-[#1da1f2] text-white rounded-lg hover:bg-[#1a91da] transition-colors text-sm font-medium"
          aria-label="Share on Twitter/X"
        >
          <Twitter className="w-4 h-4" />
          Twitter
        </button>
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
          aria-label="Copy blog link"
        >
          <Share2 className="w-4 h-4" />
          Copy
        </button>
      </div>
    </div>
  )
}
