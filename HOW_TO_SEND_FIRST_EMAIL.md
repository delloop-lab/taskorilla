# How to Send Your First Email

## Quick Setup (5 minutes)

### Step 1: Create `.env.local` file

Create a file named `.env.local` in the root directory (same folder as `package.json`) with:

```env
RESEND_API_KEY=re_hE6LCZZV_PVkvusZ7BR7zYmCYupfGFhSC
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 2: Restart Your Server

Stop your current server (Ctrl+C) and restart it:

```bash
npm run dev
```

### Step 3: Send Your First Email

The **easiest way** to send your first email is to **place a bid on a task**:

1. **Login as User A** (or create a new account)
2. **Create a task** (go to `/tasks/new`)
   - Fill in title, description, budget
   - Click "Post Task"
3. **Logout and login as User B** (different account)
4. **Go to the task** you just created
5. **Place a bid**:
   - Enter a bid amount
   - Click "Submit Bid"
6. **Check User A's email inbox** - they should receive an email notification!

## Other Ways to Trigger Emails

### Option 2: Accept a Bid
1. User A creates a task
2. User B places a bid
3. User A accepts the bid → User B gets "Bid Accepted" email

### Option 3: Send a Message
1. User A creates a task
2. User B clicks "Message Task Poster"
3. User B sends a message → User A gets "New Message" email

### Option 4: Complete a Task
1. User A creates a task
2. User B places a bid
3. User A accepts the bid
4. User A marks task as completed → User A gets "Task Completed" email

## Testing Without Real Users

If you want to test quickly with one account:

1. Create a task with your email
2. Open the task in an incognito window
3. Create a second account with a different email
4. Place a bid from the second account
5. Check your first email inbox

## Check if Emails Are Sending

### Method 1: Check Browser Console
Open browser DevTools (F12) → Console tab. Look for:
- ✅ Success: No errors
- ❌ Error: Check for error messages

### Method 2: Check Resend Dashboard
1. Go to [Resend Dashboard](https://resend.com/emails)
2. Click "Emails" in the sidebar
3. You should see sent emails listed there

### Method 3: Check Email Inbox
- Check spam/junk folder if email doesn't arrive
- Emails from `onboarding@resend.dev` might go to spam initially

## Troubleshooting

### Email Not Sending?

1. **Check `.env.local` exists** and has the API key
2. **Restart the server** after adding `.env.local`
3. **Check browser console** for errors
4. **Verify API key** is correct in Resend dashboard

### Email Goes to Spam?

- This is normal for test emails from `onboarding@resend.dev`
- For production, verify your domain in Resend
- Update `from` address in `lib/email.ts` to your verified domain

### API Key Invalid?

- Make sure there are no extra spaces in `.env.local`
- The key should start with `re_`
- Check [Resend Dashboard](https://resend.com/api-keys) to verify your key

## Next Steps

Once emails are working:
1. Verify your domain in Resend (for production)
2. Update `from` address in `lib/email.ts` to your domain
3. Customize email templates in `lib/email.ts`


