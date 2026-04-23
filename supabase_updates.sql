-- Add is_verified to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Update co_authors structure in submissions table
-- Since co_authors is stored as JSONB in submissions, we don't need to alter the table structure,
-- but we should ensure the application handles the new fields correctly.
