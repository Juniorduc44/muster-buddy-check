-- SQL Script to Apply Row Level Security (RLS) Policies for Muster Buddy Check
-- This script can be executed directly in the Supabase SQL Editor.

-- IMPORTANT: Ensure you have the 'mustersheets' and 'musterentries' tables created
-- in your 'public' schema before running this script.

-- Enable Row Level Security on mustersheets table
ALTER TABLE public.mustersheets ENABLE ROW LEVEL SECURITY;

-- Enable Row Level Security on musterentries table
ALTER TABLE public.musterentries ENABLE ROW LEVEL SECURITY;

-- POLICY 1: Allow public read access to active mustersheets (needed for attendance page)
-- This allows anyone to view active, non-expired mustersheets without authentication
CREATE POLICY "Public can view active muster sheets"
  ON public.mustersheets
  FOR SELECT
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- POLICY 2: Allow authenticated users to manage their own mustersheets
-- This allows users to create, read, update, and delete their own mustersheets
CREATE POLICY "Users can manage their own muster sheets"
  ON public.mustersheets
  FOR ALL
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

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

-- POLICY 4: Owners (sheet creators) can view all entries for their sheets
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

-- POLICY 5: Authenticated attendees can view only their own entry
CREATE POLICY "Attendees see only their entry"
  ON public.musterentries
  FOR SELECT
  USING (
    auth.uid() = user_id
  );

-- Optional: Add policies for UPDATE/DELETE on musterentries for creators if needed
-- CREATE POLICY "Creators can manage entries"
--   ON public.musterentries
--   FOR UPDATE, DELETE
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.mustersheets
--       WHERE mustersheets.id = musterentries.sheet_id
--         AND mustersheets.creator_id = auth.uid()
--     )
--   );

-- Verification (optional - run these separately in SQL Editor if needed)
-- SELECT policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE tablename IN ('mustersheets','musterentries');
