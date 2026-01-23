import type { Metadata } from 'next'
import { getBlogBySlug } from '@/lib/blog-data'
import { getOgImageUrl } from '@/lib/blog-image-utils'
import { existsSync } from 'fs'
import path from 'path'

// Base URL for all URLs (hardcoded as per requirements)
// Note: Using www version to match actual domain redirect
const BASE_URL = 'https://www.taskorilla.com'

/**
 * Generate SEO-optimized metadata for each blog post
 * Includes title, description, canonical, OG tags, and Twitter tags
 */
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = getBlogBySlug(params.slug)

  if (!post) {
    return {
      title: 'Blog Post Not Found - Taskorilla',
      description: 'The requested blog post could not be found.'
    }
  }

  // Clean title: Remove any empty variables, extra spaces, or repeated words
  // Format: "[Blog Headline] - Taskorilla"
  const cleanTitle = (title: string): string => {
    if (!title || title.trim().length === 0) {
      return 'Blog Post - Taskorilla'
    }
    // Remove extra whitespace and ensure single spaces
    let cleaned = title.trim().replace(/\s+/g, ' ')
    // Remove any placeholder patterns like {{variable}} or [VARIABLE]
    cleaned = cleaned.replace(/\{\{[^}]+\}\}/g, '').replace(/\[[^\]]+\]/g, '')
    // Remove duplicate "Taskorilla" if already in title
    cleaned = cleaned.replace(/\s*-\s*Taskorilla\s*$/i, '').trim()
    // Remove duplicate words (simple check for consecutive identical words)
    cleaned = cleaned.replace(/\b(\w+)\s+\1\b/gi, '$1')
    return cleaned.trim()
  }

  const blogHeadline = cleanTitle(post.title)
  const seoTitle = `${blogHeadline} - Taskorilla`

  // Generate clean meta description (150-160 characters)
  // Remove placeholders, empty strings, and ensure proper length
  const cleanMetaDescription = (desc: string | undefined, snippet: string | undefined): string => {
    let metaDesc = desc || snippet || ''
    
    // Remove placeholders
    metaDesc = metaDesc.replace(/\{\{[^}]+\}\}/g, '').replace(/\[[^\]]+\]/g, '')
    metaDesc = metaDesc.trim()
    
    // If too short or empty, create a default
    if (!metaDesc || metaDesc.length < 50) {
      const service = post.category || 'service'
      const location = post.location || 'Algarve'
      metaDesc = `Find a trusted ${service.toLowerCase()} in ${location} with Taskorilla's verified professionals. Get expert tips and connect with reliable local service providers.`
    }
    
    // Ensure 150-160 characters
    if (metaDesc.length > 160) {
      metaDesc = metaDesc.substring(0, 157).trim() + '...'
    } else if (metaDesc.length < 150 && metaDesc.length > 0) {
      // Try to extend if too short but not empty
      const extension = ' Learn more on Taskorilla.'
      if (metaDesc.length + extension.length <= 160) {
        metaDesc = metaDesc + extension
      }
    }
    
    return metaDesc.trim()
  }

  const metaDescription = cleanMetaDescription(post.metaDescription, post.snippet)

  // Generate canonical URL (absolute)
  const canonicalUrl = `${BASE_URL}/blog/${post.slug}`
  
  // Get OG image URL (priority: ogImageUpload > ogImage > featuredImageUrl > default)
  let ogImageUrl = getOgImageUrl(post)
  
  // Normalize any absolute URLs to use www version
  const normalizeUrl = (url: string): string => {
    if (url.startsWith('https://taskorilla.com')) {
      return url.replace('https://taskorilla.com', BASE_URL)
    }
    if (url.startsWith('http://taskorilla.com')) {
      return url.replace('http://taskorilla.com', BASE_URL)
    }
    return url
  }
  
  // If using ogImageUpload, verify the file exists
  if (post.ogImageUpload) {
    const imagePath = path.join(process.cwd(), 'public', post.ogImageUpload)
    if (!existsSync(imagePath)) {
      // Uploaded image doesn't exist, fall back to default
      ogImageUrl = `${BASE_URL}/images/blog/og/default.png`
    } else {
      // Use the uploaded image
      ogImageUrl = post.ogImageUpload.startsWith('/') 
        ? `${BASE_URL}${post.ogImageUpload}`
        : normalizeUrl(post.ogImageUpload)
    }
  }
  
  // Normalize the ogImageUrl to ensure www version
  ogImageUrl = normalizeUrl(ogImageUrl)
  
  // Fallback: If ogImageUrl is still invalid, use default image
  if (!ogImageUrl || ogImageUrl.includes('undefined')) {
    ogImageUrl = `${BASE_URL}/images/blog/og/default.png`
  }
  
  // OG and Twitter titles match the SEO title (no duplicates)
  const ogTitle = seoTitle
  const twitterTitle = seoTitle
  
  // Combine tags: category, location, and custom tags
  const allTags = [
    post.category,
    post.location,
    ...(post.tags || [])
  ].filter(Boolean) as string[]

  return {
    title: seoTitle,
    description: metaDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: ogTitle,
      description: metaDescription,
      type: 'article',
      url: canonicalUrl,
      publishedTime: post.date,
      modifiedTime: post.date,
      authors: ['Taskorilla'],
      tags: allTags,
      // Explicitly set OG image to satisfy Facebook's requirements
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: post.title,
          type: 'image/jpeg', // or 'image/png' depending on your image format
        },
      ],
      siteName: 'Taskorilla',
      // Explicitly set locale if needed
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: twitterTitle,
      description: metaDescription,
      images: [ogImageUrl],
      creator: '@taskorilla',
      site: '@taskorilla',
    },
    // Add other metadata for better SEO
    other: {
      'og:image:secure_url': ogImageUrl, // Ensure HTTPS image URL
    },
  }
}

export default function BlogPostLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
