# Manual OG Image Upload System

## ✅ Implementation Complete

The Taskorilla blog system has been updated to use **manual image uploads** instead of AI-generated images.

## Changes Made

### 1. **BlogPost Interface Updated** (`lib/blog-data.ts`)
- Added `ogImageUpload?: string` field (highest priority)
- Maintains backward compatibility with `ogImage` and `featuredImageUrl`

### 2. **New Upload API Endpoint** (`app/api/blog/upload-og-image/route.ts`)
- **POST** `/api/blog/upload-og-image`
- Accepts FormData with:
  - `file`: Image file (PNG, JPG, JPEG, WebP)
  - `slug`: Blog post slug
- Validates file type and size (max 5MB)
- Saves to `/public/images/blog/og/[slug].[ext]`
- Returns: `{ success: boolean, imagePath: string }`

### 3. **Admin Form Updated** (`components/CreateBlogPost.tsx`)
- New **OG Image Upload** field with file picker
- Image preview before upload
- Upload button (requires slug to be set)
- Remove image option
- Legacy "Featured Image URL" field kept for backward compatibility

### 4. **Priority System Updated** (`lib/blog-image-utils.ts`)
- **Priority order:**
  1. `ogImageUpload` (manually uploaded)
  2. `ogImage` (legacy)
  3. `featuredImageUrl` (legacy)
  4. `/images/blog/og/default.png` (fallback)

### 5. **Meta Tags Updated** (`app/blog/[slug]/layout.tsx`)
- Uses new priority system
- Verifies uploaded image exists before using
- Falls back to default image if missing
- All OG and Twitter meta tags configured correctly (1200x630)

### 6. **AI Generation Disabled**
- `/api/blog/generate-og-image` endpoint returns 410 (Gone)
- Admin panel AI generation buttons removed
- Functions kept in code but disabled (commented out)

### 7. **Default Image Created**
- Created `/public/images/blog/og/default.png` as fallback
- Used when no uploaded image exists

## How to Use

### Creating a New Blog Post with OG Image

1. Go to `/admin` → Blog tab
2. Fill in the blog post form
3. In the **OG Image Upload** section:
   - Click "Choose File" and select an image (PNG, JPG, JPEG, or WebP)
   - Recommended size: **1200x630px** for optimal social sharing
   - Max file size: **5MB**
4. Click **"Upload Image"** button (requires slug to be set)
5. Image preview will appear
6. Continue filling the form and save

### Image Storage

- **Location:** `/public/images/blog/og/[slug].[ext]`
- **Example:** `/public/images/blog/og/how-to-find-a-reliable-plumber-faro.png`
- Images are committed to git (in `public/` folder)

### Fallback Behavior

If no image is uploaded:
- System uses `/images/blog/og/default.png`
- Default image is automatically used for all meta tags
- No errors or broken images

## API Usage

### Upload Image

```bash
curl -X POST http://localhost:3000/api/blog/upload-og-image \
  -F "file=@/path/to/image.png" \
  -F "slug=blog-post-slug"
```

**Response:**
```json
{
  "success": true,
  "imagePath": "/images/blog/og/blog-post-slug.png",
  "message": "Image uploaded successfully"
}
```

## File Validation

- **Allowed types:** PNG, JPG, JPEG, WebP
- **Max size:** 5MB
- **Recommended dimensions:** 1200x630px (OG image standard)

## Migration Notes

### Existing Posts

- Existing posts with `ogImage` or `featuredImageUrl` will continue to work
- To update an existing post:
  1. Edit the post in `lib/blog-data.ts`
  2. Add `ogImageUpload: "/images/blog/og/[slug].png"` field
  3. Upload the image to `/public/images/blog/og/` folder

### AI Generation

- AI generation endpoint is disabled but code is preserved
- To re-enable, uncomment code in `/app/api/blog/generate-og-image/route.ts`
- Admin panel buttons can be restored if needed

## Benefits

✅ **Full Control:** Manual uploads give complete control over image quality and content  
✅ **No API Costs:** No OpenAI/DALL-E API charges  
✅ **Consistent Quality:** All images are manually curated  
✅ **Fast:** No waiting for AI generation  
✅ **Flexible:** Support for any image format (PNG, JPG, WebP)  

## Troubleshooting

### Image Not Appearing

1. Check file exists at `/public/images/blog/og/[slug].[ext]`
2. Verify `ogImageUpload` field in blog post data
3. Check browser console for errors
4. Verify image path is correct (should start with `/images/blog/og/`)

### Upload Fails

1. Check file size (must be < 5MB)
2. Verify file type (PNG, JPG, JPEG, or WebP)
3. Ensure slug is set before uploading
4. Check server logs for errors

### Default Image Not Found

- Default image should be at `/public/images/blog/og/default.png`
- If missing, copy an existing image or create a new one
- Recommended: Use Taskorilla logo or brand image

---

**Status:** ✅ Fully implemented and ready to use!
