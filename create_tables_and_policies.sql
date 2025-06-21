-- create_tables_and_policies.sql
-- This script creates the necessary database tables and applies Row Level Security (RLS) policies
-- for the Muster Buddy Check application.

-- Part 1: Create Tables
-- Create mustersheets table
CREATE TABLE IF NOT EXISTS public.mustersheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    creator_id UUID NOT NULL REFERENCES auth.users(id),
    title TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    required_fields TEXT[] DEFAULT ARRAY['first_name', 'last_name']::TEXT[] NOT NULL,
    time_format TEXT DEFAULT 'military' NOT NULL
);

-- Create musterentries table
CREATE TABLE IF NOT EXISTS public.musterentries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    sheet_id UUID NOT NULL REFERENCES public.mustersheets(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    rank TEXT,
    badge_number TEXT,
    unit TEXT,
    age INTEGER,
    timestamp TEXT NOT NULL DEFAULT to_char(now(), 'HH24:MI'),
    user_id UUID REFERENCES auth.users(id)
);

-- Create index on sheet_id for better query performance
CREATE INDEX IF NOT EXISTS idx_musterentries_sheet_id ON public.musterentries(sheet_id);

-- Part 2: Apply Row Level Security (RLS) Policies

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
  TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- POLICY 3: Allow anonymous attendees to submit entries via QR code
-- An INSERT is allowed only if the referenced sheet exists
CREATE POLICY "Allow QR code sign-ins"
  ON public.musterentries
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mustersheets
      WHERE id = sheet_id
      AND (expires_at IS NULL OR expires_at > now())
      AND is_active = true
    )
  );

-- POLICY 4: Owners (sheet creators) can view all entries for their sheets
CREATE POLICY "Owners can view entries"
  ON public.musterentries
  FOR SELECT
  TO authenticated
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
  TO authenticated
  USING (
    auth.uid() = user_id
  );

-- Optional: Add policies for UPDATE and DELETE on musterentries for creators

-- UPDATE rights for creators
CREATE POLICY "Creators can update entries"
  ON public.musterentries
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mustersheets
      WHERE mustersheets.id = musterentries.sheet_id
        AND mustersheets.creator_id = auth.uid()
    )
  );

-- DELETE rights for creators
CREATE POLICY "Creators can delete entries"
  ON public.musterentries
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mustersheets
      WHERE mustersheets.id = musterentries.sheet_id
        AND mustersheets.creator_id = auth.uid()
    )
  );

-- Verification query (commented out - run separately if needed)
-- SELECT tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE tablename IN ('mustersheets','musterentries');
