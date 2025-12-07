# How to Get Your Airwallex API Key

## Step-by-Step Instructions

### 1. Log into Airwallex Dashboard
- **Demo/Sandbox**: https://demo.airwallex.com/
- **Production**: https://www.airwallex.com/app/

### 2. Navigate to API Keys
1. Click on **Settings** (gear icon) in the left sidebar
2. Go to **Developer** → **API Keys**
3. Or directly visit: https://demo.airwallex.com/app/settings/api

### 3. Find Your API Key
You should see:
- **Client ID**: `SoG_nJaTQOy7_7KQ5CsBTw` (you already have this)
- **API Key**: A long string (32+ characters) - **THIS IS WHAT YOU NEED**

The API Key format is usually:
- Starts with: `sk_demo_` (for demo/sandbox) or `sk_live_` (for production)
- Example: `sk_demo_1234567890abcdefghijklmnopqrstuvwxyz`

### 4. Copy the API Key
- Click **Show** or **Reveal** to see the full API key
- Copy the entire key (it's usually quite long)

### 5. Update Your .env.local
Replace the current `AIRWALLEX_API_KEY` value:

```env
AIRWALLEX_API_KEY=sk_demo_your_actual_long_api_key_here
AIRWALLEX_ENVIRONMENT=demo
```

### 6. Restart Your Dev Server
```bash
# Stop the server (Ctrl+C)
npm run dev
```

### 7. Test Again
Open: http://localhost:3000/test-simple.html

---

## Common Issues

### "I don't see an API Key in the dashboard"
- You may need to **generate** or **create** a new API key
- Look for a button like "Create API Key" or "Generate New Key"
- Make sure you're in the **Demo/Sandbox** environment

### "The API Key is too short"
- You might be looking at the **Client ID** instead
- The API Key should be much longer (32+ characters)
- Client ID: `SoG_nJaTQOy7_7KQ5CsBTw` ❌ (this is NOT the API key)
- API Key: `sk_demo_1234567890abcdef...` ✅ (this is what you need)

### "I can't find the API Keys section"
- Try searching for "API" in the dashboard search bar
- Or contact Airwallex support to help you locate it

---

## What We're Currently Using (INCORRECT)

Current API Key: `2c56b9f671646a3...`
- This is being **rejected** by Airwallex
- Error: "Access denied, authentication failed"
- This might be:
  - An expired key
  - A truncated key
  - A key from a different service
  - Not a valid Airwallex API key

## What You Need

A valid Airwallex Demo/Sandbox API key that:
- Is 32+ characters long
- Starts with `sk_demo_` (for demo environment)
- Is active and not expired
- Has permissions to create customers

---

## After Getting the Correct Key

Once you have the correct API key:

1. Update `.env.local`
2. Restart dev server
3. Test at http://localhost:3000/test-simple.html
4. You should see a **200 OK** response with customer data

If you still get 401, the key might not have the right permissions. Check the key's permissions in the Airwallex dashboard.





