-- Fix for anonymous hash updates
-- This script adds the missing UPDATE policy that allows anonymous users to update their attendance records with hashes

-- Drop the policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Allow anonymous hash updates" ON public.musterentries;

-- Add UPDATE policy for anonymous users to update their attendance records (for hash generation)
CREATE POLICY "Allow anonymous hash updates"
  ON public.musterentries
  FOR UPDATE
  TO anon
  USING (true)  -- Allow update on any record (since anonymous users don't have user_id)
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mustersheets
      WHERE id = sheet_id
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > now())
    )
  );

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'musterentries' 
  AND policyname = 'Allow anonymous hash updates'; 