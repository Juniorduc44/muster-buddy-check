-- Migration: 20250623_add_attendance_hash.sql
-- Description: Add hash field to musterentries table for proof of attendance receipts

-- Add hash column to musterentries table
ALTER TABLE public.musterentries 
ADD COLUMN IF NOT EXISTS attendance_hash TEXT;

-- Create index on attendance_hash for verification queries
CREATE INDEX IF NOT EXISTS idx_musterentries_attendance_hash ON public.musterentries(attendance_hash);

-- Add comment explaining the hash field
COMMENT ON COLUMN public.musterentries.attendance_hash IS 'SHA256 hash for proof of attendance receipt. Generated from entry data and timestamp.'; 