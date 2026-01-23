// Utility functions for blog post OG image generation and management

import type { BlogPost } from './blog-data'

const BASE_URL = 'https://www.taskorilla.com'
const OG_IMAGE_BASE_PATH = '/images/blog/og'

/**
 * Get the OG image URL for a blog post
 * Priority: ogImageUpload > ogImage > featuredImageUrl > default image
 */
export function getOgImageUrl(post: BlogPost): string {
  // First priority: manually uploaded ogImageUpload
  if (post.ogImageUpload && post.ogImageUpload.trim().length > 0) {
    const url = post.ogImageUpload.trim()
    // If relative URL, make it absolute
    if (url.startsWith('/')) {
      return `${BASE_URL}${url}`
    }
    // If already absolute, use as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
  }

  // Second priority: explicit ogImage (legacy)
  if (post.ogImage && post.ogImage.trim().length > 0) {
    const url = post.ogImage.trim()
    // If relative URL, make it absolute
    if (url.startsWith('/')) {
      return `${BASE_URL}${url}`
    }
    // If already absolute, use as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
  }

  // Third priority: featuredImageUrl (legacy support)
  if (post.featuredImageUrl && post.featuredImageUrl.trim().length > 0) {
    const url = post.featuredImageUrl.trim()
    if (url.startsWith('/')) {
      return `${BASE_URL}${url}`
    }
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
  }

  // Fourth priority: default image
  return `${BASE_URL}/images/blog/og/default.png`
}

/**
 * Get the local file path for saving OG images
 */
export function getOgImagePath(slug: string): string {
  return `public${OG_IMAGE_BASE_PATH}/${slug}.png`
}

/**
 * Check if a blog post needs an OG image generated
 */
export function needsOgImage(post: BlogPost): boolean {
  return !post.ogImage && !post.featuredImageUrl
}

/**
 * Map blog categories to visual concepts for abstract/symbolic representation
 */
function getCategoryVisualConcept(category: string, title: string): string {
  const categoryLower = category.toLowerCase()
  const titleLower = title.toLowerCase()

  // Plumbing
  if (categoryLower.includes('plumb') || titleLower.includes('plumb')) {
    return 'abstract geometric shapes representing pipes and water flow, modern blue and white color scheme with orange accent, clean minimalist design, no text'
  }

  // Electrical
  if (categoryLower.includes('electric') || titleLower.includes('electric')) {
    return 'abstract electrical circuit patterns, bright yellow and orange energy waves, modern minimalist design, geometric shapes, no text'
  }

  // Cleaning
  if (categoryLower.includes('clean') || titleLower.includes('clean')) {
    return 'abstract sparkling clean surfaces, fresh blue and white bubbles, minimalist geometric patterns, bright and airy, no text'
  }

  // Handyman / Home Maintenance
  if (categoryLower.includes('handyman') || categoryLower.includes('maintenance') || titleLower.includes('handyman') || titleLower.includes('maintenance')) {
    return 'abstract tools and home elements in geometric form, warm orange and beige tones, modern minimalist style, no text'
  }

  // Gardening
  if (categoryLower.includes('garden') || categoryLower.includes('landscap') || titleLower.includes('garden')) {
    return 'abstract organic shapes representing plants and nature, vibrant green and orange gradient, modern minimalist botanical design, no text'
  }

  // Painting / Home Improvement
  if (categoryLower.includes('paint') || categoryLower.includes('improvement') || titleLower.includes('paint')) {
    return 'abstract color swatches and brush strokes, vibrant color palette with orange accent, modern artistic minimalist design, no text'
  }

  // Platform Updates / Getting Started
  if (categoryLower.includes('platform') || categoryLower.includes('getting started') || categoryLower.includes('welcome')) {
    return 'abstract connection and network patterns, bright orange and blue gradient, modern tech-inspired minimalist design, no text'
  }

  // Community / Trust
  if (categoryLower.includes('community') || categoryLower.includes('trust') || titleLower.includes('trust')) {
    return 'abstract interconnected shapes representing community, warm orange and yellow tones, modern minimalist design, no text'
  }

  // Local Services / General
  if (categoryLower.includes('local services') || categoryLower.includes('services')) {
    return 'abstract service icons in geometric form, vibrant orange and blue palette, modern minimalist design, no text'
  }

  // Default: abstract professional service concept
  return 'abstract professional service concept, modern geometric shapes, vibrant orange and blue gradient, clean minimalist design, high contrast, no text'
}

/**
 * Generate high-quality OG image prompt for AI image generation
 * Creates abstract, symbolic visuals without text - modern, clean, minimalistic
 */
export function generateOgImagePrompt(post: BlogPost): string {
  const category = post.category || 'Service'
  const visualConcept = getCategoryVisualConcept(category, post.title)
  const location = post.location ? `, ${post.location} theme` : ''

  return `Create a professional, modern blog header image. 
Style: Abstract, symbolic, minimalist design. Bright colors, high contrast, clean composition.
Visual concept: ${visualConcept}${location}
Color palette: Vibrant orange (#FD9212) as accent, complementary bright colors (blues, greens, yellows), high contrast.
Composition: Modern geometric shapes, abstract patterns, professional and visually appealing.
Technical: 1200x630 pixels, PNG format, no text, no words, no letters, no typography.
Quality: High resolution, sharp, professional photography style, studio quality lighting.
Mood: Bright, energetic, trustworthy, modern, clean.`
}

/**
 * Generate a simplified prompt for text-to-image AI services (backup)
 */
export function generateSimpleImagePrompt(post: BlogPost): string {
  const category = post.category || 'Service'
  const visualConcept = getCategoryVisualConcept(category, post.title)
  
  return `Abstract minimalist blog header image: ${visualConcept}. 
Modern geometric design, vibrant orange (#FD9212) accent, bright complementary colors, high contrast, 1200x630px, no text, professional quality.`
}
