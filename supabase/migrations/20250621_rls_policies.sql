-- Migration: 20250621_rls_policies.sql
-- Description: Set up Row Level Security (RLS) policies for mustersheets and musterentries tables

-- Enable Row Level Security on mustersheets table
ALTER TABLE public.mustersheets ENABLE ROW LEVEL SECURITY;

-- Enable Row Level Security on musterentries table
ALTER TABLE public.musterentries ENABLE ROW LEVEL SECURITY;

-- POLICY 1: Allow public read access to active muster sheets (needed for attendance page)
-- This allows anyone to view active, non-expired muster sheets without authentication
CREATE POLICY "Public can view active muster sheets"
  ON public.mustersheets
  FOR SELECT
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- POLICY 2: Allow authenticated users to manage their own muster sheets
-- This allows users to create, read, update, and delete their own muster sheets
CREATE POLICY "Users can manage their own muster sheets"
  ON public.mustersheets
  FOR ALL
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- POLICY 3: Allow public insert access to attendance records
-- POLICY 3: Allow anonymous attendees to submit entries via QR code
-- An INSERT is allowed only if the referenced sheet exists
CREATE POLICY "Allow QR code sign-ins"
  ON public.musterentries
  FOR INSERT TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mustersheets
      WHERE id = sheet_id
    )
  );

-- POLICY 4: Allow anonymous users to update their own attendance records (for hash generation)
-- This allows anonymous attendees to update their own records to add the attendance hash
CREATE POLICY "Allow anonymous hash updates"
  ON public.musterentries
  FOR UPDATE TO anon
  USING (true)  -- Allow update on any record (since anonymous users don't have user_id)
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mustersheets
      WHERE id = sheet_id
    )
  );

-- POLICY 5: Owners (sheet creators) can view all entries for their sheets
CREATE POLICY "Owners can view entries"
  ON public.musterentries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.mustersheets
      WHERE mustersheets.id = musterentries.sheet_id
        AND mustersheets.creator_id = auth.uid()
    )
  );

-- POLICY 6: Authenticated attendees can view only their own entry
CREATE POLICY "Attendees see only their entry"
  ON public.musterentries
  FOR SELECT
  USING (
    auth.uid() = user_id
  );
