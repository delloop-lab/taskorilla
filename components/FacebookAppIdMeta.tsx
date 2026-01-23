'use client'

import { useEffect } from 'react'

export default function FacebookAppIdMeta() {
  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID
    if (!appId) return

    // Remove any incorrect meta tags with name attribute (Facebook requires property)
    const incorrectMeta = document.querySelector('meta[name="fb:app_id"]')
    if (incorrectMeta) {
      incorrectMeta.remove()
    }

    // Check if correct meta tag already exists
    const existingMeta = document.querySelector('meta[property="fb:app_id"]')
    if (existingMeta) {
      // Update existing
      existingMeta.setAttribute('content', appId)
      return
    }

    // Create new meta tag with property attribute (required by Facebook)
    const meta = document.createElement('meta')
    meta.setAttribute('property', 'fb:app_id')
    meta.setAttribute('content', appId)
    document.head.appendChild(meta)
  }, [])

  return null
}
