-- IMPORTANT: Supabase stores passwords as hashed values in auth.users
-- You CANNOT directly change passwords with SQL because:
-- 1. Passwords are hashed using bcrypt
-- 2. The auth schema is managed by Supabase's auth system
-- 3. Direct SQL manipulation may break authentication

-- ============================================
-- OPTION 1: Trigger Password Reset Email (Recommended)
-- ============================================
-- Use Supabase Admin API or Dashboard to send password reset email
-- This is the safest and recommended approach

-- In Supabase Dashboard:
-- 1. Go to Authentication > Users
-- 2. Find the user
-- 3. Click "..." menu > "Send password reset email"

-- ============================================
-- OPTION 2: Use Supabase Admin API (Programmatic)
-- ============================================
-- Use the Supabase Admin API from your backend:
-- 
-- POST https://your-project.supabase.co/auth/v1/admin/users/{user_id}
-- Headers: {
--   "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY",
--   "Content-Type": "application/json"
-- }
-- Body: {
--   "action": "send_password_reset_email"
-- }

-- ============================================
-- OPTION 3: Direct SQL (NOT RECOMMENDED - Use with caution)
-- ============================================
-- WARNING: This may not work and could break authentication
-- Only use if you understand the risks

-- To manually trigger a password reset flow, you can update the recovery token:
-- UPDATE auth.users 
-- SET recovery_sent_at = NOW(),
--     recovery_token = encode(gen_random_bytes(32), 'hex')
-- WHERE email = 'user@example.com';

-- However, this won't actually send an email - you'd need to handle that separately

-- ============================================
-- OPTION 4: Reset via Supabase Client SDK (From your app)
-- ============================================
-- In your application code:
-- 
-- import { supabase } from '@/lib/supabase'
-- 
-- const { error } = await supabase.auth.resetPasswordForEmail('user@example.com', {
--   redirectTo: 'https://your-app.com/reset-password'
-- })

-- ============================================
-- RECOMMENDED APPROACH
-- ============================================
-- The best way is to use Supabase Dashboard or Admin API to send a password reset email.
-- The user will receive an email with a secure link to reset their password.
-- This is secure, follows best practices, and doesn't require direct database access.
