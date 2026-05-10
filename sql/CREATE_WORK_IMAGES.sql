-- Work Images Feature: Database Setup
-- Run this SQL in your Supabase SQL Editor to create the necessary table and storage bucket

-- 1. Create work_images table to store uploaded work images
CREATE TABLE IF NOT EXISTS work_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  image_url TEXT NOT NULL,
  image_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS on work_images table
ALTER TABLE work_images ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for work_images
-- Users can view all work images (public portfolio)
CREATE POLICY "Anyone can view work images" ON work_images
  FOR SELECT USING (true);

-- Users can insert their own work images
CREATE POLICY "Users can insert own work images" ON work_images
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own work images
CREATE POLICY "Users can update own work images" ON work_images
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own work images
CREATE POLICY "Users can delete own work images" ON work_images
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Create storage bucket for work images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'work-images',
  'work-images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage policies for work-images bucket
-- Anyone can view work images (public portfolio)
CREATE POLICY "Public access to work images" ON storage.objects
  FOR SELECT USING (bucket_id = 'work-images');

-- Authenticated users can upload their own work images
CREATE POLICY "Users can upload work images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'work-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can update their own work images
CREATE POLICY "Users can update own work images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'work-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own work images
CREATE POLICY "Users can delete own work images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'work-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 6. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_work_images_user_id ON work_images(user_id);
CREATE INDEX IF NOT EXISTS idx_work_images_created_at ON work_images(created_at DESC);