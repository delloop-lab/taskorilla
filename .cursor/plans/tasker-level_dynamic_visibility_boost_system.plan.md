---
name: Tasker-Level Dynamic Visibility Boost System
overview: Implement a comprehensive task visibility boost system that allows admins to set global visibility days and per-Tasker extra visibility days, with automatic calculation and real-time updates for all tasks.
todos: []
---

# Tasker-Level Dynamic Visibility Boost System

## Overview

Implement a dynamic visibility system where tasks have a calculated `visible_until` date based on:

- Global standard visibility days (applies to all tasks)
- Per-Tasker extra visibility days (optional boost)
- Automatic recalculation when settings change

## Database Schema Changes

### 1. Add to `platform_settings` table

**File:** `supabase/add_task_visibility_settings.sql`

```sql
-- Add standard task visibility days to platform_settings
INSERT INTO platform_settings (key, value, description) VALUES
  ('standard_task_visibility_days', '30', 'Default number of days tasks remain visible (applies to all tasks)')
ON CONFLICT (key) DO NOTHING;
```

### 2. Add fields to `profiles` table

**File:** `supabase/add_tasker_visibility_boost.sql`

```sql
-- Add extra visibility fields to profiles table for Taskers
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS extra_visibility_days INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extra_visibility_active BOOLEAN DEFAULT false;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_extra_visibility_active 
  ON profiles(extra_visibility_active) 
  WHERE extra_visibility_active = true;

-- Add comments
COMMENT ON COLUMN profiles.extra_visibility_days IS 'Additional visibility days for tasks posted by this Tasker';
COMMENT ON COLUMN profiles.extra_visibility_active IS 'Whether extra visibility days are currently active for this Tasker';
```

### 3. Add `visible_until` field to `tasks` table

**File:** `supabase/add_task_visibility_until.sql`

```sql
-- Add visible_until timestamp to tasks table
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS visible_until TIMESTAMP WITH TIME ZONE;

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_tasks_visible_until 
  ON tasks(visible_until) 
  WHERE status = 'open';

-- Add comment
COMMENT ON COLUMN tasks.visible_until IS 'Calculated date when task visibility expires (created_at + standard_days + extra_days if active)';
```

### 4. Create function to calculate and update visible_until

**File:** `supabase/calculate_task_visibility_function.sql`

```sql
-- Function to calculate visible_until for a task
CREATE OR REPLACE FUNCTION calculate_task_visible_until(task_id_param UUID)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  task_created_at TIMESTAMP WITH TIME ZONE;
  task_created_by UUID;
  standard_days INTEGER;
  extra_days INTEGER;
  extra_active BOOLEAN;
  calculated_until TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get task creation date and creator
  SELECT created_at, created_by INTO task_created_at, task_created_by
  FROM tasks
  WHERE id = task_id_param;
  
  IF task_created_at IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get standard visibility days from platform_settings
  SELECT value::INTEGER INTO standard_days
  FROM platform_settings
  WHERE key = 'standard_task_visibility_days'
  LIMIT 1;
  
  -- Default to 30 days if not set
  IF standard_days IS NULL THEN
    standard_days := 30;
  END IF;
  
  -- Get extra visibility settings from tasker's profile
  SELECT extra_visibility_days, extra_visibility_active 
  INTO extra_days, extra_active
  FROM profiles
  WHERE id = task_created_by;
  
  -- Default to 0 if not set
  IF extra_days IS NULL THEN
    extra_days := 0;
  END IF;
  IF extra_active IS NULL THEN
    extra_active := false;
  END IF;
  
  -- Calculate visible_until: created_at + standard_days + (extra_days if active)
  calculated_until := task_created_at + 
    (standard_days || ' days')::INTERVAL + 
    CASE WHEN extra_active THEN (extra_days || ' days')::INTERVAL ELSE '0 days'::INTERVAL END;
  
  RETURN calculated_until;
END;
$$;

-- Function to update visible_until for all tasks by a Tasker
CREATE OR REPLACE FUNCTION update_tasker_tasks_visibility(tasker_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE tasks
  SET visible_until = calculate_task_visible_until(id)
  WHERE created_by = tasker_id_param
    AND status = 'open';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Function to update visible_until for all open tasks (when global setting changes)
CREATE OR REPLACE FUNCTION update_all_tasks_visibility()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE tasks
  SET visible_until = calculate_task_visible_until(id)
  WHERE status = 'open';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;
```

### 5. Create trigger to auto-calculate visible_until on task creation/update

**File:** `supabase/add_task_visibility_trigger.sql`

```sql
-- Trigger function to calculate visible_until when task is created or updated
CREATE OR REPLACE FUNCTION set_task_visible_until()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only recalculate if task is being created or if created_at changed
  -- (This prevents unnecessary recalculations on every update)
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.created_at IS DISTINCT FROM NEW.created_at) THEN
    NEW.visible_until := calculate_task_visible_until(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for INSERT
DROP TRIGGER IF EXISTS trigger_set_task_visible_until_insert ON tasks;
CREATE TRIGGER trigger_set_task_visible_until_insert
  BEFORE INSERT ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_task_visible_until();

-- Create trigger for UPDATE (handles case where created_at might change, though rare)
-- Note: This is optional since bulk updates are handled by functions, but provides safety
DROP TRIGGER IF EXISTS trigger_set_task_visible_until_update ON tasks;
CREATE TRIGGER trigger_set_task_visible_until_update
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  WHEN (OLD.created_at IS DISTINCT FROM NEW.created_at)
  EXECUTE FUNCTION set_task_visible_until();

-- Note: For existing tasks, we'll need to backfill via migration
```

### 6. Backfill existing tasks

**File:** `supabase/backfill_task_visibility.sql`

```sql
-- Backfill visible_until for all existing open tasks
UPDATE tasks
SET visible_until = calculate_task_visible_until(id)
WHERE status = 'open' AND visible_until IS NULL;
```

## Backend API Changes

### 1. API endpoint to get/update global visibility setting

**File:** `app/api/admin/task-visibility-settings/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// GET: Fetch global visibility setting
export async function GET(request: NextRequest) {
  // Implementation to fetch 'standard_task_visibility_days' from platform_settings
}

// POST: Update global visibility setting
export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient(request)
  
  // Verify admin access
  // ... admin check code ...
  
  const body = await request.json()
  const { days } = body
  
  // Validation: days must be a positive integer
  if (!Number.isInteger(days) || days < 1) {
    return NextResponse.json(
      { error: 'Visibility days must be a positive integer (1 or greater)' },
      { status: 400 }
    )
  }
  
  // Update platform_settings
  // Call update_all_tasks_visibility() function
  // Return updated count
}
```

### 2. API endpoint to get/update Tasker visibility settings

**File:** `app/api/admin/tasker-visibility/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// GET: Fetch Tasker visibility settings
export async function GET(request: NextRequest) {
  // Implementation to fetch extra_visibility_days and extra_visibility_active for a Tasker
}

// POST: Update Tasker visibility settings
export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient(request)
  
  // Verify admin access
  // ... admin check code ...
  
  const body = await request.json()
  const { taskerId, extraVisibilityDays, extraVisibilityActive } = body
  
  // Validation: extraVisibilityDays must be non-negative integer
  if (extraVisibilityDays !== undefined) {
    if (!Number.isInteger(extraVisibilityDays) || extraVisibilityDays < 0) {
      return NextResponse.json(
        { error: 'Extra visibility days must be a non-negative integer (0 or greater)' },
        { status: 400 }
      )
    }
  }
  
  // Validation: extraVisibilityActive must be boolean
  if (extraVisibilityActive !== undefined && typeof extraVisibilityActive !== 'boolean') {
    return NextResponse.json(
      { error: 'Extra visibility active must be a boolean' },
      { status: 400 }
    )
  }
  
  // Update profiles table
  // Call update_tasker_tasks_visibility(taskerId) function
  // Return updated count and success message
}
```

## Frontend Changes

### 1. Update task query logic to filter by visible_until

**File:** `app/tasks/page.tsx`

Update the `loadTasks` function to filter out tasks where `visible_until < NOW()`:

```typescript
// In loadTasks function, add filter:
if (activeFilter === 'open') {
  query = query
    .eq('status', 'open')
    .gte('visible_until', new Date().toISOString()) // Only show tasks still visible
}
```

### 2. Add admin UI for global visibility setting

**File:** `app/admin/page.tsx`

Add a new section in the admin panel (in the 'settings' tab or new 'visibility' tab):

```typescript
// Add state
const [standardVisibilityDays, setStandardVisibilityDays] = useState<number>(30)
const [loadingVisibility, setLoadingVisibility] = useState(false)

// Add UI component to display and edit standard_task_visibility_days
// Include save button that calls API endpoint
```

### 3. Add admin UI for per-Tasker visibility settings

**File:** `app/admin/page.tsx`

In the Users tab, add columns/fields for each Tasker:

- Display `extra_visibility_days` (editable number input with validation: >= 0)
- Display `extra_visibility_active` (toggle switch)
- Save button that calls API endpoint
- **Show success notification**: "Tasks updated: X" when save succeeds, displaying the count returned from API
- Show error message if validation fails or API returns error

## Task Creation Updates

### 1. Update task creation to ensure visible_until is set

**Files:**

- `app/tasks/new/NewTaskClient.tsx`
- `components/SurveyJSTrialForm.tsx`

The trigger will handle this automatically, but ensure the task insert includes all required fields.

## TypeScript Type Updates

### 1. Update types

**File:** `lib/types.ts`

```typescript
// Add to Task interface
interface Task {
  // ... existing fields
  visible_until?: string | null
}

// Add to User/Profile interface
interface User {
  // ... existing fields
  extra_visibility_days?: number
  extra_visibility_active?: boolean
}
```

## Implementation Order

1. **Database migrations** (run in Supabase SQL Editor):

   - `add_task_visibility_settings.sql`
   - `add_tasker_visibility_boost.sql`
   - `add_task_visibility_until.sql`
   - `calculate_task_visibility_function.sql`
   - `add_task_visibility_trigger.sql`
   - `backfill_task_visibility.sql`

2. **Backend API endpoints**:

   - Create `app/api/admin/task-visibility-settings/route.ts`
   - Create `app/api/admin/tasker-visibility/route.ts`

3. **Frontend updates**:

   - Update `app/tasks/page.tsx` to filter by `visible_until`
   - Update `app/admin/page.tsx` to add visibility management UI
   - Update `lib/types.ts` with new fields

4. **Testing**:

   - Test task creation calculates `visible_until` correctly
   - Test admin can update global setting
   - Test admin can update per-Tasker settings
   - Test existing tasks update when settings change
   - Test task filtering excludes expired tasks

## Key Features

✅ **Automatic Calculation**: `visible_until` calculated on task creation via trigger

✅ **Real-time Updates**: Changing settings immediately updates all affected tasks

✅ **Per-Tasker Control**: Each Tasker can have different extra visibility days

✅ **Toggle On/Off**: Extra visibility can be enabled/disabled per Tasker

✅ **Backward Compatible**: Existing tasks get backfilled with calculated dates

✅ **Performance**: Indexed `visible_until` field for fast filtering

✅ **Input Validation**: API endpoints validate extra_visibility_days >= 0

✅ **UI Feedback**: Admin sees "Tasks updated: X" notification when changes are applied

✅ **Null Safety**: PL/pgSQL functions handle null values gracefully

✅ **Update Trigger**: BEFORE UPDATE trigger handles edge cases (though bulk updates use functions)