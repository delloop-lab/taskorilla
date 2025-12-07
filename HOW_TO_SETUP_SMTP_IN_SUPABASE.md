# How to Set Up SMTP in Supabase Dashboard

Follow these steps to configure your SMTP settings in Supabase so users receive confirmation emails.

## Step-by-Step Instructions

### 1. Access SMTP Settings

1. Go to your **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Project Settings** (gear icon in the left sidebar)
4. Click on **Auth** in the settings menu
5. Scroll down to find **SMTP Settings** section

**Alternative path:**
- Go to **Authentication** → **Settings** → Scroll down to **SMTP Settings**

---

### 2. Enter Your SMTP Credentials

Fill in the following fields with your SMTP provider details:

#### Required Fields:

- **SMTP Host**: Your SMTP server address
  - Gmail: `smtp.gmail.com`
  - SendGrid: `smtp.sendgrid.net`
  - Mailgun: `smtp.mailgun.org`
  - AWS SES: `email-smtp.us-east-1.amazonaws.com` (varies by region)
  - Custom: Your provider's SMTP host

- **SMTP Port**: Usually `587` (TLS) or `465` (SSL)
  - Port `587` = TLS (most common)
  - Port `465` = SSL
  - Port `25` = Usually blocked by ISPs

- **SMTP User**: Your SMTP username/email
  - Gmail: Your full Gmail address (e.g., `yourname@gmail.com`)
  - SendGrid: Usually `apikey`
  - Mailgun: Your Mailgun SMTP username
  - Custom: Your SMTP provider's username

- **SMTP Password**: Your SMTP password
  - Gmail: App password (not your regular password - see below)
  - SendGrid: Your SendGrid API key
  - Mailgun: Your Mailgun SMTP password
  - Custom: Your SMTP provider's password

- **Sender Email**: The email address that will send confirmation emails
  - Must match your SMTP provider's allowed sender
  - Example: `noreply@yourdomain.com` or `yourname@gmail.com`

- **Sender Name**: Display name for emails
  - Example: `Taskorilla` or `Your App Name`

---

### 3. Common SMTP Provider Examples

#### Gmail SMTP Setup

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-character app password
3. **Enter in Supabase**:
   - SMTP Host: `smtp.gmail.com`
   - SMTP Port: `587`
   - SMTP User: `your-email@gmail.com`
   - SMTP Password: `your-16-char-app-password`
   - Sender Email: `your-email@gmail.com`
   - Sender Name: `Taskorilla`

#### SendGrid SMTP Setup

1. **Get API Key**:
   - Go to SendGrid Dashboard → Settings → API Keys
   - Create a new API key with "Mail Send" permissions
2. **Enter in Supabase**:
   - SMTP Host: `smtp.sendgrid.net`
   - SMTP Port: `587`
   - SMTP User: `apikey`
   - SMTP Password: `your-sendgrid-api-key`
   - Sender Email: `noreply@yourdomain.com` (must be verified in SendGrid)
   - Sender Name: `Taskorilla`

#### Mailgun SMTP Setup

1. **Get SMTP Credentials**:
   - Go to Mailgun Dashboard → Sending → Domain Settings
   - Find your SMTP credentials
2. **Enter in Supabase**:
   - SMTP Host: `smtp.mailgun.org`
   - SMTP Port: `587`
   - SMTP User: `postmaster@yourdomain.mailgun.org`
   - SMTP Password: Your Mailgun SMTP password
   - Sender Email: `noreply@yourdomain.com`
   - Sender Name: `Taskorilla`

---

### 4. Test Your Configuration

After entering your SMTP details:

1. **Click "Send test email"** button (if available)
2. **Enter a test email address** (your own email)
3. **Check your inbox** (and spam folder) for the test email
4. **Verify**:
   - Email arrives successfully
   - Sender name/email looks correct
   - No errors in the test

---

### 5. Enable Email Confirmation

1. Go to **Authentication** → **Settings**
2. Scroll to **Email Auth** section
3. Make sure **"Enable email confirmations"** is **ON** (toggle enabled)
4. Click **Save** at the bottom

---

### 6. Configure Redirect URLs

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL**:
   - Development: `http://localhost:3000`
   - Production: `https://yourdomain.com`
3. Add **Redirect URLs**:
   - `http://localhost:3000/auth/callback` (development)
   - `https://yourdomain.com/auth/callback` (production)
4. Click **Save**

---

## Troubleshooting

### Issue: "SMTP connection failed"

**Solutions:**
- Verify SMTP host and port are correct
- Check if your firewall/ISP blocks SMTP ports
- Try port `465` with SSL instead of `587` with TLS
- Verify credentials are correct (no extra spaces)

### Issue: "Authentication failed"

**Solutions:**
- Double-check username and password
- For Gmail: Make sure you're using an App Password, not your regular password
- For SendGrid: Verify API key has "Mail Send" permissions
- Check if your SMTP provider requires IP whitelisting

### Issue: "Sender email not verified"

**Solutions:**
- Verify the sender email in your SMTP provider's dashboard
- For SendGrid: Verify domain or single sender
- For Mailgun: Verify domain in Mailgun dashboard
- For Gmail: Use your actual Gmail address

### Issue: Emails go to spam

**Solutions:**
- Use a verified domain (not free email providers)
- Set up SPF/DKIM records for your domain
- Use a reputable SMTP provider (SendGrid, Mailgun, AWS SES)
- Avoid spam trigger words in email content

### Issue: Test email works but confirmation emails don't arrive

**Solutions:**
- Check Supabase logs: **Logs** → **Auth Logs**
- Verify email confirmation is enabled in Auth settings
- Check spam folder
- Verify redirect URLs are configured correctly

---

## Security Best Practices

1. **Use App Passwords**: Never use your main email password
2. **Restrict API Keys**: Give minimal required permissions
3. **Use Environment Variables**: Don't hardcode credentials
4. **Monitor Usage**: Check your SMTP provider's usage dashboard
5. **Set Rate Limits**: Configure rate limits in Supabase to prevent abuse

---

## Quick Checklist

- [ ] SMTP Host entered correctly
- [ ] SMTP Port is correct (587 or 465)
- [ ] SMTP User is correct
- [ ] SMTP Password is correct (no extra spaces)
- [ ] Sender Email is verified with your SMTP provider
- [ ] Sender Name is set
- [ ] Test email sent successfully
- [ ] Email confirmation is enabled in Auth settings
- [ ] Redirect URLs are configured
- [ ] Site URL is set correctly

---

## Need Help?

If you're still having issues:

1. Check Supabase Dashboard → **Logs** → **Auth Logs** for error messages
2. Verify your SMTP provider's documentation
3. Test SMTP credentials using a tool like `telnet` or an email client
4. Check your SMTP provider's status page for outages

Once configured, users will receive confirmation emails when they register!







