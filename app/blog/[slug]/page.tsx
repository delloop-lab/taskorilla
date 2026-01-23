'use client'

import Link from 'next/link'
import Image from 'next/image'
import Script from 'next/script'
import { useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useParams } from 'next/navigation'
import { getBlogBySlug, getRelatedPosts, type BlogPost, type ContentBlock } from '@/lib/blog-data'
import { getOgImageUrl } from '@/lib/blog-image-utils'
import { format } from 'date-fns'
import SocialShareButtons from '@/components/SocialShareButtons'

export default function BlogPostPage() {
  const params = useParams()
  const slug = params.slug as string
  const post = getBlogBySlug(slug)
  const relatedPosts = post ? getRelatedPosts(slug, 3) : []

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Blog post not found
          </h1>
          <Link href="/blog" className="text-primary hover:underline">
            Back to Blog
          </Link>
        </div>
      </div>
    )
  }

  // Generate SEO-optimized title for document (backup for client-side)
  // Format: "[Blog Headline] - Taskorilla" (clean, no placeholders or duplicates)
  useEffect(() => {
    if (post) {
      // Clean title: remove placeholders, duplicates, extra spaces
      const cleanTitle = (title: string): string => {
        if (!title || title.trim().length === 0) {
          return 'Blog Post'
        }
        let cleaned = title.trim().replace(/\s+/g, ' ')
        cleaned = cleaned.replace(/\{\{[^}]+\}\}/g, '').replace(/\[[^\]]+\]/g, '')
        cleaned = cleaned.replace(/\s*-\s*Taskorilla\s*$/i, '').trim()
        cleaned = cleaned.replace(/\b(\w+)\s+\1\b/gi, '$1')
        return cleaned.trim()
      }
      
      const blogHeadline = cleanTitle(post.title)
      const seoTitle = `${blogHeadline} - Taskorilla`
      document.title = seoTitle
    }
  }, [post])

  /**
   * Generate JSON-LD structured data for SEO
   * Uses hardcoded https://taskorilla.com as per requirements
   */
  const generateJsonLd = () => {
    if (!post) return null

    // Use hardcoded base URL as per requirements
    const baseUrl = 'https://taskorilla.com'
    const postUrl = `${baseUrl}/blog/${post.slug}`
    
    // Clean title (same logic as layout)
    const cleanTitle = (title: string): string => {
      if (!title || title.trim().length === 0) {
        return 'Blog Post'
      }
      let cleaned = title.trim().replace(/\s+/g, ' ')
      cleaned = cleaned.replace(/\{\{[^}]+\}\}/g, '').replace(/\[[^\]]+\]/g, '')
      cleaned = cleaned.replace(/\s*-\s*Taskorilla\s*$/i, '').trim()
      cleaned = cleaned.replace(/\b(\w+)\s+\1\b/gi, '$1')
      return cleaned.trim()
    }
    
    const blogHeadline = cleanTitle(post.title)
    
    // Generate clean meta description (same logic as layout)
    const cleanMetaDescription = (desc: string | undefined, snippet: string | undefined): string => {
      let metaDesc = desc || snippet || ''
      metaDesc = metaDesc.replace(/\{\{[^}]+\}\}/g, '').replace(/\[[^\]]+\]/g, '').trim()
      
      if (!metaDesc || metaDesc.length < 50) {
        const service = post.category || 'service'
        const location = post.location || 'Algarve'
        metaDesc = `Find a trusted ${service.toLowerCase()} in ${location} with Taskorilla's verified professionals. Get expert tips and connect with reliable local service providers.`
      }
      
      if (metaDesc.length > 160) {
        metaDesc = metaDesc.substring(0, 157).trim() + '...'
      } else if (metaDesc.length < 150 && metaDesc.length > 0) {
        const extension = ' Learn more on Taskorilla.'
        if (metaDesc.length + extension.length <= 160) {
          metaDesc = metaDesc + extension
        }
      }
      
      return metaDesc.trim()
    }
    
    const description = cleanMetaDescription(post.metaDescription, post.snippet)

    // Combine tags for JSON-LD
    const allTags = [
      post.category,
      post.location,
      ...(post.tags || [])
    ].filter(Boolean)

    // Get OG image URL (uses ogImage, falls back to featuredImageUrl, then auto-generated path)
    const imageUrl = getOgImageUrl(post)

    return {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: blogHeadline,
      description: description,
      image: imageUrl,
      author: {
        '@type': 'Organization',
        name: 'Taskorilla'
      },
      datePublished: post.date,
      dateModified: post.date,
      publisher: {
        '@type': 'Organization',
        name: 'Taskorilla',
        logo: {
          '@type': 'ImageObject',
          url: `${baseUrl}/images/taskorilla_header_logo.png`
        }
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': postUrl
      },
      articleSection: post.category,
      keywords: allTags.join(', ')
    }
  }

  // Format content for better display - handles both string and structured content
  const formatContent = (content: string | ContentBlock[]) => {
    // Handle structured content array
    if (Array.isArray(content)) {
      return content.map((block, index) => {
        switch (block.type) {
          case 'h1':
            return (
              <h1 key={index} className="text-3xl font-bold text-gray-900 mb-4 mt-6">
                {block.text}
              </h1>
            )
          case 'h2':
            return (
              <h2 key={index} className="text-2xl font-bold text-gray-900 mb-3 mt-6">
                {block.text}
              </h2>
            )
          case 'h3':
            return (
              <h3 key={index} className="text-xl font-bold text-gray-900 mb-2 mt-4">
                {block.text}
              </h3>
            )
          case 'p':
            return (
              <p key={index} className="text-gray-700 mb-4">
                {block.text}
              </p>
            )
          default:
            return (
              <p key={index} className="text-gray-700 mb-4">
                {block.text}
              </p>
            )
        }
      })
    }
    
    // Handle string content (legacy format)
    return content.split('\n\n').map((section, index) => {
      // Check if it's a markdown heading (starts with ##)
      if (section.trim().startsWith('##')) {
        const headingText = section.replace(/^##+\s*/, '').trim()
        return (
          <div key={index} className="mb-4">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{headingText}</h3>
          </div>
        )
      }
      
      // Check if it's a heading (starts with **)
      if (section.startsWith('**') && section.includes('**')) {
        const headingText = section.match(/\*\*(.*?)\*\*/)?.[1] || section
        const remainingText = section.replace(/\*\*(.*?)\*\*/, '').trim()
        
        return (
          <div key={index} className="mb-4">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{headingText}</h3>
            {remainingText && (
              <p className="text-gray-700 whitespace-pre-wrap">{remainingText}</p>
            )}
          </div>
        )
      }
      
      // Regular paragraph
      return (
        <p key={index} className="text-gray-700 mb-4 whitespace-pre-wrap">
          {section.trim()}
        </p>
      )
    })
  }

  const jsonLd = generateJsonLd()

  return (
    <>
      {/* JSON-LD Structured Data for SEO */}
      {jsonLd && (
        <Script
          id="blog-post-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd, null, 2)
          }}
        />
      )}

      <div className="min-h-screen bg-gray-50">
        {/* Back Button */}
      <div className="bg-white border-b border-gray-200 py-4 px-4">
        <div className="container mx-auto max-w-4xl">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Blog</span>
          </Link>
        </div>
      </div>

      {/* Blog Post Content */}
      <article className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Blog Post Image */}
            {(() => {
              const imageUrl = getOgImageUrl(post)
              const imageSrc = imageUrl.startsWith('http') 
                ? imageUrl.replace('https://taskorilla.com', '').replace('http://localhost:3000', '')
                : imageUrl
              
              return (
                <div className="w-full bg-gray-200 flex items-center justify-center">
                  <Image
                    src={imageSrc || '/images/blog/og/default.png'}
                    alt={post.title}
                    width={1200}
                    height={630}
                    className="w-full h-auto"
                    sizes="(max-width: 768px) 100vw, 1200px"
                    unoptimized={imageUrl.startsWith('http') && !imageUrl.includes('taskorilla.com') && !imageUrl.includes('localhost')}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      const defaultImage = '/images/blog/og/default.png'
                      if (!target.src.includes('default.png')) {
                        target.src = defaultImage
                      }
                    }}
                  />
                </div>
              )
            })()}
            
            <div className="p-8 md:p-12">
              {/* Category Badge */}
              <div className="mb-4">
                <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-primary/10 text-primary">
                  {post.category}
                </span>
              </div>

              {/* Title */}
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                {post.title}
              </h1>

            {/* Meta Information */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-8 pb-8 border-b border-gray-200">
              <span>
                {format(new Date(post.date), 'MMMM d, yyyy')}
              </span>
              {post.location && (
                <span className="flex items-center gap-1">
                  📍 {post.location}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="prose prose-lg max-w-none">
              {post.content ? (
                formatContent(post.content)
              ) : (
                <p className="text-gray-700 whitespace-pre-wrap">{post.snippet}</p>
              )}
            </div>

            {/* Social Share Buttons */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <SocialShareButtons
                url={`https://taskorilla.com/blog/${post.slug}`}
                title={post.title}
                description={post.metaDescription || post.snippet}
              />
            </div>

            {/* Related Posts */}
            {relatedPosts.length > 0 && (
              <div className="mt-12 pt-8 border-t border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Posts</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {relatedPosts.map((relatedPost) => {
                    const relatedImageUrl = getOgImageUrl(relatedPost)
                    const relatedImageSrc = relatedImageUrl.startsWith('http')
                      ? relatedImageUrl.replace('https://taskorilla.com', '').replace('http://localhost:3000', '')
                      : relatedImageUrl

                    return (
                      <Link
                        key={relatedPost.slug}
                        href={`/blog/${relatedPost.slug}`}
                        className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                      >
                        <div className="w-full h-48 bg-gray-200 relative overflow-hidden">
                          <Image
                            src={relatedImageSrc || '/images/blog/og/default.png'}
                            alt={relatedPost.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 300px"
                          />
                        </div>
                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
                              {relatedPost.category}
                            </span>
                            {relatedPost.location && (
                              <span className="text-xs text-gray-500">📍 {relatedPost.location}</span>
                            )}
                          </div>
                          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                            {relatedPost.title}
                          </h3>
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                            {relatedPost.snippet}
                          </p>
                          <span className="text-xs text-gray-500">
                            {format(new Date(relatedPost.date), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

              {/* Back to Blog Link */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>View All Posts</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </article>
      </div>
    </>
  )
}
