# Email Notifications Setup (SMTP)

The application now sends all transactional emails directly through your SMTP server using Nodemailer. No third‑party email APIs are required.

## Step 1: Configure SMTP Environment Variables

Add the following to your `.env.local` file:

```env
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
SMTP_FROM="Taskorilla <tee@taskorilla.com>"
SMTP_SECURE=false            # set to true if you use port 465 / SSL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- For production, update `NEXT_PUBLIC_APP_URL` to your live domain.
- `SMTP_FROM` controls the `from` header for all outgoing emails.

## Step 2: Verify SMTP Access

1. Make sure the credentials above can send mail through your provider.
2. If your provider restricts sender addresses, ensure `SMTP_FROM` uses an allowed mailbox.
3. If you switch to a different SMTP host (SendGrid, Mailgun, etc.), just update the env vars—no code changes needed.

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

1. Add the SMTP variables to `.env.local`.
2. Restart your dev server: `npm run dev`.
3. Trigger a workflow (place bid, accept bid, send message, mark task complete, etc.).
4. Check the inbox for the `SMTP_FROM` account or your SMTP provider’s logs.

## Production Deployment

1. Set all SMTP variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_SECURE`) in your hosting provider’s environment settings.
2. Set `NEXT_PUBLIC_APP_URL` to your production domain.
3. Restart the app to pick up the new env variables.

## Email Templates

All email templates are in `lib/email.ts`. You can customize:
- Email styling
- Content and messaging
- Subject lines
- Call-to-action buttons


