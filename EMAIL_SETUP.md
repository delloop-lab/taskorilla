# Email Notifications Setup

## Step 1: Add Resend API Key to Environment Variables

Add the following to your `.env.local` file:

```env
RESEND_API_KEY=re_hE6LCZZV_PVkvusZ7BR7zYmCYupfGFhSC
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For production, update `NEXT_PUBLIC_APP_URL` to your production domain.

## Step 2: Verify Your Domain in Resend

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Add and verify your domain
3. Update the `from` email address in `lib/email.ts` to use your verified domain:
   - Change `'Taskorilla <notifications@taskorilla.com>'` to `'Taskorilla <notifications@yourdomain.com>'`

## Step 3: Email Notifications Implemented

The following email notifications are now active:

### 1. **New Bid Notification**
- Sent to task owner when someone places a bid
- Includes bidder name, bid amount, and link to task

### 2. **Bid Accepted Notification**
- Sent to the accepted bidder
- Includes task details and confirmation

### 3. **Bid Rejected Notification**
- Sent to rejected bidders when a bid is accepted
- Polite notification with link to browse more tasks

### 4. **New Message Notification**
- Sent to message recipient when they receive a new message
- Includes sender name, message preview, and link to conversation

### 5. **Task Completed Notification**
- Sent to task owner when tasker marks task as completed
- Includes tasker name and link to task

### 6. **Task Cancelled Notification**
- Sent to task owner when tasker cancels an assigned task
- Notifies that task is back open for bids

## Testing

To test email notifications:

1. Make sure your `.env.local` has the Resend API key
2. Restart your development server: `npm run dev`
3. Trigger events (place bid, accept bid, send message, etc.)
4. Check the Resend dashboard for sent emails

## Production Deployment

When deploying to production:

1. Set `RESEND_API_KEY` in your hosting platform's environment variables
2. Set `NEXT_PUBLIC_APP_URL` to your production domain
3. Verify your domain in Resend
4. Update the `from` email address in `lib/email.ts`

## Email Templates

All email templates are in `lib/email.ts`. You can customize:
- Email styling
- Content and messaging
- Subject lines
- Call-to-action buttons


