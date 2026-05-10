-- ============================================================================
-- Add status column to reviews table
-- ============================================================================
-- This SQL adds a status column to the reviews table to fix the
-- "record \"new\" has no field \"status\"" error
--
-- Run this in Supabase SQL Editor
--
-- ============================================================================

BEGIN;

-- Add status column to reviews table
ALTER TABLE public.reviews
ADD COLUMN status TEXT NOT NULL DEFAULT 'published'
CHECK (status IN ('published', 'hidden', 'flagged'));

-- Create index on status for queries
CREATE INDEX idx_reviews_status ON public.reviews(status);

COMMIT;