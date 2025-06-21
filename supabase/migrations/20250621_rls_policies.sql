-- Migration: 20250621_rls_policies.sql
-- Description: Set up Row Level Security (RLS) policies for muster_sheets and attendance_records tables

-- Enable Row Level Security on muster_sheets table
ALTER TABLE public.muster_sheets ENABLE ROW LEVEL SECURITY;

-- Enable Row Level Security on muster_entries table
ALTER TABLE public.muster_entries ENABLE ROW LEVEL SECURITY;

-- POLICY 1: Allow public read access to active muster sheets (needed for attendance page)
-- This allows anyone to view active, non-expired muster sheets without authentication
CREATE POLICY "Public can view active muster sheets"
  ON public.muster_sheets
  FOR SELECT
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- POLICY 2: Allow authenticated users to manage their own muster sheets
-- This allows users to create, read, update, and delete their own muster sheets
CREATE POLICY "Users can manage their own muster sheets"
  ON public.muster_sheets
  FOR ALL
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- POLICY 3: Allow public insert access to attendance records
-- POLICY 3: Allow anonymous attendees to submit entries via QR code
-- An INSERT is allowed only if the referenced sheet exists
CREATE POLICY "Allow QR code sign-ins"
  ON public.muster_entries
  FOR INSERT TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.muster_sheets
      WHERE id = sheet_id
    )
  );

-- POLICY 4: Owners (sheet creators) can view all entries for their sheets
CREATE POLICY "Owners can view entries"
  ON public.muster_entries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.muster_sheets
      WHERE muster_sheets.id = muster_entries.sheet_id
        AND muster_sheets.creator_id = auth.uid()
    )
  );

-- POLICY 5: Authenticated attendees can view only their own entry
CREATE POLICY "Attendees see only their entry"
  ON public.muster_entries
  FOR SELECT
  USING (
    auth.uid() = user_id
  );
