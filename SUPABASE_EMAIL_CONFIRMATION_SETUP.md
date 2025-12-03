# How to Set Up Email Confirmation in Supabase

Supabase sends authentication emails (signup confirmation, password reset) through its own email service, **not** through your app's SMTP configuration. The app's SMTP is only for transactional emails (bids, messages, etc.).

## Option 1: Use Supabase's Default Email Service (Limited)

Supabase provides a default email service, but it has limitations:
- **Rate limits**: Only 3 emails per hour per user
- **From address**: Uses a generic Supabase address
- **Not recommended for production**

### To use it:
1. Go to Supabase Dashboard → **Authentication** → **Settings**
2. Scroll to **Email Auth** section
3. Make sure **"Enable email confirmations"** is **ON**
4. No additional configuration needed

**Note**: Emails may go to spam, and rate limits are very restrictive.

---

## Option 2: Configure Custom SMTP in Supabase (Recommended for Production)

This allows Supabase to send authentication emails through your own SMTP server.

### Steps:

1. **Get SMTP Credentials**
   - Use your email provider's SMTP settings (Gmail, SendGrid, Mailgun, etc.)
   - Or use a dedicated email service like SendGrid, Mailgun, or AWS SES

2. **Configure in Supabase Dashboard**
   - Go to **Project Settings** → **Auth** → **SMTP Settings**
   - Or go to **Authentication** → **Settings** → **SMTP Settings**
   - Enter your SMTP details:
     - **SMTP Host**: e.g., `smtp.gmail.com` or `smtp.sendgrid.net`
     - **SMTP Port**: Usually `587` (TLS) or `465` (SSL)
     - **SMTP User**: Your SMTP username
     - **SMTP Password**: Your SMTP password
     - **Sender Email**: The email address that will send confirmation emails
     - **Sender Name**: e.g., "Taskorilla"

3. **Test the Configuration**
   - Click **"Send test email"** to verify it works
   - Check your inbox (and spam folder)

4. **Configure Redirect URL**
   - Go to **Authentication** → **URL Configuration**
   - Set **Site URL** to your app URL (e.g., `http://localhost:3000` for dev, `https://yourdomain.com` for production)
   - Add **Redirect URLs**:
     - `http://localhost:3000/auth/callback` (for development)
     - `https://yourdomain.com/auth/callback` (for production)
   - This tells Supabase where to redirect users after email confirmation

5. **Enable Email Confirmation**
   - Go to **Authentication** → **Settings** → **Email Auth**
   - Make sure **"Enable email confirmations"** is **ON**
   - Click **Save**

---

## Option 3: Disable Email Confirmation (Development Only)

For development/testing, you can disable email confirmation:

1. Go to **Authentication** → **Settings** → **Email Auth**
2. Turn **OFF** "Enable email confirmations"
3. Click **Save**

**After disabling:**
- Users can register and log in immediately
- No confirmation emails are sent
- Perfect for development and testing

---

## Common Issues and Solutions

### Issue: Users don't receive confirmation emails

**Possible causes:**
1. **SMTP not configured** - Supabase default service has rate limits
2. **Email in spam folder** - Check spam/junk folder
3. **Email confirmation disabled** - Check Supabase settings
4. **Invalid email address** - Verify the email format

**Solutions:**
- Configure custom SMTP (Option 2 above)
- Check spam folder
- Verify email confirmation is enabled in Supabase
- Try registering with a different email address

### Issue: "Email rate limit exceeded"

**Cause:** Using Supabase's default email service (3 emails/hour limit)

**Solution:** Configure custom SMTP (Option 2) or disable email confirmation for development

### Issue: Emails go to spam

**Solutions:**
- Configure custom SMTP with a verified domain
- Set up SPF/DKIM records for your domain
- Use a reputable email service (SendGrid, Mailgun, etc.)

---

## Recommended SMTP Providers

### For Development:
- **Gmail** (free, but requires app password)
- **Mailtrap** (free tier for testing)

### For Production:
- **SendGrid** (free tier: 100 emails/day)
- **Mailgun** (free tier: 5,000 emails/month)
- **AWS SES** (very cheap, $0.10 per 1,000 emails)
- **Postmark** (paid, excellent deliverability)

---

## Quick Setup Example: Gmail SMTP

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account → Security → App passwords
   - Create a new app password for "Mail"
3. **Configure in Supabase**:
   - SMTP Host: `smtp.gmail.com`
   - SMTP Port: `587`
   - SMTP User: `your-email@gmail.com`
   - SMTP Password: `your-app-password` (16 characters)
   - Sender Email: `your-email@gmail.com`
   - Sender Name: `Taskorilla`

---

## Testing Email Confirmation

1. Register a new user with a valid email
2. Check your email inbox (and spam folder)
3. Click the confirmation link in the email
4. You should be redirected and logged in

If emails aren't arriving:
- Check Supabase Dashboard → **Logs** → **Auth Logs** for errors
- Verify SMTP configuration is correct
- Check spam folder
- Try a different email address

