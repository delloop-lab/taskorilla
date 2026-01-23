# Facebook Sharing - Troubleshooting Guide

## Issue: Facebook Shows Basic Link Preview Instead of Rich Preview

When sharing blog posts to Facebook, you might see a basic preview (just "TASKORILLA.COM" and title) instead of the rich preview with image, description, etc.

## Why This Happens

Facebook caches link previews. If you've shared the link before or Facebook scraped it when the OG tags weren't set correctly, it will show the cached version.

## Solution: Use Facebook Sharing Debugger

### Step 1: Open Facebook Sharing Debugger
Go to: https://developers.facebook.com/tools/debug/

### Step 2: Enter Your Blog Post URL
Paste the full URL of your blog post, for example:
```
https://taskorilla.com/blog/welcome-to-taskorilla-your-local-service-marketplace
```

### Step 3: Click "Debug"
Facebook will scrape the page and show you:
- What OG tags it found
- The preview image it will use
- Any errors or warnings

### Step 4: Click "Scrape Again" (if needed)
If the preview looks wrong, click "Scrape Again" to force Facebook to re-fetch the page.

### Step 5: Share Again
After refreshing the cache, try sharing the link again on Facebook. It should now show the correct preview with:
- ✅ Blog post image (OG image)
- ✅ Full title
- ✅ Description
- ✅ Site name

## Verify OG Tags Are Correct

Before using the debugger, verify your blog post has correct OG tags:

1. **View Page Source** of your blog post
2. **Look for these meta tags** in the `<head>`:
   ```html
   <meta property="og:title" content="[Your Blog Title] - Taskorilla">
   <meta property="og:description" content="[Your meta description]">
   <meta property="og:image" content="https://taskorilla.com/images/blog/og/[slug].jpg">
   <meta property="og:image:width" content="1200">
   <meta property="og:image:height" content="630">
   <meta property="og:url" content="https://taskorilla.com/blog/[slug]">
   <meta property="og:type" content="article">
   ```

## Common Issues

### Issue 1: OG Image Not Showing
- **Check**: Image URL is absolute (starts with `https://taskorilla.com`)
- **Check**: Image exists and is accessible (try opening the image URL directly)
- **Check**: Image dimensions are 1200x630px (recommended)
- **Fix**: Use Facebook Sharing Debugger to refresh cache

### Issue 2: Wrong Title/Description
- **Check**: Meta tags are in the `<head>` section
- **Check**: No duplicate OG tags
- **Fix**: Update the blog post's `metaDescription` field in `lib/blog-data.ts`

### Issue 3: Facebook Still Shows Old Preview
- **Solution**: Use Facebook Sharing Debugger and click "Scrape Again" multiple times
- **Note**: Facebook caches for up to 7 days, but you can force refresh

## Quick Test

1. Open your blog post in a browser
2. Right-click → "View Page Source"
3. Search for "og:image" - verify the URL is correct
4. Open the image URL directly - verify it loads
5. Use Facebook Sharing Debugger to refresh cache
6. Share again on Facebook

## For Each New Blog Post

When you publish a new blog post:
1. Make sure the OG image is uploaded (`ogImageUpload` field)
2. Verify the image is accessible at the URL
3. Use Facebook Sharing Debugger to scrape the new URL
4. Share on Facebook - it should work immediately

## Need Help?

If the preview still doesn't work after using the debugger:
1. Check the Facebook Sharing Debugger for error messages
2. Verify the OG image URL is accessible (not blocked by robots.txt)
3. Ensure the image is at least 200x200px (1200x630px recommended)
4. Check that the page is publicly accessible (not behind login)
