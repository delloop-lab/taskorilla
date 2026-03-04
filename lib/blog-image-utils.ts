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
  // Path relative to project root, used by Node script
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

  // Childcare / family
  if (
    categoryLower.includes('childcare') ||
    categoryLower.includes('babysit') ||
    categoryLower.includes('nanny') ||
    titleLower.includes('childcare') ||
    titleLower.includes('babysitter') ||
    titleLower.includes('nanny')
  ) {
    return 'warm, family-friendly scene showing a simple, stylised parent and child together in a cozy home environment, toys or books nearby, soft lighting, no detailed faces, clean and modern illustration style'
  }

  // Plumbing
  if (categoryLower.includes('plumb') || titleLower.includes('plumb')) {
    return 'clean, professional plumbing tools such as a wrench, pipes and toolbox arranged neatly on a neutral background, hint of a kitchen or bathroom setting, realistic but minimal, no water splashes or mess'
  }

  // Electrical
  if (categoryLower.includes('electric') || titleLower.includes('electric')) {
    return 'professional electrician tools such as cables, a voltage tester and a fuse box or socket on a tidy work surface, subtle glow effect, modern and realistic, no chaotic sparks'
  }

  // Cleaning
  if (categoryLower.includes('clean') || titleLower.includes('clean')) {
    return 'bright, airy home interior with simple cleaning supplies like a spray bottle, gloves and a broom in the foreground, sunlight, tidy and minimal background, fresh and welcoming atmosphere'
  }

  // Handyman / Home Maintenance
  if (categoryLower.includes('handyman') || categoryLower.includes('maintenance') || titleLower.includes('handyman') || titleLower.includes('maintenance')) {
    return 'neatly arranged basic tools such as hammer, screwdriver, tape measure and screws on a wooden surface, suggestion of a home interior in background, warm and practical look'
  }

  // Gardening
  if (categoryLower.includes('garden') || categoryLower.includes('landscap') || titleLower.includes('garden')) {
    return 'well kept garden scene with simple plants, shrubs and gardening tools like a trowel and watering can, soft natural light, vibrant greens, calm and tidy composition'
  }

  // Painting / Home Improvement
  if (categoryLower.includes('paint') || categoryLower.includes('improvement') || titleLower.includes('paint')) {
    return 'painting scene with neatly arranged paint rollers or brushes, paint tray and colour swatches on a clean surface, hint of a freshly painted wall in the background, modern and tidy'
  }

  // Platform Updates / Getting Started
  if (categoryLower.includes('platform') || categoryLower.includes('getting started') || categoryLower.includes('welcome')) {
    return 'simple interface or dashboard elements on a laptop screen on a desk, representing an online platform, clean workspace with subtle Taskorilla brand colours'
  }

  // Community / Trust
  if (categoryLower.includes('community') || categoryLower.includes('trust') || titleLower.includes('trust')) {
    return 'friendly community scene with simple, stylised people icons or silhouettes connected in a circle, warm colours, conveys trust and cooperation, clean and modern'
  }

  // Local Services / General
  if (categoryLower.includes('local services') || categoryLower.includes('services')) {
    return 'collage of simple icons representing multiple local services (tools, house, cleaning, gardening) arranged neatly on a neutral background, modern flat illustration style'
  }

  // Default: professional service concept
  return 'professional service concept with simple, clean icons on a neutral background, modern flat illustration style, calm and trustworthy atmosphere'
}

/**
 * Generate high-quality OG image prompt for AI image generation
 * Creates abstract, symbolic visuals without text - modern, clean, minimalistic
 */
export function generateOgImagePrompt(post: BlogPost): string {
  const category = post.category || 'Service'
  const visualConcept = getCategoryVisualConcept(category, post.title)
  const locationText = post.location ? `, set in ${post.location}` : ''

  return `Generate a 1200x630px Open Graph image for a blog post.

Visual theme:
- ${visualConcept}${locationText}
- Clean, professional, modern look
- Subtle textures only, no random lines, no scribbles, no noisy abstract patterns

Layout:
- Strong, clear focal point related to the topic
- Good use of empty space so the composition is not busy
- No text blocks, no headings, no labels

Branding:
- Use the Taskorilla brand accent colour #FD9212 together with neutral background tones
- You may suggest a simple abstract brand mark, but do not draw readable letters or words

Colours:
- Use #FD9212 as the main accent colour
- Neutral or light background so future overlays would be easy to read
- Avoid harsh or clashing colour combinations

Technical:
- Final size: 1200x630 pixels
- Format: PNG
- High resolution, sharp, professional quality

Important:
- The design must directly relate to the blog topic
- Do NOT include any text, words, letters, numbers or typography in the image
- Avoid irrelevant abstract shapes or chaotic elements.`
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
