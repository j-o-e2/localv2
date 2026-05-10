# Work Images Upload Feature

## Overview
Added the ability for both clients and workers (service providers) to upload images/pictures of their work as supporting evidence or portfolio.

## Files Created

### 1. Database Setup
- **[sql/CREATE_WORK_IMAGES.sql](sql/CREATE_WORK_IMAGES.sql)** - SQL script to create the database table and storage bucket

### 2. API Route
- **[app/api/work-images/route.ts](app/api/work-images/route.ts)** - Handles:
  - `POST` - Upload new work images
  - `GET` - Fetch work images for a user
  - `DELETE` - Remove work images

### 3. Components
- **[components/WorkImageUploader.tsx](components/WorkImageUploader.tsx)** - Upload interface with:
  - File selection with drag & drop
  - Image preview before upload
  - Title and description fields
  - Gallery view of uploaded images
  - Delete functionality

- **[components/WorkImageGallery.tsx](components/WorkImageGallery.tsx)** - Read-only gallery for viewing:
  - Grid display of work images
  - Lightbox modal for full-size viewing
  - Shows title and description

### 4. Integration
- **[app/profile/page.tsx](app/profile/page.tsx)** - Added WorkImageUploader to user's own profile
- **[app/profile/[id]/page.tsx](app/profile/[id]/page.tsx)** - Added WorkImageGallery to public profile view

---

## Setup Instructions

### Step 1: Run the Database SQL
Run the contents of [sql/CREATE_WORK_IMAGES.sql](sql/CREATE_WORK_IMAGES.sql) in your Supabase SQL Editor:

```sql
-- This creates:
-- 1. work_images table with RLS policies
-- 2. work-images storage bucket (10MB limit, JPEG/PNG/WebP/GIF)
-- 3. Storage policies for upload/view/delete
-- 4. Database indexes
```

### Step 2: Test the Feature
1. Log in as a client or provider
2. Go to Profile page
3. Scroll down to "Upload Work Image" section
4. Select an image, add optional title/description
5. Click "Upload Image"
6. View your uploaded images in the gallery

### Step 3: View Other Users' Work
- Visit another user's profile (e.g., `/profile/[user-id]`)
- If you have access (accepted job or booking), you'll see their Work Gallery

---

## Features

| Feature | Description |
|---------|-------------|
| **Image Upload** | Supports JPEG, PNG, WebP, GIF up to 10MB |
| **Metadata** | Optional title and description for each image |
| **Gallery View** | Grid layout with hover effects |
| **Lightbox** | Click to view full-size with details |
| **Delete** | Users can remove their own images |
| **Privacy** | RLS ensures users can only manage their own images |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/work-images` | Upload image (requires auth) |
| `GET` | `/api/work-images?userId={id}` | Get user's images |
| `DELETE` | `/api/work-images?id={imageId}` | Delete image (requires auth) |