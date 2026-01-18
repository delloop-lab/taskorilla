# How to Edit Blog Posts

## ✅ Edit Interface Complete

The blog post system now supports **full editing** of existing posts, including text content and images.

## Features

- ✅ **Edit all fields**: Title, content, meta description, tags, CTA
- ✅ **Edit/Upload images**: Change or upload new OG images
- ✅ **Visual editor**: See current content and images
- ✅ **JSON preview**: Get updated JSON to copy into `lib/blog-data.ts`
- ✅ **Image preview**: See current image and upload new ones

---

## How to Edit a Blog Post

### Step 1: Access the Admin Panel

1. Go to `/admin`
2. Click the **"Blog"** tab

### Step 2: Select a Post to Edit

1. Scroll to the **"All Blog Posts"** section
2. You'll see a list of all blog posts with:
   - Title
   - Category and location
   - Date
   - Status indicator (✓ Has OG image if image exists)
3. Click the **"Edit"** button next to the post you want to edit

### Step 3: Edit the Post

The form will load with all existing data:

- **Service Type** - Dropdown (auto-filled from category)
- **Location** - Dropdown (auto-filled)
- **Title** - Text field (editable)
- **Slug** - Text field (editable, but be careful - changing it affects the URL)
- **Meta Description** - Textarea (editable)
- **OG Image Upload** - Shows current image if exists, allows uploading new one
- **Featured Image URL** - Legacy field (optional)
- **Article Tags** - Comma-separated (editable)
- **Snippet** - Textarea (editable)
- **Content Blocks** - Dynamic H2 + Paragraph pairs (fully editable)
- **CTA** - Text field (editable)

### Step 4: Upload/Change Image (Optional)

If you want to change the OG image:

1. In the **OG Image Upload** section:
   - If an image exists, you'll see a preview
   - Click "Choose File" to select a new image
   - Click **"Upload Image"** button
   - The new image will replace the old one

2. To remove the current image:
   - Click **"Remove Current Image"** button

### Step 5: Save Changes (Fully Automatic!)

1. Click the **"Update Blog Post"** button (or "Save Blog Post" for new posts)
2. The form will validate all fields
3. **The post is automatically saved to `lib/blog-data.ts`** - no manual file editing needed!
4. You'll see a success message
5. The page will automatically refresh to show your changes
6. **Done!** ✅ No coding required!

---

## Example: Editing a Post

### Before Editing

```typescript
{
  title: "How to Find a Reliable Plumber in Faro",
  slug: "how-to-find-a-reliable-plumber-faro",
  category: "Plumbing",
  location: "Faro",
  date: "2026-01-16",
  // ... other fields
}
```

### After Editing (in the form)

1. Change title to: "Expert Guide: Finding Trusted Plumbers in Faro"
2. Update meta description
3. Add new content blocks
4. Upload new OG image

### After Saving (Automatic!)

The post is automatically saved to `lib/blog-data.ts` with all your changes. You don't need to copy or paste anything - it's all automatic!

---

## Important Notes

### Slug Changes

⚠️ **Warning**: Changing the slug changes the blog post URL!

- Old URL: `/blog/how-to-find-a-reliable-plumber-faro`
- New URL: `/blog/new-slug-name`

If you change the slug:
1. Update the slug in `lib/blog-data.ts`
2. Rename the image file if it exists:
   ```bash
   mv public/images/blog/og/old-slug.png public/images/blog/og/new-slug.png
   ```
3. Update any internal links to the post

### Image Upload

- **Recommended size**: 1200x630px
- **Formats**: PNG, JPG, JPEG, WebP
- **Max size**: 5MB
- **Location**: Images are saved to `/public/images/blog/og/[slug].[ext]`

### Date Preservation

- The original publication date is **preserved** when editing
- Only update the date if you're republishing or correcting it

### Content Blocks

- Content blocks are displayed as **H2 + Paragraph** pairs
- You can:
  - Edit existing blocks
  - Remove blocks (minimum 1 required)
  - Add new blocks
- Changes are reflected in the JSON preview immediately

---

## Workflow Summary

```
1. Go to /admin → Blog tab
2. Click "Edit" on a post
3. Make your changes (text, images, etc.)
4. Click "Update Blog Post"
5. Wait for success message
6. Page refreshes automatically
7. Done! ✅ (No coding or file editing needed!)
```

---

## Troubleshooting

### Form Not Loading Post Data

- Check that the post exists in `lib/blog-data.ts`
- Verify the slug matches exactly
- Refresh the page

### Image Not Uploading

- Check file size (< 5MB)
- Verify file type (PNG, JPG, JPEG, WebP)
- Ensure slug is set before uploading
- Check browser console for errors

### JSON Preview Not Updating

- Make sure all required fields are filled
- Check validation errors (red text below fields)
- Try clicking "Generate Blog JSON" button manually

### Changes Not Reflecting

- Wait a moment for the automatic save to complete
- Check the success message appeared
- The page should auto-refresh - if not, manually refresh
- Clear browser cache if needed
- Check server logs if save failed

---

## Tips

1. **Automatic Save**: Everything is saved automatically - no manual file editing needed!
2. **Backup**: The system automatically updates `lib/blog-data.ts` - consider using git for version control
3. **Test**: After saving, visit `/blog/[slug]` to verify changes
4. **Images**: Upload images before saving to ensure they're included
5. **Validation**: Fix any validation errors (shown in red) before saving
6. **Success Message**: Wait for the success message before navigating away

---

**Status:** ✅ Fully functional! You can now edit any blog post including text and images.
