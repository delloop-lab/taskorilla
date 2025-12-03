# Helper Badge System

This document describes the automatic badge awarding system for helpers in Taskorilla.

## Overview

Helpers can earn badges automatically based on their performance and activity. Badges are calculated and updated automatically when relevant data changes.

## Available Badges

### 1. **Fast Responder** ⚡
**Criteria:** Average response time to messages is less than 2 hours

**How it works:**
- Calculates time between receiving a message and sending a reply
- Averages all response times
- Awarded if average < 2 hours

### 2. **Top Helper** ⭐
**Criteria:** 
- Average rating of 4.5+ stars
- 10+ completed tasks

**How it works:**
- Checks average rating from all reviews
- Counts completed tasks where helper was assigned
- Both conditions must be met

### 3. **Expert Skills** 🎯
**Criteria:** Has 5+ skills listed in their profile

**How it works:**
- Counts skills in the `skills` array field
- Awarded when helper has 5 or more skills

## Database Implementation

### Migration Script: `supabase/add_helper_badges_system.sql`

**Functions Created:**

1. **`calculate_helper_badges(helper_user_id UUID)`**
   - Calculates which badges a helper has earned
   - Returns array of badge names
   - Called automatically by triggers

2. **`update_helper_badges(helper_user_id UUID)`**
   - Updates badges for a specific helper
   - Can be called manually or via API

3. **`update_all_helper_badges()`**
   - Batch updates badges for all helpers
   - Returns count of helpers updated
   - Useful for initial setup or periodic recalculation

**Triggers Created:**

- `update_badges_on_task_completion` - Updates badges when task status changes to completed
- `update_badges_on_review` - Updates badges when a new review is added
- `update_badges_on_message` - Updates badges when messages are sent (for response time)
- `update_badges_on_profile_skills` - Updates badges when skills are updated

## API Endpoint

### POST `/api/recalculate-badges`

Recalculates badges for helpers.

**Request Body:**
```json
{
  "helperId": "optional-user-id" // If provided, only updates that helper. If omitted, updates all helpers.
}
```

**Response:**
```json
{
  "success": true,
  "message": "Badges recalculated for 15 helpers"
}
```

**Usage:**
- Call without `helperId` to recalculate all helpers
- Call with `helperId` to recalculate a specific helper
- Useful for manual updates or fixing badge calculations

## Admin Badge Management

Admins can manually assign badges to helpers through the Admin Dashboard.

### How to Assign Badges

1. Go to Admin Dashboard → Users tab
2. Find the helper you want to manage
3. Click "Manage Badges" button (only visible for helpers)
4. Check/uncheck badges to assign/remove them
5. Click "Save Badges" to apply changes

### Manual vs Automatic Badges

- **Manual badges**: Assigned by admins through the dashboard
- **Automatic badges**: Calculated by the system based on performance
- **Note**: Manual badge assignment will replace automatic badges. To restore automatic badges, use the "Recalculate Badges" API endpoint.

### Badge Management Features

- Visual badge selection with images
- See current badges for each helper in the users table
- Quick toggle interface for easy badge assignment
- Badges are saved immediately and visible on helper profiles

## Badge Display

### Helper Profile Page (`/helper/[id]`)
- Badges displayed in sidebar
- Each badge shows custom image:
  - Fast Responder → `/images/fast.png`
  - Top Helper → `/images/tophelper.png`
  - Expert Skills → `/images/skills.png`

### Browse Helpers Page (`/helpers`)
- Badges shown as small images below skills
- Images visible in helper cards
- Helps identify top performers quickly

### Admin Dashboard (`/admin`)
- Badges displayed in users table for helpers
- "Manage Badges" button for each helper
- Visual badge management modal

## How Badges Are Awarded

Badges are automatically recalculated when:

1. **Task Completion** - When a task status changes to "completed"
2. **New Review** - When a review is submitted for a helper
3. **Message Sent** - When a message is sent (affects response time calculation)
4. **Skills Updated** - When helper updates their skills list

## Initial Setup

After running the migration, calculate badges for existing helpers:

```sql
-- In Supabase SQL Editor
SELECT update_all_helper_badges();
```

Or use the API endpoint:
```bash
POST /api/recalculate-badges
```

## Badge Criteria Summary

| Badge | Criteria | Threshold |
|-------|----------|-----------|
| Fast Responder | Average response time | < 2 hours |
| Top Helper | Rating + Completed tasks | 4.5+ stars AND 10+ tasks |
| Expert Skills | Number of skills | 5+ skills |

## Customization

To adjust badge criteria, edit the thresholds in `calculate_helper_badges()` function:

```sql
-- Edit these values in the function:
response_time_threshold NUMERIC := 2.0; -- hours
top_helper_rating_threshold NUMERIC := 4.5; -- stars
top_helper_tasks_threshold INTEGER := 10; -- tasks
expert_skills_threshold INTEGER := 5; -- skills
```

## Future Enhancements

Potential additional badges:
- **Verified** - Manual admin badge
- **Early Bird** - Completes tasks before deadline
- **High Earner** - Earns above average per task
- **Community Favorite** - Most reviews
- **Rising Star** - Fast growth in completed tasks

