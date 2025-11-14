# Taskorilla

A task marketplace application similar to Airtasker where users can post jobs and others can bid on them.

## Features

- User registration and authentication
- Task creation and management
- Browse available tasks
- Bid on tasks
- Basic messaging between users
- User profiles

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Authentication & Database)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up Supabase:
   - Create a new project at [supabase.com](https://supabase.com)
   - Copy your project URL and anon key
   - Create a `.env.local` file in the root directory:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. Set up the database:
   - Run the SQL scripts in `supabase/schema.sql` in your Supabase SQL editor

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Database Schema

The app uses the following tables:
- `profiles` - User profile information
- `tasks` - Task listings
- `bids` - Bids on tasks
- `conversations` - Message conversations
- `messages` - Individual messages

See `supabase/schema.sql` for the complete schema.



