# Webhook Setup for Local Development

## Using ngrok (Recommended)

1. **Install ngrok**:
   ```bash
   # Download from https://ngrok.com/download
   # Or use npm: npm install -g ngrok
   ```

2. **Start your Next.js dev server**:
   ```bash
   npm run dev
   ```

3. **Start ngrok tunnel**:
   ```bash
   ngrok http 3000
   ```

4. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

5. **Configure webhook in Airwallex**:
   - Notification URL: `https://abc123.ngrok.io/api/airwallex/webhook`
   - Version: `2025-08-29`
   - Signature Algorithm: `SHA256`
   - Events: Select payment and payout events (see main setup guide)

6. **Copy webhook secret** from Airwallex and add to `.env.local`:
   ```env
   AIRWALLEX_WEBHOOK_SECRET=your_webhook_secret_here
   ```

## Testing the Webhook

1. In Airwallex webhook configuration, click "Test event"
2. Check your server logs to see if the webhook is received
3. Verify the webhook signature is validated correctly

## Production Setup

For production, use your actual domain:
- Notification URL: `https://yourdomain.com/api/airwallex/webhook`
- Make sure your server is accessible from the internet
- Use HTTPS (required by Airwallex)





