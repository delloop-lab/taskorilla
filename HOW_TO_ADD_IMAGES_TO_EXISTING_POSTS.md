# How to Add Images to Existing Blog Posts

## Quick Guide

There are **two methods** to add OG images to existing blog posts:

1. **Method 1: Using the Upload API** (Recommended - Programmatic)
2. **Method 2: Manual File Upload + Edit Code** (Simple - Manual)

---

## Method 1: Using the Upload API (Recommended)

### Step 1: Upload the Image

Use the API endpoint to upload the image:

```bash
# Using curl
curl -X POST http://localhost:3000/api/blog/upload-og-image \
  -F "file=@/path/to/your/image.png" \
  -F "slug=your-blog-post-slug"
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/blog/upload-og-image \
  -F "file=@./my-og-image.png" \
  -F "slug=how-to-find-a-reliable-plumber-faro"
```

**Response:**
```json
{
  "success": true,
  "imagePath": "/images/blog/og/how-to-find-a-reliable-plumber-faro.png",
  "message": "Image uploaded successfully"
}
```

### Step 2: Update the Blog Post Data

Edit `lib/blog-data.ts` and add the `ogImageUpload` field to your blog post:

```typescript
{
  title: "How to Find a Reliable Plumber in Faro",
  slug: "how-to-find-a-reliable-plumber-faro",
  // ... other fields ...
  ogImageUpload: "/images/blog/og/how-to-find-a-reliable-plumber-faro.png", // Add this line
}
```

**That's it!** The image will now be used for all OG and Twitter meta tags.

---

## Method 2: Manual File Upload + Edit Code

### Step 1: Prepare Your Image

- **Recommended size:** 1200x630px (OG image standard)
- **Formats:** PNG, JPG, JPEG, or WebP
- **Max size:** 5MB

### Step 2: Copy Image to Public Folder

Copy your image file to the blog OG images folder:

**Windows:**
```powershell
Copy-Item "C:\path\to\your\image.png" "c:\projects\helper\public\images\blog\og\your-slug.png"
```

**Mac/Linux:**
```bash
cp /path/to/your/image.png /path/to/project/public/images/blog/og/your-slug.png
```

**Example:**
```bash
cp my-og-image.png public/images/blog/og/how-to-find-a-reliable-plumber-faro.png
```

### Step 3: Update the Blog Post Data

Edit `lib/blog-data.ts` and add the `ogImageUpload` field:

```typescript
{
  title: "How to Find a Reliable Plumber in Faro",
  slug: "how-to-find-a-reliable-plumber-faro",
  category: "Plumbing",
  location: "Faro",
  // ... other existing fields ...
  ogImageUpload: "/images/blog/og/how-to-find-a-reliable-plumber-faro.png", // Add this
}
```

---

## Complete Example

Here's a complete example of updating an existing blog post:

### Before:
```typescript
{
  title: "How to Find a Reliable Plumber in Faro",
  slug: "how-to-find-a-reliable-plumber-faro",
  category: "Plumbing",
  location: "Faro",
  date: "2026-01-16",
  snippet: "Finding a reliable plumber...",
  content: [...],
}
```

### After:
```typescript
{
  title: "How to Find a Reliable Plumber in Faro",
  slug: "how-to-find-a-reliable-plumber-faro",
  category: "Plumbing",
  location: "Faro",
  date: "2026-01-16",
  snippet: "Finding a reliable plumber...",
  content: [...],
  ogImageUpload: "/images/blog/og/how-to-find-a-reliable-plumber-faro.png", // ✅ Added
}
```

---

## Finding Blog Post Slugs

To find the slug for an existing post:

1. Open `lib/blog-data.ts`
2. Look for the `slug` field in each blog post object
3. Or check the URL: `/blog/[slug]` - the slug is the part after `/blog/`

**Example:**
- URL: `https://taskorilla.com/blog/how-to-find-a-reliable-plumber-faro`
- Slug: `how-to-find-a-reliable-plumber-faro`

---

## Bulk Upload Script (Optional)

If you have many posts to update, here's a helper script:

```typescript
// scripts/upload-blog-images.ts
import { blogs } from '../lib/blog-data'
import { readFileSync } from 'fs'
import { FormData } from 'formdata-node'

async function uploadImageForPost(slug: string, imagePath: string) {
  const formData = new FormData()
  const imageBuffer = readFileSync(imagePath)
  const blob = new Blob([imageBuffer])
  
  formData.append('file', blob, imagePath.split('/').pop())
  formData.append('slug', slug)
  
  const response = await fetch('http://localhost:3000/api/blog/upload-og-image', {
    method: 'POST',
    body: formData,
  })
  
  return response.json()
}

// Example usage
async function main() {
  const posts = blogs.filter(post => !post.ogImageUpload)
  
  for (const post of posts) {
    const imagePath = `./images/${post.slug}.png` // Adjust path
    if (existsSync(imagePath)) {
      console.log(`Uploading image for: ${post.title}`)
      const result = await uploadImageForPost(post.slug, imagePath)
      console.log(result)
    }
  }
}
```

---

## Verification

After adding an image:

1. **Check the file exists:**
   ```bash
   ls public/images/blog/og/your-slug.png
   ```

2. **Verify in code:**
   - Open `lib/blog-data.ts`
   - Confirm `ogImageUpload` field is present

3. **Test the blog post:**
   - Visit `/blog/your-slug`
   - View page source
   - Check `<meta property="og:image">` tag
   - Should show: `https://taskorilla.com/images/blog/og/your-slug.png`

4. **Test with OpenGraph.xyz:**
   - Go to https://www.opengraph.xyz/
   - Enter: `https://taskorilla.com/blog/your-slug`
   - Verify the image appears correctly

---

## Priority System

The system checks images in this order:

1. ✅ `ogImageUpload` (manually uploaded - **highest priority**)
2. `ogImage` (legacy field)
3. `featuredImageUrl` (legacy field)
4. `/images/blog/og/default.png` (fallback)

**Important:** If you add `ogImageUpload`, it will override any existing `ogImage` or `featuredImageUrl` fields.

---

## Troubleshooting

### Image Not Appearing

1. **Check file path:**
   - File should be at: `public/images/blog/og/[slug].[ext]`
   - Path in code should be: `/images/blog/og/[slug].[ext]` (starts with `/`)

2. **Verify slug matches:**
   - File name: `how-to-find-a-reliable-plumber-faro.png`
   - Slug in code: `how-to-find-a-reliable-plumber-faro`
   - Must match exactly!

3. **Check file extension:**
   - Use `.png`, `.jpg`, `.jpeg`, or `.webp`
   - Extension in path must match file extension

4. **Clear browser cache:**
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

### Upload API Fails

1. **Check file size:** Must be < 5MB
2. **Check file type:** Only PNG, JPG, JPEG, WebP allowed
3. **Check slug:** Must be valid (no special characters except hyphens)
4. **Check server logs:** Look for error messages

### Image Shows Default Instead

- The `ogImageUpload` field might be missing or incorrect
- Check that the field name is exactly `ogImageUpload` (case-sensitive)
- Verify the path starts with `/images/blog/og/`

---

## Quick Reference

| Task | Command/Code |
|------|-------------|
| Upload via API | `curl -X POST http://localhost:3000/api/blog/upload-og-image -F "file=@image.png" -F "slug=post-slug"` |
| Add to blog post | `ogImageUpload: "/images/blog/og/post-slug.png"` |
| File location | `public/images/blog/og/post-slug.png` |
| Recommended size | 1200x630px |
| Max file size | 5MB |

---

**Need help?** Check the main documentation in `MANUAL_OG_IMAGE_UPLOAD.md`
