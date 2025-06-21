-- Migration: 20250621_rls_policies.sql
-- Description: Set up Row Level Security (RLS) policies for muster_sheets and attendance_records tables

-- Enable Row Level Security on muster_sheets table
ALTER TABLE public.muster_sheets ENABLE ROW LEVEL SECURITY;

-- Enable Row Level Security on attendance_records table
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

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
-- This allows anyone to submit attendance records without authentication
CREATE POLICY "Public can submit attendance records"
  ON public.attendance_records
  FOR INSERT
  WITH CHECK (true);

-- POLICY 4: Allow creators to view attendance records for their sheets
-- This allows users to view attendance records for sheets they created
CREATE POLICY "Creators can view attendance for their sheets"
  ON public.attendance_records
  FOR SELECT
  USING (
    sheet_id IN (
      SELECT id FROM public.muster_sheets WHERE creator_id = auth.uid()
    )
  );

-- POLICY 5: Allow creators to manage attendance records for their sheets
-- This allows users to update or delete attendance records for sheets they created
CREATE POLICY "Creators can manage attendance for their sheets"
  ON public.attendance_records
  FOR UPDATE
  USING (
    sheet_id IN (
      SELECT id FROM public.muster_sheets WHERE creator_id = auth.uid()
    )
  );

CREATE POLICY "Creators can delete attendance for their sheets"
  ON public.attendance_records
  FOR DELETE
  USING (
    sheet_id IN (
      SELECT id FROM public.muster_sheets WHERE creator_id = auth.uid()
    )
  );
