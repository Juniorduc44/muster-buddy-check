-- create_tables_and_policies.sql
-- Comprehensive setup script for Muster Buddy Check database
-- This script creates all necessary tables, indexes, constraints, and
-- applies Row Level Security (RLS) policies from scratch.

-- =====================================================================
-- PART 1: CREATE TABLES
-- =====================================================================

-- Create mustersheets table
CREATE TABLE public.mustersheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    creator_id UUID NOT NULL REFERENCES auth.users(id),
    title TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    expires_at TIMESTAMPTZ,
    required_fields TEXT[] DEFAULT ARRAY['first_name', 'last_name']::TEXT[] NOT NULL,
    time_format TEXT DEFAULT 'standard' NOT NULL,
    location TEXT,
    event_date DATE,
    event_type TEXT
);

-- Create musterentries table
CREATE TABLE public.musterentries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    sheet_id UUID NOT NULL REFERENCES public.mustersheets(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    rank TEXT,
    badge_number TEXT,
    unit TEXT,
    age INTEGER,
    timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'present',
    notes TEXT,
    
    -- Ensure unique attendance per sheet/person combination
    CONSTRAINT unique_attendance UNIQUE (sheet_id, first_name, last_name, email)
);

-- =====================================================================
-- PART 2: CREATE INDEXES AND CONSTRAINTS
-- =====================================================================

-- Indexes for mustersheets
CREATE INDEX mustersheets_creator_id_idx ON public.mustersheets(creator_id);
CREATE INDEX mustersheets_is_active_idx ON public.mustersheets(is_active);
CREATE INDEX mustersheets_expires_at_idx ON public.mustersheets(expires_at);

-- Indexes for musterentries
CREATE INDEX musterentries_sheet_id_idx ON public.musterentries(sheet_id);
CREATE INDEX musterentries_user_id_idx ON public.musterentries(user_id);
CREATE INDEX musterentries_timestamp_idx ON public.musterentries(timestamp);
CREATE INDEX musterentries_name_idx ON public.musterentries(first_name, last_name);

-- Add trigger for updated_at timestamp on mustersheets
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now(); 
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_mustersheets
BEFORE UPDATE ON public.mustersheets
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- =====================================================================
-- PART 3: ENABLE ROW LEVEL SECURITY
-- =====================================================================

-- Enable RLS on mustersheets table
ALTER TABLE public.mustersheets ENABLE ROW LEVEL SECURITY;

-- Enable RLS on musterentries table
ALTER TABLE public.musterentries ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- PART 4: CREATE RLS POLICIES
-- =====================================================================

-- POLICY 1: Allow public read access to active mustersheets (needed for attendance page)
-- This allows anyone to view active, non-expired mustersheets without authentication
CREATE POLICY "Public can view active muster sheets"
  ON public.mustersheets
  FOR SELECT
  TO authenticated, anon
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
-- An INSERT is allowed only if the referenced sheet exists, is active, and not expired
CREATE POLICY "Allow QR code sign-ins"
  ON public.musterentries
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mustersheets
      WHERE id = sheet_id
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
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

-- POLICY 6: UPDATE rights for creators
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

-- POLICY 7: DELETE rights for creators
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

-- POLICY 8: Public can view entries for active sheets
-- This allows anyone to see entries for public, active sheets
CREATE POLICY "Public can view entries for active sheets"
  ON public.musterentries
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.mustersheets
      WHERE mustersheets.id = musterentries.sheet_id
        AND mustersheets.is_active = true
        AND (mustersheets.expires_at IS NULL OR mustersheets.expires_at > now())
    )
  );

-- =====================================================================
-- END OF SCRIPT
-- =====================================================================
