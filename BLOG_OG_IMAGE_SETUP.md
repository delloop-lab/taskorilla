# Blog OG Image Generation Setup

This document explains how to set up and use automatic OG image generation for blog posts in Taskorilla.

## Overview

The system automatically generates professional, high-quality 1200x630px header images for blog posts using OpenAI DALL-E 3. Images feature abstract, symbolic visuals without text - modern, clean, minimalistic design with bright colors and high contrast. Images are saved to `/public/images/blog/og/[slug].png` and automatically referenced in OG and Twitter meta tags.

## Features

- ✅ **Fully Implemented**: OpenAI DALL-E 3 integration complete
- ✅ **High-Quality Images**: Abstract, symbolic visuals, no text, modern minimalist design
- ✅ **Smart Category Mapping**: Automatically generates appropriate visuals based on blog category
- ✅ Automatic OG image path generation (`/images/blog/og/[slug].png`)
- ✅ Priority system: `ogImage` > `featuredImageUrl` > auto-generated path > fallback logo
- ✅ API endpoint for on-demand image generation
- ✅ Batch script for generating all missing images
- ✅ Force regenerate option to update all images
- ✅ Automatic meta tag configuration
- ✅ Taskorilla branding (#FD9212 orange accent)
- ✅ Error handling and fallback support

## Quick Start

### 1. Install Dependencies

The required dependencies are already installed:
- `sharp` - for image resizing
- `dotenv` - for loading environment variables (script only)
- `ts-node` - for running TypeScript scripts

### 2. Configure API Key

Add your OpenAI API key to `.env.local` in the project root:

```env
OPENAI_API_KEY=sk-your-openai-api-key-here
```

**Important**: 
- Never commit `.env.local` to git (it's already in `.gitignore`)
- Get your API key from: https://platform.openai.com/api-keys
- DALL-E 3 costs approximately $0.04 per image

### 3. Generate Images

**Option A: Generate all missing images (Recommended)**
```bash
npm run generate-blog-images
```

**Option B: Force regenerate ALL images (updates existing ones)**
```bash
npm run generate-blog-images -- --force
```

**Option C: Generate via API (single post)**
```bash
curl -X POST "http://localhost:3000/api/blog/generate-og-image?slug=post-slug"
```

**Option D: Generate all missing via API**
```bash
curl -X POST "http://localhost:3000/api/blog/generate-og-image?all=true"
```

**Option E: Force regenerate all via API**
```bash
curl -X POST "http://localhost:3000/api/blog/generate-og-image?all=true&force=true"
```

**Option F: Use Admin Panel**
- Go to `/admin` → Blog tab
- Click "Generate Missing Images" or "Force Regenerate All"

### 4. Verify Images

- Check that images exist in `public/images/blog/og/`
- Test OG tags with [OpenGraph.xyz](https://www.opengraph.xyz/)
- View page source to verify meta tags

## How It Works

### Image Generation Process

1. **Check**: Does post have `ogImage` or `featuredImageUrl`?
   - ✅ Yes → Use that URL (unless force regenerate)
   - ❌ No → Generate new image

2. **Generate Prompt**: 
   - Maps blog category to abstract visual concept
   - Creates prompt: abstract, symbolic, no text, modern minimalist
   - Examples:
     - Plumbing → abstract pipes/water flow patterns
     - Electrical → abstract circuit patterns
     - Cleaning → abstract sparkling surfaces
     - Gardening → abstract botanical shapes

3. **Generate Image**: 
   - Call OpenAI DALL-E 3 API (1792x1024, closest to 16:9)
   - Style: Modern, clean, minimalistic, bright colors, high contrast
   - No text, abstract/symbolic visuals only
   - Download generated image

4. **Resize**: 
   - Use Sharp to resize to 1200x630px
   - Save as PNG to `public/images/blog/og/[slug].png`

5. **Reference**: 
   - Meta tags automatically use the image
   - Next page load will show the new image
   - Fallback to Taskorilla logo if image missing

### Priority System

The system checks images in this order:
1. `post.ogImage` (if explicitly set)
2. `post.featuredImageUrl` (legacy support)
3. Auto-generated path `/images/blog/og/[slug].png` (if file exists)
4. Fallback to Taskorilla logo (if image doesn't exist yet)

### Automatic Meta Tags

All blog posts automatically get these meta tags:

```html
<meta property="og:image" content="https://taskorilla.com/images/blog/og/[slug].png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:title" content="[Blog Title] - Taskorilla">
<meta property="og:description" content="[Meta Description]">
<meta name="twitter:image" content="https://taskorilla.com/images/blog/og/[slug].png">
<meta name="twitter:card" content="summary_large_image">
```

## File Structure

```
public/
  images/
    blog/
      og/
        [slug].png          # Generated OG images
```

## How It Works

1. **Blog Post Interface**: Each post can have an `ogImage` field (or legacy `featuredImageUrl`)
2. **Image URL Resolution**: `getOgImageUrl()` function checks:
   - First: `post.ogImage` (if provided)
   - Second: `post.featuredImageUrl` (legacy support)
   - Third: Auto-generated path `/images/blog/og/[slug].png`
3. **Meta Tags**: Automatically configured in `app/blog/[slug]/layout.tsx`:
   - `<meta property="og:image" content="...">`
   - `<meta property="og:image:width" content="1200">`
   - `<meta property="og:image:height" content="630">`
   - `<meta name="twitter:image" content="...">`

## Image Generation Prompt

The system generates high-quality prompts with category-specific visual concepts:

**Example for Plumbing:**
```
Create a professional, modern blog header image. 
Style: Abstract, symbolic, minimalist design. Bright colors, high contrast, clean composition.
Visual concept: abstract geometric shapes representing pipes and water flow, modern blue and white color scheme with orange accent, clean minimalist design, no text
Color palette: Vibrant orange (#FD9212) as accent, complementary bright colors (blues, greens, yellows), high contrast.
Composition: Modern geometric shapes, abstract patterns, professional and visually appealing.
Technical: 1200x630 pixels, PNG format, no text, no words, no letters, no typography.
Quality: High resolution, sharp, professional photography style, studio quality lighting.
Mood: Bright, energetic, trustworthy, modern, clean.
```

**Key Features:**
- ✅ **No Text**: Images are abstract and symbolic, no words or letters
- ✅ **Category-Specific**: Each category gets appropriate visual concept
- ✅ **Modern Design**: Clean, minimalistic, high contrast
- ✅ **Professional Quality**: Studio-quality, sharp, high resolution

## Testing

1. **Check OG Tags**: Use [OpenGraph.xyz](https://www.opengraph.xyz/) to preview how your posts appear on social media
2. **Verify Images**: Check that images exist at `/public/images/blog/og/[slug].png`
3. **Test Meta Tags**: View page source and verify all OG and Twitter meta tags are present

## Troubleshooting

### Images Not Generating

- Check API key is set in `.env.local`
- Verify API service is accessible
- Check console for error messages
- Ensure `sharp` is installed for image resizing

### Images Not Displaying

- Verify images exist in `public/images/blog/og/`
- Check file permissions
- Ensure Next.js is serving static files correctly
- Clear browser cache

### Wrong Image Dimensions

- Ensure `resizeImageToOgSize` function is implemented
- Check that `sharp` is properly installed
- Verify resize parameters (1200x630)

## Future Enhancements

- [ ] Automatic image generation on blog post creation
- [ ] Image caching and optimization
- [ ] Custom image templates per category
- [ ] Batch regeneration with updated branding
- [ ] Image CDN integration

## Notes

- Images are saved to the `public` folder, so they're committed to git
- Consider using a CDN for production (Cloudinary, Imgix, etc.)
- OG images should be optimized for file size while maintaining quality
- The system supports both manual image URLs and auto-generated paths
