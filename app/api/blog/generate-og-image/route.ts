import { NextRequest, NextResponse } from 'next/server'
import { blogs, getBlogBySlug, type BlogPost } from '@/lib/blog-data'
import { getOgImagePath, generateOgImagePrompt, needsOgImage } from '@/lib/blog-image-utils'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

/**
 * API Route: Generate OG image for blog posts
 * 
 * ⚠️ DISABLED: This endpoint has been disabled in favor of manual image uploads.
 * Use /api/blog/upload-og-image instead to upload images manually.
 * 
 * This endpoint is kept for reference but will return an error if called.
 * 
 * Usage (DISABLED):
 * - POST /api/blog/generate-og-image?slug=post-slug (generate for single post)
 * - POST /api/blog/generate-og-image?all=true (generate for all posts missing images)
 * 
 * Note: AI image generation has been replaced with manual uploads.
 */

interface ImageGenerationResponse {
  success: boolean
  imageUrl?: string
  error?: string
  message?: string
}

/**
 * Generate image using OpenAI DALL-E 3
 * Uses 1792x1024 (closest to 16:9 aspect ratio) then resizes to 1200x630
 */
async function generateImageWithAI(prompt: string): Promise<Buffer> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY
  
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required. Please add it to .env.local')
  }

  try {
    console.log('Calling OpenAI DALL-E 3 API...')
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        size: '1792x1024', // Closest to 16:9, will be resized to 1200x630
        quality: 'standard',
        n: 1,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Failed to generate image'}`)
    }

    const data = await response.json()
    
    if (!data.data || !data.data[0] || !data.data[0].url) {
      throw new Error('Invalid response from OpenAI API: missing image URL')
    }

    const imageUrl = data.data[0].url
    
    // Download the image
    console.log('Downloading generated image...')
    const imageResponse = await fetch(imageUrl)
    
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.statusText}`)
    }
    
    const arrayBuffer = await imageResponse.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error: any) {
    if (error.message.includes('OPENAI_API_KEY')) {
      throw error
    }
    console.error('Error generating image with OpenAI:', error)
    throw new Error(`Failed to generate image: ${error.message || 'Unknown error'}`)
  }
}

/**
 * Resize image to 1200x630 using sharp
 */
async function resizeImageToOgSize(imageBuffer: Buffer): Promise<Buffer> {
  try {
    const sharp = (await import('sharp')).default
    return await sharp(imageBuffer)
      .resize(1200, 630, { fit: 'cover', position: 'center' })
      .png()
      .toBuffer()
  } catch (error) {
    console.error('Error resizing image with sharp:', error)
    // Fallback: return original buffer if sharp fails
    return imageBuffer
  }
}

/**
 * Generate and save OG image for a blog post
 * @param post - Blog post to generate image for
 * @param forceRegenerate - If true, regenerate even if image exists
 */
async function generateOgImageForPost(post: BlogPost, forceRegenerate: boolean = false): Promise<string> {
  // Check if image already exists
  const imagePath = getOgImagePath(post.slug)
  const fullPath = path.join(process.cwd(), imagePath)
  
  if (existsSync(fullPath) && !forceRegenerate) {
    console.log(`OG image already exists for ${post.slug}`)
    return `/images/blog/og/${post.slug}.png`
  }
  
  if (forceRegenerate && existsSync(fullPath)) {
    console.log(`Force regenerating image for ${post.slug}`)
  }

  // Generate prompt
  const prompt = generateOgImagePrompt(post)
  
  // Generate image with AI
  console.log(`Generating OG image for: ${post.title}`)
  const imageBuffer = await generateImageWithAI(prompt)
  
  // Resize to 1200x630
  const resizedBuffer = await resizeImageToOgSize(imageBuffer)
  
  // Ensure directory exists
  const dir = path.dirname(fullPath)
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
  
  // Save image
  await writeFile(fullPath, resizedBuffer)
  
  console.log(`OG image saved: ${imagePath}`)
  return `/images/blog/og/${post.slug}.png`
}

// Export runtime config to allow longer execution time
export const maxDuration = 300 // 5 minutes (Vercel/Next.js limit)
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // AI generation is disabled - return error
  return NextResponse.json(
    {
      success: false,
      error: 'AI image generation has been disabled. Please use manual image uploads via /api/blog/upload-og-image instead.',
      message: 'This endpoint is no longer available. Use the manual upload feature in the admin panel.'
    },
    { status: 410 } // 410 Gone
  )
  
  /* Legacy code below (disabled)
  try {
    const searchParams = request.nextUrl.searchParams
    const slug = searchParams.get('slug')
    const generateAll = searchParams.get('all') === 'true'
    const forceRegenerate = searchParams.get('force') === 'true'

    if (generateAll) {
      // Generate images for all posts (or regenerate if force=true)
      const postsToProcess = forceRegenerate 
        ? blogs // Regenerate all
        : blogs.filter(needsOgImage) // Only missing images
      
      console.log(`Found ${postsToProcess.length} posts to process (force=${forceRegenerate})`)
      
      if (postsToProcess.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'All blog posts already have OG images',
          generated: 0,
          results: [],
        })
      }

      const results = []
      let processedCount = 0
      
      for (const post of postsToProcess) {
        processedCount++
        console.log(`[${processedCount}/${postsToProcess.length}] Processing: ${post.title}`)
        
        try {
          const imagePath = await generateOgImageForPost(post, forceRegenerate)
          results.push({
            slug: post.slug,
            title: post.title,
            imagePath,
            success: true,
          })
          console.log(`✅ Successfully generated image for: ${post.title}`)
        } catch (error: any) {
          console.error(`❌ Failed to generate image for ${post.slug}:`, error.message)
          results.push({
            slug: post.slug,
            title: post.title,
            success: false,
            error: error.message,
          })
        }
        
        // Small delay between requests to avoid rate limiting
        if (processedCount < postsToProcess.length) {
          await new Promise(resolve => setTimeout(resolve, 2000)) // 2 second delay
        }
      }

      const successCount = results.filter(r => r.success).length
      console.log(`Completed: ${successCount}/${results.length} images generated successfully`)

      return NextResponse.json({
        success: true,
        message: `Generated ${successCount} of ${results.length} images`,
        results,
        summary: {
          total: results.length,
          successful: successCount,
          failed: results.length - successCount,
        },
      })
    }

    if (slug) {
      // Generate image for specific post
      const post = getBlogBySlug(slug)
      
      if (!post) {
        return NextResponse.json(
          { success: false, error: 'Blog post not found' },
          { status: 404 }
        )
      }

      if (!needsOgImage(post) && !forceRegenerate) {
        return NextResponse.json({
          success: true,
          message: 'Blog post already has an OG image. Use ?force=true to regenerate.',
          imageUrl: post.ogImage || post.featuredImageUrl,
        })
      }

      const imagePath = await generateOgImageForPost(post, forceRegenerate)
      
      return NextResponse.json({
        success: true,
        imageUrl: `https://www.taskorilla.com${imagePath}`,
        localPath: imagePath,
        message: 'OG image generated successfully',
      })
    }

    return NextResponse.json(
      { success: false, error: 'Please provide either slug or all=true parameter' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Error generating OG image:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate OG image' },
      { status: 500 }
    )
  }
  */
}
