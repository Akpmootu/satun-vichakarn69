-- Update database table commands (v1.2.3)
-- Run this in Supabase SQL Editor
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_info JSONB DEFAULT '{}'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS education_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS author_photo TEXT;

-- Create Storage Bucket for avatars (and logos) if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true) 
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to the avatars bucket
CREATE POLICY "Public Access to Avatars" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

-- Allow authenticated users to upload to avatars bucket (optional, if you plan to let users upload photos)
CREATE POLICY "Authenticated users can upload avatars" 
ON storage.objects FOR INSERT 
TO authenticated WITH CHECK (bucket_id = 'avatars');

-- Since co_authors is stored as JSONB in submissions, we don't need to alter the table structure,
-- but we should ensure the application handles the new fields correctly.
