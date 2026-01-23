# Meta Tags in HEAD - Summary

This document shows all the meta tags that are generated in the `<head>` section of your pages.

## Root Layout Meta Tags (All Pages)

### Basic Meta Tags
```html
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover" />
<meta name="theme-color" content="#FD9212" />
<title>Taskorilla - Swing Into Action</title>
<meta name="description" content="A marketplace for posting and bidding on tasks" />
```

### PWA & Manifest
```html
<link rel="manifest" href="/manifest.json" />
```

### Apple Web App Meta Tags
```html
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Taskorilla" />
```

### Icons
```html
<link rel="icon" href="/icons/icon-192x192.png" sizes="192x192" type="image/png" />
<link rel="icon" href="/icons/icon-512x512.png" sizes="512x512" type="image/png" />
<link rel="shortcut icon" href="/icons/icon-192x192.png" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" sizes="180x180" type="image/png" />
```

### Facebook App ID (Static HTML)
```html
<meta property="fb:app_id" content="[YOUR_FACEBOOK_APP_ID]" />
```
**Note:** This is added directly in the static HTML `<head>` section, ensuring Facebook's crawler (which doesn't execute JavaScript) can see it.

---

## Blog Post Pages - Additional Meta Tags

### Open Graph Tags (via Next.js Metadata API)
```html
<meta property="og:title" content="[Blog Post Title] - Taskorilla" />
<meta property="og:description" content="[Blog post meta description]" />
<meta property="og:type" content="article" />
<meta property="og:url" content="https://taskorilla.com/blog/[slug]" />
<meta property="og:image" content="https://taskorilla.com/images/blog/og/[slug].jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:type" content="image/jpeg" />
<meta property="og:image:secure_url" content="https://taskorilla.com/images/blog/og/[slug].jpg" />
<meta property="og:site_name" content="Taskorilla" />
<meta property="og:locale" content="en_US" />
<meta property="article:published_time" content="[Post Date]" />
<meta property="article:modified_time" content="[Post Date]" />
<meta property="article:author" content="Taskorilla" />
<meta property="article:tag" content="[Tag 1]" />
<meta property="article:tag" content="[Tag 2]" />
<!-- ... more tags ... -->
```

### Twitter Card Tags
```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="[Blog Post Title]" />
<meta name="twitter:description" content="[Blog post meta description]" />
<meta name="twitter:image" content="https://taskorilla.com/images/blog/og/[slug].jpg" />
<meta name="twitter:creator" content="@taskorilla" />
<meta name="twitter:site" content="@taskorilla" />
```

### Canonical URL
```html
<link rel="canonical" href="https://taskorilla.com/blog/[slug]" />
```

### JSON-LD Structured Data
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "[Blog Post Title]",
  "description": "[Blog post description]",
  "image": "https://taskorilla.com/images/blog/og/[slug].jpg",
  "author": {
    "@type": "Organization",
    "name": "Taskorilla"
  },
  "datePublished": "[Post Date]",
  "dateModified": "[Post Date]",
  "publisher": {
    "@type": "Organization",
    "name": "Taskorilla",
    "logo": {
      "@type": "ImageObject",
      "url": "https://taskorilla.com/images/taskorilla_header_logo.png"
    }
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://taskorilla.com/blog/[slug]"
  },
  "articleSection": "[Category]",
  "keywords": "[Tags]"
}
</script>
```

---

## How Meta Tags Are Generated

### Root Layout (`app/layout.tsx`)
- **Metadata API**: Uses Next.js `Metadata` object to generate standard meta tags
- **Static HTML**: `fb:app_id` meta tag is added directly in the `<head>` section as static HTML
- **Component**: `FacebookAppIdMeta` component acts as a cleanup mechanism to remove any incorrect tags

### Blog Post Layout (`app/blog/[slug]/layout.tsx`)
- **Dynamic Metadata**: Uses `generateMetadata()` function to create page-specific meta tags
- **Open Graph**: Automatically generated from `openGraph` object in metadata
- **Twitter Cards**: Automatically generated from `twitter` object in metadata
- **Canonical URL**: Generated from `alternates.canonical`

### Blog Post Page (`app/blog/[slug]/page.tsx`)
- **JSON-LD**: Generated via `generateJsonLd()` function for structured data

---

## Facebook App ID Implementation

The `fb:app_id` meta tag is added in **two ways** to ensure maximum compatibility:

1. **Static HTML in `<head>`** (in `app/layout.tsx`)
   - Added directly in the `<head>` section as static HTML
   - Uses `property="fb:app_id"` attribute (required by Facebook)
   - **Critical**: Facebook's crawler doesn't execute JavaScript, so this must be in static HTML
   - Ensures Facebook's crawler can see it immediately

2. **React Component Cleanup** (`components/FacebookAppIdMeta.tsx`)
   - Client-side component that runs after React hydrates
   - Removes any incorrect `name="fb:app_id"` tags that might be injected elsewhere
   - Ensures the correct `property="fb:app_id"` tag exists
   - Acts as a cleanup/safety mechanism

---

## Important Notes

1. **Facebook requires `property` attribute**, not `name` attribute for `fb:app_id`
2. **Next.js Metadata API** uses `name` attribute for tags in the `other` field, which is why we can't use it for `fb:app_id`
3. **Static HTML is required** because Facebook's crawler doesn't execute JavaScript - the tag must be in the initial HTML response
4. **Open Graph tags** are automatically generated by Next.js with `property` attributes (correct for Facebook)

---

## Verification

To verify meta tags are correct:

1. **View Page Source**: Right-click → View Page Source and search for `<meta`
2. **Browser DevTools**: Open DevTools → Elements → `<head>` section
3. **Facebook Debugger**: https://developers.facebook.com/tools/debug/
4. **Twitter Card Validator**: https://cards-dev.twitter.com/validator
5. **Google Rich Results Test**: https://search.google.com/test/rich-results
