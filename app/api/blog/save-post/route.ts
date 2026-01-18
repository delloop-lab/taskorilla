import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import type { BlogPost } from '@/lib/blog-data'

/**
 * POST /api/blog/save-post
 * Saves or updates a blog post in lib/blog-data.ts
 * 
 * Body: BlogPost object
 * 
 * Returns: { success: boolean, message: string }
 */
export async function POST(request: NextRequest) {
  try {
    const post: BlogPost = await request.json()

    if (!post.slug || !post.title) {
      return NextResponse.json(
        { success: false, error: 'Slug and title are required' },
        { status: 400 }
      )
    }

    // Path to blog-data.ts
    const blogDataPath = path.join(process.cwd(), 'lib', 'blog-data.ts')
    
    if (!existsSync(blogDataPath)) {
      return NextResponse.json(
        { success: false, error: 'blog-data.ts file not found' },
        { status: 500 }
      )
    }

    // Read the current file
    const fileContent = await readFile(blogDataPath, 'utf-8')
    
    // Import blogs array to get current posts
    const { blogs } = await import('@/lib/blog-data')
    
    // Check if post exists (by slug)
    const existingIndex = blogs.findIndex(p => p.slug === post.slug)
    
    // Format the post as TypeScript object (matches existing format)
    const formatPost = (p: BlogPost): string => {
      const lines: string[] = []
      lines.push('  {')
      
      // Required fields first
      lines.push(`    title: ${JSON.stringify(p.title)},`)
      lines.push(`    category: ${JSON.stringify(p.category)},`)
      lines.push(`    snippet: ${JSON.stringify(p.snippet)},`)
      lines.push(`    date: ${JSON.stringify(p.date)},`)
      
      // Optional fields
      if (p.location) {
        lines.push(`    location: ${JSON.stringify(p.location)},`)
      }
      lines.push(`    slug: ${JSON.stringify(p.slug)},`)
      
      // Format content
      if (p.content) {
        if (typeof p.content === 'string') {
          // Simple string content - preserve newlines
          const escapedContent = p.content.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${')
          lines.push(`    content: ${JSON.stringify(p.content)},`)
        } else {
          // ContentBlock[] format
          lines.push('    content: [')
          p.content.forEach((block, idx) => {
            const comma = idx < p.content!.length - 1 ? ',' : ''
            lines.push(`      { type: ${JSON.stringify(block.type)}, text: ${JSON.stringify(block.text)} }${comma}`)
          })
          lines.push('    ],')
        }
      }
      
      // Optional metadata fields
      if (p.metaDescription) {
        lines.push(`    metaDescription: ${JSON.stringify(p.metaDescription)},`)
      }
      if (p.featuredImageUrl) {
        lines.push(`    featuredImageUrl: ${JSON.stringify(p.featuredImageUrl)},`)
      }
      if (p.ogImage) {
        lines.push(`    ogImage: ${JSON.stringify(p.ogImage)},`)
      }
      if (p.ogImageUpload) {
        lines.push(`    ogImageUpload: ${JSON.stringify(p.ogImageUpload)},`)
      }
      if (p.tags && p.tags.length > 0) {
        lines.push(`    tags: [${p.tags.map(t => JSON.stringify(t)).join(', ')}],`)
      }
      if (p.cta) {
        lines.push(`    cta: ${JSON.stringify(p.cta)},`)
      }
      
      lines.push('  }')
      return lines.join('\n')
    }

    // Find the blogs array in the file (look for the array declaration)
    const blogsArrayStart = fileContent.indexOf('export const blogs: BlogPost[] = [')
    if (blogsArrayStart === -1) {
      return NextResponse.json(
        { success: false, error: 'Could not find blogs array declaration in blog-data.ts' },
        { status: 500 }
      )
    }

    // Find the end of the blogs array (find matching closing bracket)
    // We need to find the FIRST closing bracket that matches the opening bracket
    // Also check for malformed files with duplicate array declarations
    let bracketCount = 0
    let arrayEnd = blogsArrayStart
    
    // Start from the opening bracket
    for (let i = blogsArrayStart; i < fileContent.length; i++) {
      const char = fileContent[i]
      if (char === '[') {
        bracketCount++
      } else if (char === ']') {
        bracketCount--
        if (bracketCount === 0) {
          arrayEnd = i + 1
          // Check if there's a duplicate array declaration or orphaned content right after
          const afterBracket = fileContent.substring(i + 1, i + 20).trim()
          if (afterBracket.startsWith('=') || afterBracket.match(/^\s*\]\s*=\s*\[/)) {
            // Found duplicate - find where helper functions start instead
            const helperStart = fileContent.indexOf('// Helper function', i + 1)
            if (helperStart > i) {
              arrayEnd = helperStart
            }
          }
          break
        }
      }
    }

    if (arrayEnd === blogsArrayStart) {
      return NextResponse.json(
        { success: false, error: 'Could not find end of blogs array in blog-data.ts' },
        { status: 500 }
      )
    }

    // Additional safety check: if content after array contains another array declaration, find helper functions
    const afterArrayCheck = fileContent.substring(arrayEnd)
    if (afterArrayCheck.includes('] = [') || afterArrayCheck.match(/^\s*\]\s*=\s*\[/)) {
      const helperStart = fileContent.indexOf('// Helper function', arrayEnd)
      if (helperStart > arrayEnd) {
        arrayEnd = helperStart
      }
    }

    // Extract existing posts (excluding the one we're updating if it exists)
    const existingPosts = existingIndex >= 0 
      ? blogs.filter((_, idx) => idx !== existingIndex)
      : blogs

    // Build new blogs array (update existing or add new)
    const newPosts = existingIndex >= 0
      ? [...existingPosts, post] // Replace existing post
      : [...existingPosts, post] // Add new post

    // Remove duplicates by slug (keep the last one - the updated version)
    const uniquePosts = newPosts.reduce((acc, current) => {
      const existingIndex = acc.findIndex(p => p.slug === current.slug)
      if (existingIndex >= 0) {
        acc[existingIndex] = current // Replace if duplicate
      } else {
        acc.push(current) // Add if new
      }
      return acc
    }, [] as BlogPost[])

    // Format all posts with proper indentation
    const formattedPosts = uniquePosts.map(formatPost).join(',\n\n')

    // Rebuild the file content
    const beforeArray = fileContent.substring(0, blogsArrayStart)
    const afterArray = fileContent.substring(arrayEnd)
    
    const newFileContent = `${beforeArray}export const blogs: BlogPost[] = [\n${formattedPosts}\n]${afterArray}`

    // Write back to file
    await writeFile(blogDataPath, newFileContent, 'utf-8')

    // Log for debugging
    console.log('Blog post saved:', {
      slug: post.slug,
      title: post.title,
      ogImageUpload: post.ogImageUpload,
      hasOgImageUpload: !!post.ogImageUpload
    })

    return NextResponse.json({
      success: true,
      message: existingIndex >= 0 
        ? `Blog post "${post.title}" updated successfully`
        : `Blog post "${post.title}" created successfully`,
      savedPost: {
        slug: post.slug,
        ogImageUpload: post.ogImageUpload
      }
    })
  } catch (error: any) {
    console.error('Error saving blog post:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save blog post' },
      { status: 500 }
    )
  }
}
