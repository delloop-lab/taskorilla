import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export const maxDuration = 60 // 1 minute
export const dynamic = 'force-dynamic'

/**
 * POST /api/blog/upload-og-image
 * Uploads an OG image for a blog post
 * 
 * Body: FormData with:
 * - file: Image file (PNG, JPG, JPEG)
 * - slug: Blog post slug
 * 
 * Returns: { success: boolean, imagePath: string, error?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const slug = formData.get('slug') as string | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!slug || !slug.trim()) {
      return NextResponse.json(
        { success: false, error: 'Slug is required' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only PNG, JPG, JPEG, and WebP are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 5MB limit' },
        { status: 400 }
      )
    }

    // Sanitize slug for filename
    const sanitizedSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
    
    // Determine file extension from MIME type
    let extension = 'png'
    if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
      extension = 'jpg'
    } else if (file.type === 'image/webp') {
      extension = 'webp'
    }

    // Create directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'images', 'blog', 'og')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Save file
    const filename = `${sanitizedSlug}.${extension}`
    const filePath = path.join(uploadDir, filename)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    await writeFile(filePath, buffer)

    // Return relative path
    const imagePath = `/images/blog/og/${filename}`

    return NextResponse.json({
      success: true,
      imagePath,
      message: 'Image uploaded successfully'
    })
  } catch (error: any) {
    console.error('Error uploading OG image:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to upload image' },
      { status: 500 }
    )
  }
}
