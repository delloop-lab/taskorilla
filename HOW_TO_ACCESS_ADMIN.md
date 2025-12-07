# How to Access the Admin Dashboard

Yes, there is a full admin dashboard! Here's how to access it and set up admin users.

## Admin Dashboard Features

The admin dashboard (`/admin`) includes:

1. **Users Management**
   - View all users
   - Promote users to admin
   - Delete users
   - Send profile completion emails

2. **Tasks Management**
   - View all tasks
   - See task status, budgets, categories
   - Monitor task activity

3. **Statistics**
   - User statistics
   - Task statistics
   - Bid statistics
   - Review statistics
   - Message statistics

4. **Traffic Analytics**
   - Page visit statistics
   - Daily traffic charts
   - Hits per day visualization

5. **Email Management**
   - Send custom emails to users
   - View email logs
   - Track email delivery status

6. **Email Logs**
   - View all sent emails
   - Check email status
   - See error messages

---

## How to Make a User an Admin

### Option 1: Using Supabase Dashboard (Easiest)

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click **SQL Editor** in the left sidebar
   - Click **New query**

3. **Run this SQL to make a user superadmin**:
   ```sql
   -- Replace 'user-email@example.com' with the actual user's email
   UPDATE profiles
   SET role = 'superadmin'
   WHERE email = 'user-email@example.com';
   ```

4. **Or make a user admin** (less privileges):
   ```sql
   UPDATE profiles
   SET role = 'admin'
   WHERE email = 'user-email@example.com';
   ```

5. **Click "Run"** to execute the query

---

### Option 2: Using User ID

If you know the user's ID:

```sql
-- Replace 'user-id-here' with the actual user UUID
UPDATE profiles
SET role = 'superadmin'
WHERE id = 'user-id-here';
```

To find a user's ID:
1. Go to **Authentication** → **Users** in Supabase
2. Find the user
3. Copy their User UID

---

## Role Levels

There are three role levels:

1. **`user`** (default)
   - Regular user
   - Can create tasks, place bids, send messages
   - Cannot access admin dashboard

2. **`admin`**
   - Can access admin dashboard
   - Can manage users (but cannot delete admins/superadmins)
   - Can view email logs
   - Cannot delete other admins

3. **`superadmin`**
   - Full access to admin dashboard
   - Can manage all users (including admins)
   - Can delete any user (except themselves)
   - Can delete email logs
   - Can promote/demote users

---

## Accessing the Admin Dashboard

1. **Make sure you're logged in** with a user that has `superadmin` role

2. **Navigate to**: `http://localhost:3000/admin` (or your production URL)

3. **If you don't have superadmin access**, you'll be redirected to the home page

---

## Admin Dashboard URL

- **Development**: `http://localhost:3000/admin`
- **Production**: `https://yourdomain.com/admin`

---

## Quick Setup Script

Run this in Supabase SQL Editor to set up your first superadmin:

```sql
-- First, find your user ID from Authentication → Users
-- Then replace 'YOUR-USER-ID-HERE' with your actual user ID

UPDATE profiles
SET role = 'superadmin'
WHERE id = 'YOUR-USER-ID-HERE';
```

Or by email:

```sql
-- Replace with your email
UPDATE profiles
SET role = 'superadmin'
WHERE email = 'your-email@example.com';
```

---

## Admin Dashboard Tabs

Once you access `/admin`, you'll see these tabs:

1. **Users** - Manage all users, promote/demote, delete
2. **Tasks** - View all tasks and their details
3. **Stats** - View statistics and charts
4. **Email** - Send custom emails to users
5. **Traffic** - View page visit analytics
6. **Email Logs** - View all sent emails and their status

---

## Troubleshooting

### Issue: "Access Denied" or redirected to home page

**Solution**: Your user doesn't have `superadmin` role. Follow the steps above to set your role.

### Issue: Can't update user role in Supabase

**Solution**: Make sure you're running the SQL query in the Supabase SQL Editor, not through the app.

### Issue: Admin dashboard shows "Loading..." forever

**Solution**: 
- Check browser console for errors
- Verify your user has `superadmin` role
- Check Supabase connection

---

## Security Notes

- **Only superadmins** can access `/admin`
- **Superadmins** can delete any user (except themselves)
- **Admins** cannot delete other admins or superadmins
- All admin actions are logged in the database
- Email logs track all sent emails

---

## Making Multiple Admins

To make multiple users admins, run:

```sql
-- Make multiple users superadmins by email
UPDATE profiles
SET role = 'superadmin'
WHERE email IN (
  'admin1@example.com',
  'admin2@example.com',
  'admin3@example.com'
);
```

Or by user IDs:

```sql
UPDATE profiles
SET role = 'superadmin'
WHERE id IN (
  'user-id-1',
  'user-id-2',
  'user-id-3'
);
```

---

## Checking Current User Role

To check what role your current user has:

```sql
-- Replace with your email
SELECT id, email, role, full_name
FROM profiles
WHERE email = 'your-email@example.com';
```

Or check all admins:

```sql
SELECT id, email, role, full_name, created_at
FROM profiles
WHERE role IN ('admin', 'superadmin')
ORDER BY created_at DESC;
```

---

That's it! Once you set a user's role to `superadmin`, they can access `/admin` and manage the entire platform.







