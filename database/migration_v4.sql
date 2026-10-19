-- ============================================================
-- ISKCON LMS – Migration V4
-- Assignment PDF Attachment Support
-- ============================================================

-- 1. Add attachment columns to assignments table
ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS attachment_path TEXT,
ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- 2. Storage Bucket for Assignment PDFs
-- Creates private bucket 'assignment-pdfs' in Supabase Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('assignment-pdfs', 'assignment-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage Security Policies for 'assignment-pdfs'
-- Allow authenticated users to download assignment attachments
CREATE POLICY "authenticated_select_assignment_pdfs" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (bucket_id = 'assignment-pdfs');

-- Allow instructors and admins to upload assignment PDFs
CREATE POLICY "instructor_admin_insert_assignment_pdfs" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'assignment-pdfs' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('instructor', 'admin')
  )
);

-- Allow instructors and admins to update assignment PDFs
CREATE POLICY "instructor_admin_update_assignment_pdfs" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (
  bucket_id = 'assignment-pdfs' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('instructor', 'admin')
  )
);

-- Allow instructors and admins to delete assignment PDFs
CREATE POLICY "instructor_admin_delete_assignment_pdfs" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'assignment-pdfs' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('instructor', 'admin')
  )
);
