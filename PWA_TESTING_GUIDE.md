# PWA Testing Guide

Complete guide to test all PWA features and verify everything is working correctly.

## Prerequisites

1. **Build the app in production mode:**
   ```bash
   npm run build
   npm start
   ```

2. **Access via localhost** (required for service workers):
   - ✅ `http://localhost:3000`
   - ❌ `http://127.0.0.1:3000` (won't work)

---

## 1. Service Worker Testing

### Chrome DevTools Method

1. **Open Chrome DevTools** (F12 or Right-click → Inspect)
2. **Go to Application tab**
3. **Check Service Workers section:**
   - Should show `/sw.js` registered
   - Status: "activated and is running"
   - Scope: `/`
   - Source: `http://localhost:3000/sw.js`

4. **Check Console:**
   - Should see: "Service Worker registered successfully: /"
   - No errors related to service worker

5. **Test Update:**
   - Click "Update" button in Service Workers section
   - Should see update process

### Manual Verification

1. **Open Console** (F12 → Console tab)
2. **Run this command:**
   ```javascript
   navigator.serviceWorker.getRegistrations().then(regs => {
     console.log('Registered SWs:', regs);
     regs.forEach(reg => console.log('Scope:', reg.scope, 'Active:', reg.active));
   });
   ```
   - Should show at least one registration
   - Scope should be `/`

---

## 2. Offline Functionality Testing

### Test Offline Mode

1. **Open Chrome DevTools** (F12)
2. **Go to Network tab**
3. **Enable "Offline" mode** (toggle in Network tab)
4. **Refresh the page** (F5)
5. **Expected Results:**
   - ✅ Previously visited pages should load from cache
   - ✅ New pages should show `/offline.html` fallback
   - ✅ Static assets (images, CSS, JS) should load from cache

### Test Cache Storage

1. **Open Chrome DevTools** → **Application tab**
2. **Expand "Cache Storage"**
3. **Should see:**
   - `offlineCache` - Runtime cache for HTTP requests
   - `start-url` - Cache for start URL
   - `workbox-precache-v2-*` - Precache for static assets

4. **Click on a cache** to see cached files:
   - Should see HTML pages, JS bundles, CSS files, images, etc.

### Test Offline Fallback

1. **Go offline** (Network tab → Offline)
2. **Navigate to a page you haven't visited** (e.g., `/tasks/new`)
3. **Expected:** Should show the custom offline page (`/offline.html`)
   - Orange gradient background
   - "You're Offline" message
   - "Try Again" button

---

## 3. Manifest Testing

### Chrome DevTools Method

1. **Open Chrome DevTools** → **Application tab**
2. **Click "Manifest" in left sidebar**
3. **Verify:**
   - ✅ Name: "Taskorilla - Swing Into Action"
   - ✅ Short name: "Taskorilla"
   - ✅ Theme color: #FD9212
   - ✅ Background color: #ffffff
   - ✅ Display: standalone
   - ✅ Start URL: /
   - ✅ Icons: All sizes listed (72x72 to 512x512)
   - ✅ Shortcuts: "Post a Task" and "Browse Tasks"

4. **Check for errors:**
   - Should show "No issues" or list any problems

### Manual Manifest Check

1. **Open in browser:**
   ```
   http://localhost:3000/manifest.json
   ```
2. **Verify JSON is valid** and contains all required fields

---

## 4. Installation Testing

### Desktop Chrome/Edge

1. **Look for install button** in address bar (usually a "+" or install icon)
2. **Or check menu:**
   - Click three dots menu (⋮)
   - Look for "Install Taskorilla" option
3. **Click Install**
4. **Expected:**
   - App opens in standalone window (no browser UI)
   - App icon appears on desktop/taskbar
   - Can launch from Start Menu (Windows) or Applications (Mac)

### Android Chrome

1. **Open site in Chrome**
2. **Look for install banner** at bottom of screen
3. **Or use menu:**
   - Tap three dots menu (⋮)
   - Select "Add to Home screen" or "Install app"
4. **Expected:**
   - App icon appears on home screen
   - Opens in standalone mode (no browser UI)
   - Can launch like a native app

### iOS Safari

1. **Open site in Safari**
2. **Tap Share button** (square with arrow)
3. **Select "Add to Home Screen"**
4. **Customize name** (if desired)
5. **Tap "Add"**
6. **Expected:**
   - App icon appears on home screen
   - Opens in standalone mode
   - Status bar matches theme color

---

## 5. App Shortcuts Testing

### Desktop (Windows/Mac)

1. **Right-click installed app icon**
2. **Should see shortcuts:**
   - "Post a Task" → Opens `/tasks/new`
   - "Browse Tasks" → Opens `/tasks`

### Android

1. **Long-press app icon** on home screen
2. **Should show shortcuts menu** with:
   - "Post a Task"
   - "Browse Tasks"

---

## 6. Theme & Branding Testing

### Theme Color

1. **Install the app** (see Installation Testing)
2. **Open the installed app**
3. **Check:**
   - ✅ Status bar (mobile) should be orange (#FD9212)
   - ✅ Browser UI (if visible) should match theme color
   - ✅ Splash screen should use theme color

### Icons

1. **Check app icon** on home screen/desktop:
   - Should show Taskorilla mascot
   - Should be clear and recognizable
   - Should match app branding

---

## 7. Performance Testing

### Lighthouse PWA Audit

1. **Open Chrome DevTools** → **Lighthouse tab**
2. **Select:**
   - ✅ Progressive Web App
   - ✅ Desktop or Mobile
3. **Click "Generate report"**
4. **Check PWA section:**
   - ✅ Should score 100/100 or close
   - ✅ All checks should pass:
     - Registers a service worker
     - Responds with 200 when offline
     - Has a web app manifest
     - Uses HTTPS (or localhost)
     - Has a valid start URL
     - Has icons

### Network Performance

1. **Open DevTools** → **Network tab**
2. **Reload page** (F5)
3. **Check:**
   - ✅ Static assets load from cache (fast)
   - ✅ Service worker intercepts requests
   - ✅ Offline requests use cache

---

## 8. Platform-Specific Testing

### Android Testing

**Requirements:**
- Android device or emulator
- Chrome browser
- HTTPS or localhost

**Steps:**
1. Connect device to same network as dev machine
2. Access via `http://[your-ip]:3000` (if on network) or deploy to HTTPS
3. Follow Android installation steps above
4. Test offline mode
5. Test app shortcuts

### iOS Testing

**Requirements:**
- iOS device or simulator
- Safari browser
- HTTPS (required for iOS PWA)

**Steps:**
1. Deploy to HTTPS server (iOS requires HTTPS, not localhost)
2. Open in Safari
3. Follow iOS installation steps above
4. Test standalone mode
5. Test offline functionality

### Desktop Testing

**Requirements:**
- Chrome, Edge, or Firefox
- Windows/Mac/Linux

**Steps:**
1. Install via browser
2. Test standalone window
3. Test app shortcuts
4. Test offline mode

---

## 9. Common Issues & Solutions

### Service Worker Not Registering

**Symptoms:**
- No service worker in DevTools
- Console errors

**Solutions:**
1. ✅ Ensure production build: `npm run build && npm start`
2. ✅ Access via `localhost`, not `127.0.0.1`
3. ✅ Check Console for errors
4. ✅ Clear browser cache and hard refresh
5. ✅ Check `public/sw.js` exists after build

### Offline Not Working

**Symptoms:**
- Pages don't load offline
- Shows browser offline page instead of custom one

**Solutions:**
1. ✅ Visit pages first (to cache them)
2. ✅ Check Cache Storage in DevTools
3. ✅ Verify service worker is active
4. ✅ Check Network tab for failed requests

### Install Prompt Not Showing

**Symptoms:**
- No install button/banner
- Can't install app

**Solutions:**
1. ✅ Ensure HTTPS (or localhost for development)
2. ✅ Check manifest.json is accessible
3. ✅ Verify all required icons exist
4. ✅ Check manifest has valid `start_url`
5. ✅ Ensure service worker is registered
6. ✅ Wait a few seconds (prompt may be delayed)

### Icons Not Showing

**Symptoms:**
- Generic icon instead of app icon
- Icons missing in manifest

**Solutions:**
1. ✅ Run `npm run generate-icons` to create icons
2. ✅ Verify icons exist in `public/icons/`
3. ✅ Check manifest.json icon paths are correct
4. ✅ Clear browser cache
5. ✅ Reinstall app

---

## 10. Quick Test Checklist

Use this checklist for quick verification:

- [ ] Service worker registered (DevTools → Application → Service Workers)
- [ ] Manifest valid (DevTools → Application → Manifest)
- [ ] Icons generated (`public/icons/` directory has all files)
- [ ] Offline works (Network → Offline → Refresh page)
- [ ] Cache storage populated (Application → Cache Storage)
- [ ] Install prompt appears (Desktop/Android)
- [ ] App installs successfully
- [ ] App opens in standalone mode
- [ ] Theme color applied (status bar/browser UI)
- [ ] App shortcuts work (right-click/long-press icon)
- [ ] Lighthouse PWA score > 90

---

## 11. Advanced Testing

### Test Service Worker Updates

1. **Make a change** to your app
2. **Rebuild:** `npm run build`
3. **Restart:** `npm start`
4. **Reload page** - should detect new service worker
5. **Check DevTools** - should show "waiting to activate"
6. **Close all tabs** - service worker should activate
7. **Reopen** - should use new version

### Test Cache Expiration

1. **Open DevTools** → **Application** → **Cache Storage**
2. **Check cache size** and entries
3. **Wait for expiration** (if configured)
4. **Verify old entries removed**

### Test Network-First Strategy

1. **Open DevTools** → **Network tab**
2. **Throttle network** to "Slow 3G"
3. **Navigate pages**
4. **Verify:** Tries network first, falls back to cache if slow

---

## Success Criteria

Your PWA is working correctly if:

✅ **Service Worker:**
- Registers automatically
- Shows in DevTools
- Handles offline requests

✅ **Offline:**
- Cached pages load offline
- Shows custom offline page for uncached pages
- Static assets load from cache

✅ **Installation:**
- Install prompt appears
- App installs successfully
- Opens in standalone mode

✅ **Manifest:**
- All fields present and valid
- Icons display correctly
- Theme color applied

✅ **Performance:**
- Lighthouse PWA score > 90
- Fast loading from cache
- Smooth offline experience

---

## Need Help?

If something isn't working:

1. **Check Console** for errors
2. **Check DevTools** → **Application** → **Service Workers** for status
3. **Verify build** - ensure you ran `npm run build`
4. **Check files exist:**
   - `public/sw.js`
   - `public/manifest.json`
   - `public/icons/*.png`
5. **Clear cache** and try again
6. **Check browser compatibility** - use Chrome/Edge for best support

---

**Happy Testing! 🚀**





