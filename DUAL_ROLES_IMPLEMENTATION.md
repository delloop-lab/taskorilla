# Dual Roles Implementation - Tasker & Helper

This document describes the implementation of dual role support for Taskorilla users.

## Overview

Users can now have two roles:
- **Tasker**: Can post tasks and hire helpers
- **Helper**: Can browse tasks and submit bids

Users can enable both roles simultaneously, allowing them to both post tasks and bid on tasks.

## Database Changes

### Migration Script: `supabase/add_dual_roles.sql`

1. **Added Fields**:
   - `is_tasker` (BOOLEAN, default: true, NOT NULL)
   - `is_helper` (BOOLEAN, default: false, NOT NULL)

2. **Default Values for Existing Users**:
   - All existing users are set to `is_tasker = true` and `is_helper = false`
   - This ensures backward compatibility

3. **New User Defaults**:
   - Updated `handle_new_user()` function to set defaults:
     - `is_tasker = true`
     - `is_helper = false`

4. **Indexes**:
   - Created indexes for faster role-based queries

## TypeScript Types

Updated `lib/types.ts`:
- Added `is_tasker?: boolean` to `User` interface
- Added `is_helper?: boolean` to `User` interface

## Profile Page Updates

### New Features in `app/profile/page.tsx`:

1. **State Management**:
   - Added `isTasker` and `isHelper` state variables
   - Loaded from profile data on page load
   - Saved when profile is updated

2. **UI Components**:
   - Added "Account Roles" section with toggle switches
   - Visual indicators showing which roles are active
   - Descriptions for each role
   - Warning message if no roles are enabled

3. **Validation**:
   - Ensures at least one role is enabled before saving
   - Disables save button if no roles are selected
   - Shows error message if user tries to disable all roles

## How to Apply

### Step 1: Run the Migration

1. Go to Supabase Dashboard → SQL Editor
2. Open `supabase/add_dual_roles.sql`
3. Copy and paste the entire script
4. Click "Run"

### Step 2: Verify

1. Check that existing users have `is_tasker = true` and `is_helper = false`
2. Register a new user and verify defaults are set correctly
3. Go to Profile page and test role toggles

## Usage

### For Users:

1. Go to Profile page (`/profile`)
2. Click "Edit"
3. Scroll to "Account Roles" section
4. Toggle roles as needed:
   - **Tasker**: Enable to post tasks
   - **Helper**: Enable to bid on tasks
5. Click "Save Changes"

### For Developers:

Check user roles before allowing actions:

```typescript
// Check if user can post tasks
if (user.is_tasker) {
  // Allow task creation
}

// Check if user can bid on tasks
if (user.is_helper) {
  // Allow bidding
}
```

## Backward Compatibility

- All existing users default to `is_tasker = true`
- Existing functionality remains unchanged
- New users start as taskers by default
- Users can enable helper role in settings

## Future Enhancements

Consider adding:
- Role-based filtering in task browsing
- Different UI for taskers vs helpers
- Role-specific dashboards
- Analytics based on roles







