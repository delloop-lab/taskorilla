#!/usr/bin/env ts-node
/**
 * Script to generate OG images for all blog posts
 * 
 * Usage:
 *   npm run generate-blog-images
 *   or
 *   ts-node scripts/generate-blog-og-images.ts
 * 
 * This script:
 * 1. Checks all blog posts for missing OG images
 * 2. Generates images using AI (requires API configuration)
 * 3. Saves images to public/images/blog/og/
 * 4. Updates blog post metadata (if needed)
 */

import { blogs } from '../lib/blog-data'
import { getOgImagePath, generateOgImagePrompt, needsOgImage } from '../lib/blog-image-utils'
import { mkdir, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

// Note: This script requires an AI image generation service
// Configure your preferred service below

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
    console.log('  Calling OpenAI DALL-E 3 API...')
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
    console.log('  Downloading generated image...')
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
    console.error('  Error generating image with OpenAI:', error)
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

async function main() {
  console.log('🚀 Starting OG image generation for blog posts...\n')

  // Check for force flag
  const forceRegenerate = process.argv.includes('--force') || process.argv.includes('-f')
  
  if (forceRegenerate) {
    console.log('⚠️  Force mode enabled - will regenerate ALL images\n')
  }

  // Find posts needing images
  const postsNeedingImages = forceRegenerate 
    ? blogs // Regenerate all
    : blogs.filter(needsOgImage) // Only missing images

  if (postsNeedingImages.length === 0) {
    console.log('✅ All blog posts already have OG images!')
    if (!forceRegenerate) {
      console.log('💡 Use --force flag to regenerate all images: npm run generate-blog-images -- --force')
    }
    return
  }

  console.log(`Found ${postsNeedingImages.length} posts needing OG images:\n`)
  postsNeedingImages.forEach((post, index) => {
    console.log(`${index + 1}. ${post.title} (${post.slug})`)
  })
  console.log()

  // Ensure directory exists
  const ogImageDir = path.join(process.cwd(), 'public', 'images', 'blog', 'og')
  if (!existsSync(ogImageDir)) {
    await mkdir(ogImageDir, { recursive: true })
    console.log(`📁 Created directory: ${ogImageDir}\n`)
  }

  // Generate images
  let successCount = 0
  let errorCount = 0

  for (const post of postsNeedingImages) {
    try {
      // Check if image exists (unless force regenerate)
      const imagePath = getOgImagePath(post.slug)
      const fullPath = path.join(process.cwd(), imagePath)
      
      if (existsSync(fullPath) && !forceRegenerate) {
        console.log(`⏭️  Skipping ${post.title} - image already exists`)
        successCount++
        continue
      }
      
      if (forceRegenerate && existsSync(fullPath)) {
        console.log(`🔄 Regenerating (overwriting existing image)...`)
      }
      
      if (forceRegenerate && existsSync(fullPath)) {
        console.log(`🔄 Regenerating image for: ${post.title}...`)
      } else {
        console.log(`🎨 Generating image for: ${post.title}...`)
      }
      
      const prompt = generateOgImagePrompt(post)
      console.log(`   Prompt preview: ${prompt.substring(0, 150)}...`)
      
      const imageBuffer = await generateImageWithAI(prompt)
      const resizedBuffer = await resizeImageToOgSize(imageBuffer)
      
      await writeFile(fullPath, resizedBuffer)
      
      console.log(`✅ Saved: ${imagePath}\n`)
      successCount++
      
      // Rate limiting - wait 2 seconds between requests to avoid rate limits
      if (postsNeedingImages.indexOf(post) < postsNeedingImages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    } catch (error: any) {
      console.error(`❌ Error generating image for ${post.slug}:`, error.message)
      errorCount++
    }
  }

  console.log('\n📊 Summary:')
  console.log(`✅ Successfully generated: ${successCount}`)
  console.log(`❌ Errors: ${errorCount}`)
  console.log(`\n💡 Next steps:`)
  console.log(`1. Review generated images in public/images/blog/og/`)
  console.log(`2. Update blog-data.ts to include ogImage URLs if needed`)
  console.log(`3. Test OG tags with: https://www.opengraph.xyz/`)
}

// Run the script
if (require.main === module) {
  main().catch(console.error)
}

export default main
