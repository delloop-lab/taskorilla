# Fix: "No API key found in request" Error

This error means your Supabase environment variables are missing or not loaded correctly.

## Quick Fix

### Step 1: Check Your `.env.local` File

Make sure you have a `.env.local` file in the **root directory** of your project with:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important:**
- File must be named exactly `.env.local` (not `.env` or `env.local`)
- Must be in the root directory (same level as `package.json`)
- No spaces around the `=` sign
- No quotes around the values (unless they contain spaces)

### Step 2: Get Your Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Project Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Step 3: Add to `.env.local`

Create or update `.env.local` in your project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://pcvfemhakrqzeiegzusn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

**Replace** `your-actual-anon-key-here` with your actual anon key from Supabase.

### Step 4: Restart Your Development Server

**CRITICAL:** Environment variables are only loaded when the server starts.

1. **Stop** your dev server (Ctrl+C)
2. **Start** it again:
   ```bash
   npm run dev
   ```

### Step 5: Verify It's Working

Check the browser console - you should **NOT** see:
```
Supabase environment variables are not set...
```

If you still see that warning, the variables aren't loaded correctly.

---

## Common Issues

### Issue 1: File in Wrong Location

**Wrong:**
```
project/
  app/
    .env.local  ❌
```

**Correct:**
```
project/
  .env.local  ✅
  package.json
  app/
```

### Issue 2: Wrong Variable Names

**Wrong:**
```env
SUPABASE_URL=...  ❌
SUPABASE_KEY=...  ❌
```

**Correct:**
```env
NEXT_PUBLIC_SUPABASE_URL=...  ✅
NEXT_PUBLIC_SUPABASE_ANON_KEY=...  ✅
```

**Note:** The `NEXT_PUBLIC_` prefix is required for client-side access!

### Issue 3: Server Not Restarted

After adding/updating `.env.local`, you **MUST** restart the server:
```bash
# Stop server (Ctrl+C)
npm run dev  # Start again
```

### Issue 4: Empty Values

**Wrong:**
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

**Correct:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://pcvfemhakrqzeiegzusn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Issue 5: Extra Spaces or Quotes

**Wrong:**
```env
NEXT_PUBLIC_SUPABASE_URL = "https://..."  ❌
NEXT_PUBLIC_SUPABASE_URL='https://...'  ❌
```

**Correct:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://...  ✅
```

---

## Example `.env.local` File

Here's a complete example:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://pcvfemhakrqzeiegzusn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjdmZlbWhha3JxemVpZWd6dXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTk5OTk5OTksImV4cCI6MjAxNTc3NTk5OX0.example

# Site URL (for redirects)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Airwallex (for payments)
AIRWALLEX_CLIENT_ID=your_client_id
AIRWALLEX_API_KEY=your_api_key
AIRWALLEX_ENVIRONMENT=sandbox
AIRWALLEX_WEBHOOK_SECRET=your_webhook_secret

# SMTP (for transactional emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Taskorilla <noreply@taskorilla.com>"
```

---

## Verify Environment Variables Are Loaded

Add this temporarily to check (then remove it):

```typescript
// In any component or page
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...')
```

If these show `undefined`, the variables aren't loaded.

---

## For Production Deployment

When deploying (Vercel, Netlify, etc.):

1. Go to your hosting platform's dashboard
2. Find **Environment Variables** or **Settings** → **Environment**
3. Add the same variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Redeploy your app

**Never commit `.env.local` to git!** It should be in `.gitignore`.

---

## Still Not Working?

1. **Check browser console** for the exact error
2. **Check terminal** where `npm run dev` is running for warnings
3. **Verify** `.env.local` file exists and has correct values
4. **Restart** the dev server completely
5. **Clear browser cache** and hard refresh (Ctrl+Shift+R)

If still having issues, share:
- The exact error message
- Whether you see the warning about missing env variables
- Your `.env.local` file structure (without showing actual keys)



