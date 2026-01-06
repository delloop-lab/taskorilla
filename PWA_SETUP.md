# PWA Setup Guide

Taskorilla has been configured as a Progressive Web App (PWA) with full offline support and installability.

## What's Been Configured

1. **next-pwa** - Service worker and PWA functionality
2. **manifest.json** - Web app manifest with all required fields
3. **Meta tags** - Complete PWA meta tags in layout.tsx
4. **Offline fallback** - Custom offline page
5. **Icon generation script** - Script to generate all required icon sizes

## Generating Icons

To generate all required PWA icons, run:

```bash
npm run generate-icons
```

Or manually:

```bash
node scripts/generate-icons.js
```

This will generate icons in `public/icons/` from the source image at `public/images/taskorilla-mascot.png`.

**Required icon sizes:**
- 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512
- Apple touch icon: 180x180
- Favicon: 32x32

## Testing the PWA

### Development
1. Build the app: `npm run build`
2. Start production server: `npm start`
3. Open Chrome DevTools > Application > Manifest to verify
4. Check Service Workers in Application tab

### Installation
- **Android/Chrome**: Look for "Install" prompt or menu option
- **Desktop Chrome**: Install button in address bar
- **iOS Safari**: Share > Add to Home Screen

## Features

- ✅ Offline caching of pages and static assets
- ✅ Installable on Android, iOS, and Desktop
- ✅ Standalone display mode
- ✅ Theme color and branding
- ✅ App shortcuts (Post Task, Browse Tasks)
- ✅ Offline fallback page

## Configuration Files

- `next.config.js` - PWA configuration
- `public/manifest.json` - Web app manifest
- `public/offline.html` - Offline fallback page
- `app/layout.tsx` - PWA meta tags
- `public/browserconfig.xml` - Windows tile configuration

## Notes

- Service worker is disabled in development mode (only active in production)
- Icons are generated from the mascot image - ensure it exists before running the script
- Theme color: #FD9212 (orange)
- Background color: #ffffff (white)





















