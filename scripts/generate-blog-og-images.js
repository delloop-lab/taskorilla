// Plain Node.js script to generate OG images for all blog posts using OpenAI DALL·E 3
// Usage:
//   npm run generate-blog-images
//
// This script:
// 1. Checks all blog posts for missing OG images
// 2. Generates images using AI (requires OPENAI_API_KEY)
// 3. Saves images to public/images/blog/og/

// Enable loading of TypeScript source files from Node (CJS) using ts-node
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    // Use Node16 module + resolution to satisfy TS and ts-node
    module: 'Node16',
    moduleResolution: 'Node16',
  },
})

// Import TypeScript modules with explicit .ts extension so ts-node can handle them
const { blogs } = require('../lib/blog-data.ts')
const {
  getOgImagePath,
  generateOgImagePrompt,
  needsOgImage,
} = require('../lib/blog-image-utils.ts')
const { mkdir, writeFile } = require('fs').promises
const { existsSync } = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

async function generateImageWithAI(prompt) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY
  if (!OPENAI_API_KEY) {
    throw new Error(
      'OPENAI_API_KEY environment variable is required. Please add it to .env.local'
    )
  }

  console.log('  Calling OpenAI DALL-E 3 API...')
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      size: '1792x1024',
      quality: 'standard',
      n: 1,
    }),
  })

  if (!response.ok) {
    let errorMessage = 'Failed to generate image'
    try {
      const errorData = await response.json()
      errorMessage = errorData?.error?.message || errorMessage
    } catch (_) {
      // ignore
    }
    throw new Error(`OpenAI API error: ${errorMessage}`)
  }

  const data = await response.json()
  if (!data.data || !data.data[0] || !data.data[0].url) {
    throw new Error('Invalid response from OpenAI API: missing image URL')
  }

  const imageUrl = data.data[0].url
  console.log('  Downloading generated image...')
  const imageResponse = await fetch(imageUrl)
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image: ${imageResponse.statusText}`)
  }
  const arrayBuffer = await imageResponse.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

async function resizeImageToOgSize(imageBuffer) {
  try {
    const sharp = require('sharp')
    return await sharp(imageBuffer)
      .resize(1200, 630, { fit: 'cover', position: 'center' })
      .png()
      .toBuffer()
  } catch (error) {
    console.error('Error resizing image with sharp:', error)
    return imageBuffer
  }
}

async function main() {
  console.log('🚀 Starting OG image generation for blog posts...\n')

  const forceRegenerate =
    process.argv.includes('--force') || process.argv.includes('-f')
  if (forceRegenerate) {
    console.log('⚠️  Force mode enabled - will regenerate ALL images\n')
  }

  const postsNeedingImages = forceRegenerate
    ? blogs
    : blogs.filter((post) => needsOgImage(post))

  if (postsNeedingImages.length === 0) {
    console.log('✅ All blog posts already have OG images!')
    if (!forceRegenerate) {
      console.log(
        '💡 Use --force flag to regenerate all images: npm run generate-blog-images -- --force'
      )
    }
    return
  }

  console.log(`Found ${postsNeedingImages.length} posts needing OG images:\n`)
  postsNeedingImages.forEach((post, index) => {
    console.log(`${index + 1}. ${post.title} (${post.slug})`)
  })
  console.log()

  const ogImageDir = path.join(process.cwd(), 'public', 'images', 'blog', 'og')
  if (!existsSync(ogImageDir)) {
    await mkdir(ogImageDir, { recursive: true })
    console.log(`📁 Created directory: ${ogImageDir}\n`)
  }

  let successCount = 0
  let errorCount = 0

  for (const post of postsNeedingImages) {
    try {
      const imagePath = getOgImagePath(post.slug)
      const fullPath = path.join(process.cwd(), imagePath)

      if (existsSync(fullPath) && !forceRegenerate) {
        console.log(`⏭️  Skipping ${post.title} - image already exists`)
        successCount++
        continue
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

      if (postsNeedingImages.indexOf(post) < postsNeedingImages.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    } catch (error) {
      console.error(`❌ Error generating image for ${post.slug}:`, error.message)
      errorCount++
    }
  }

  console.log('\n📊 Summary:')
  console.log(`✅ Successfully generated: ${successCount}`)
  console.log(`❌ Errors: ${errorCount}`)
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
}

