# How Visitors Can Access Helper Profiles

This document explains all the ways visitors can discover and view helper profiles in Taskorilla.

## Ways to Access Helper Profiles

### 1. Browse Helpers Page (`/helpers`)

**Location:** Main navigation → "Browse Helpers"

**Features:**
- View all helpers in a grid layout
- Search by name, bio, or skills
- Filter by specific skills
- See helper preview cards with:
  - Avatar and name
  - Rating and review count
  - Hourly rate
  - Bio preview
  - Skills tags
  - Location

**How to use:**
1. Click "Browse Helpers" in the navbar
2. Search or filter to find helpers
3. Click on any helper card to view their full profile

---

### 2. From Task Bids

**Location:** Task detail page → Bids section

**How it works:**
- When viewing a task, you can see all bids
- If a bidder is a helper, their name shows a "Helper" badge
- Clicking their name/avatar takes you to their helper profile
- Non-helpers still show the profile modal (as before)

**Example:**
- Task: "Need help moving furniture"
- Bidder: "John Smith" (Helper) ← Click to view profile
- Takes you to: `/helper/john-smith`

---

### 3. From User Profile Modal

**Location:** Clicking on any user's name/avatar

**How it works:**
- When you click a user's name, a modal opens
- If the user is a helper, you'll see a "View Full Helper Profile →" button
- Clicking it takes you to their public helper profile page

---

### 4. Direct Link / Share

**Location:** Helper's profile page → Share button

**How it works:**
- Each helper has a unique profile URL
- Format: `/helper/[slug]` or `/helper/[user-id]`
- Helpers can copy and share their profile link
- QR code available for easy sharing

**Example URLs:**
- `https://taskorilla.com/helper/john-smith`
- `https://taskorilla.com/helper/1cea094b-3582-4358-b84a-2fa8b2abb60a`

---

### 5. From Completed Tasks

**Location:** Helper profile page → Completed Tasks section

**How it works:**
- When viewing a helper profile, you can see their completed tasks
- Each task shows photos and details
- This helps visitors see the helper's work quality

---

## Navigation Structure

```
Navbar
├── Browse Tasks
├── Browse Helpers ← NEW!
├── Post Task
├── Messages
└── Profile
```

---

## Helper Profile Page Features

When visitors view a helper profile (`/helper/[id]`), they see:

1. **Header Section:**
   - Large avatar
   - Name and company
   - Location
   - Rating and hourly rate
   - Share and QR code buttons

2. **Main Content:**
   - Bio/About section
   - Skills (as tags)
   - Services offered (as list)
   - Completed tasks with photos
   - Reviews and ratings

3. **Sidebar:**
   - Badges
   - Stats (tasks completed, rating, member since)
   - Contact button (Send Message)

---

## For Helpers: Making Your Profile Discoverable

1. **Enable Helper Role:**
   - Go to Profile → Edit
   - Enable "Helper" toggle
   - Save (generates your profile slug)

2. **Fill Out Your Profile:**
   - Add a compelling bio
   - List your skills
   - Add services you offer
   - Set your hourly rate (optional)

3. **Complete Tasks:**
   - Complete tasks to build your portfolio
   - Upload completion photos
   - Get good reviews

4. **Share Your Profile:**
   - Copy your profile link
   - Share on social media
   - Use QR code for in-person sharing

---

## Search & Discovery

Visitors can find helpers by:

1. **Browsing All Helpers:**
   - `/helpers` page shows all helpers
   - Filter by skills
   - Search by name/bio

2. **From Tasks:**
   - View bids on tasks
   - Click helper names to see profiles

3. **Direct Links:**
   - Shared profile links
   - QR codes
   - Social media posts

---

## Mobile Experience

- All helper profile features work on mobile
- Responsive grid layout
- Touch-friendly buttons
- QR code scanning supported

---

## Summary

Visitors can access helper profiles through:
1. ✅ **Browse Helpers** page (main navigation)
2. ✅ **Task bids** (click helper names)
3. ✅ **Profile modal** (View Full Helper Profile button)
4. ✅ **Direct links** (shared URLs)
5. ✅ **QR codes** (scan to open profile)

All helper profiles are **public** - no login required to view them!




