'use client'

import { useState } from 'react'

const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|ogg|ogv|m4v)(\?|$)/i
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i

function getMediaKind(url: string): 'image' | 'video' | 'youtube' | 'vimeo' | 'facebook' | 'unknown' {
  const u = url.trim().toLowerCase()
  if (!u) return 'unknown'
  if (VIDEO_EXTENSIONS.test(u)) return 'video'
  if (IMAGE_EXTENSIONS.test(u)) return 'image'
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube'
  if (u.includes('vimeo.com')) return 'vimeo'
  if (u.includes('fb.watch') || u.includes('facebook.com') || u.includes('fb.com')) return 'facebook'
  return 'unknown'
}

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    const v = parsed.searchParams.get('v') || (parsed.hostname === 'youtu.be' ? parsed.pathname.slice(1) : null)
    if (v) return `https://www.youtube.com/embed/${v}`
  } catch {
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/)
    if (m) return `https://www.youtube.com/embed/${m[1]}`
  }
  return null
}

function getVimeoEmbedUrl(url: string): string | null {
  try {
    const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
    if (m) return `https://player.vimeo.com/video/${m[1]}`
  } catch {
    //
  }
  return null
}

export interface MediaPreviewProps {
  url: string
  /** Alt text for image preview; default "Post media" */
  alt?: string
  /** Optional class for the container or root element */
  className?: string
}

export function MediaPreview({ url, alt = 'Post media', className = '' }: MediaPreviewProps) {
  const [imgError, setImgError] = useState(false)
  const kind = getMediaKind(url)
  const youtubeEmbed = kind === 'youtube' ? getYouTubeEmbedUrl(url) : null
  const vimeoEmbed = kind === 'vimeo' ? getVimeoEmbedUrl(url) : null

  if (kind === 'video') {
    return (
      <video
        src={url}
        controls
        playsInline
        className={`max-h-44 w-full object-contain rounded ${className}`.trim()}
      />
    )
  }
  if (youtubeEmbed) {
    return (
      <iframe
        src={youtubeEmbed}
        title="YouTube video preview"
        className={`w-full max-w-md aspect-video rounded ${className}`.trim()}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    )
  }
  if (vimeoEmbed) {
    return (
      <iframe
        src={vimeoEmbed}
        title="Vimeo video preview"
        className={`w-full max-w-md aspect-video rounded ${className}`.trim()}
        allow="fullscreen; picture-in-picture"
        allowFullScreen
      />
    )
  }
  if (kind === 'facebook') {
    const embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
      url
    )}&show_text=false&width=500`
    return (
      <div className={`w-full flex justify-center ${className}`.trim()}>
        <iframe
          src={embedUrl}
          title="Facebook video preview"
          className="w-full max-w-md aspect-video rounded border border-gray-200"
          scrolling="no"
          frameBorder={0}
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    )
  }
  if (kind === 'image' || kind === 'unknown') {
    if (imgError) {
      return (
        <div className={`flex flex-col items-center justify-center gap-2 p-4 text-center ${className}`.trim()}>
          <span className="text-xs text-gray-500">Preview not available for this URL</span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline truncate max-w-full"
          >
            Open in new tab
          </a>
        </div>
      )
    }
    return (
      <img
        src={url}
        alt={alt}
        className={`max-h-44 w-auto object-contain rounded ${className}`.trim()}
        onError={() => setImgError(true)}
      />
    )
  }
  return null
}
