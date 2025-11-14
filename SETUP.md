# Task Marketplace Setup Guide

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for your project to be fully provisioned
3. Go to Project Settings > API
4. Copy your:
   - Project URL
   - `anon` public key

## Step 3: Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Step 4: Set Up Database Schema

1. In your Supabase dashboard, go to SQL Editor
2. Open the file `supabase/schema.sql` from this project
3. Copy and paste the entire SQL script into the SQL Editor
4. Click "Run" to execute the script

This will create:
- `profiles` table for user profiles
- `tasks` table for task listings
- `bids` table for bids on tasks
- `conversations` table for message threads
- `messages` table for individual messages
- Row Level Security (RLS) policies
- Triggers for automatic profile creation and timestamps

## Step 5: Configure Storage Bucket

1. In Supabase dashboard, go to **Storage**
2. Click **Create bucket**, name it `avatars`
3. Mark the bucket as **public**
4. (Optional) Set a file size limit, e.g. 5 MB

This bucket stores user profile photos.

## Step 6: Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

### Authentication
- User registration with email/password
- User login
- Automatic profile creation on signup
- Protected routes

### Task Management
- Create tasks with title, description, budget, category, location, and due date
- Browse all tasks or filter by status
- View task details
- Manage your own tasks

### Bidding System
- Submit bids on open tasks
- View all bids on a task
- Task creators can accept/reject bids
- Automatic status updates when bids are accepted

### Messaging
- Start conversations from task pages
- Real-time messaging between users
- View all conversations
- Message history

### User Profile
- View and edit your profile
- Upload and remove profile avatars
- See account creation date

## Troubleshooting

### Database Connection Issues
- Verify your `.env.local` file has the correct Supabase URL and key
- Check that your Supabase project is active

### Authentication Not Working
- Ensure the `handle_new_user` trigger was created in the database
- Check that RLS policies are enabled on all tables

### Messages Not Appearing
- Verify the realtime subscription is working
- Check browser console for errors
- Ensure you're logged in as the correct user

## Next Steps

Consider adding:
- Email notifications
- File uploads for task attachments
- Payment integration
- Task completion confirmation
- User ratings and reviews
- Search and filtering
- Task categories dropdown
- Image uploads for profiles


