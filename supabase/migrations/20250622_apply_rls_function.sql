-- File: supabase/migrations/20250622_apply_rls_function.sql
-- Creates a function to apply all Row Level Security (RLS) policies
-- This function can be called from a Node.js script after deployment

CREATE OR REPLACE FUNCTION apply_rls_policies() RETURNS void AS $$
BEGIN
  -- Enable Row Level Security on mustersheets table
  ALTER TABLE public.mustersheets ENABLE ROW LEVEL SECURITY;

  -- Enable Row Level Security on musterentries table
  ALTER TABLE public.musterentries ENABLE ROW LEVEL SECURITY;

  -- POLICY 1: Allow public read access to active mustersheets (needed for attendance page)
  -- This allows anyone to view active, non-expired mustersheets without authentication
  CREATE POLICY IF NOT EXISTS "Public can view active muster sheets"
    ON public.mustersheets
    FOR SELECT
    TO authenticated, anon
    USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

  -- POLICY 2: Allow authenticated users to manage their own mustersheets
  -- This allows users to create, read, update, and delete their own mustersheets
  CREATE POLICY IF NOT EXISTS "Users can manage their own muster sheets"
    ON public.mustersheets
    FOR ALL
    TO authenticated
    USING (creator_id = auth.uid())
    WITH CHECK (creator_id = auth.uid());

  -- POLICY 3: Allow anonymous attendees to submit entries via QR code
  -- An INSERT is allowed only if the referenced sheet exists, is active, and not expired
  CREATE POLICY IF NOT EXISTS "Allow QR code sign-ins"
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
  CREATE POLICY IF NOT EXISTS "Owners can view entries"
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
  CREATE POLICY IF NOT EXISTS "Attendees see only their entry"
    ON public.musterentries
    FOR SELECT
    TO authenticated
    USING (
      auth.uid() = user_id
    );

  -- UPDATE rights for creators
  CREATE POLICY IF NOT EXISTS "Creators can update entries"
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
  CREATE POLICY IF NOT EXISTS "Creators can delete entries"
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
