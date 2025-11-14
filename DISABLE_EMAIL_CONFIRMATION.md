# How to Disable Email Confirmation in Supabase

For development purposes, you can disable email confirmation so users can log in immediately after registration.

## Steps:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/pcvfemhakrqzeiegzusn

2. Navigate to **Authentication** → **Settings** (in the left sidebar)

3. Scroll down to the **Email Auth** section

4. Find the toggle for **"Enable email confirmations"**

5. **Turn it OFF** (disable it)

6. Click **Save** at the bottom of the page

## After disabling:

- Users can register and immediately log in without email confirmation
- No verification emails will be sent
- This is perfect for development and testing

## For Production:

When you're ready to deploy, you should:
- Re-enable email confirmation for security
- Set up proper email templates
- Configure your email provider (SMTP settings)

## Alternative: Confirm Email Manually

If you want to keep email confirmation enabled but need to test with a specific user:

1. Go to **Authentication** → **Users** in Supabase dashboard
2. Find the user
3. Click on the user
4. Look for the **"Confirm email"** button or toggle
5. Manually confirm the email

This way you can test the full flow while keeping security enabled.


