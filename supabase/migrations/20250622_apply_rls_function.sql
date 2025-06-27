-- File: supabase/migrations/20250622_apply_rls_function.sql
-- Creates a function to apply all Row Level Security (RLS) policies
-- This function can be called from a Node.js script after deployment

CREATE OR REPLACE FUNCTION apply_rls_policies() RETURNS jsonb AS $$
DECLARE
  policy_count int := 0;
  status_message text := 'RLS policies applied successfully.';
BEGIN
  RAISE NOTICE 'Starting RLS policy application...';

  -- Drop existing policies to ensure idempotency
  RAISE NOTICE 'Dropping existing RLS policies...';
  DROP POLICY IF EXISTS "Public can view active muster sheets" ON public.mustersheets;
  DROP POLICY IF EXISTS "Users can manage their own muster sheets" ON public.mustersheets;
  DROP POLICY IF EXISTS "Allow QR code sign-ins" ON public.musterentries;
  DROP POLICY IF EXISTS "Owners can view entries" ON public.musterentries;
  DROP POLICY IF EXISTS "Attendees see only their entry" ON public.musterentries;
  DROP POLICY IF EXISTS "Creators can update entries" ON public.musterentries;
  DROP POLICY IF EXISTS "Creators can delete entries" ON public.musterentries;
  RAISE NOTICE 'Existing RLS policies dropped.';

  -- Enable Row Level Security on mustersheets table
  RAISE NOTICE 'Enabling RLS on public.mustersheets...';
  ALTER TABLE public.mustersheets ENABLE ROW LEVEL SECURITY;
  RAISE NOTICE 'RLS enabled on public.mustersheets.';

  -- Enable Row Level Security on musterentries table
  RAISE NOTICE 'Enabling RLS on public.musterentries...';
  ALTER TABLE public.musterentries ENABLE ROW LEVEL SECURITY;
  RAISE NOTICE 'RLS enabled on public.musterentries.';

  -- POLICY 1: Allow public read access to active mustersheets (needed for attendance page)
  RAISE NOTICE 'Creating policy "Public can view active muster sheets"...';
  CREATE POLICY "Public can view active muster sheets"
    ON public.mustersheets
    FOR SELECT
    TO authenticated, anon
    USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));
  policy_count := policy_count + 1;
  RAISE NOTICE 'Policy "Public can view active muster sheets" created.';

  -- POLICY 2: Allow authenticated users to manage their own mustersheets
  RAISE NOTICE 'Creating policy "Users can manage their own muster sheets"...';
  CREATE POLICY "Users can manage their own muster sheets"
    ON public.mustersheets
    FOR ALL
    TO authenticated
    USING (creator_id = auth.uid())
    WITH CHECK (creator_id = auth.uid());
  policy_count := policy_count + 1;
  RAISE NOTICE 'Policy "Users can manage their own muster sheets" created.';

  -- POLICY 3: Allow anonymous attendees to submit entries via QR code
  RAISE NOTICE 'Creating policy "Allow QR code sign-ins"...';
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
  policy_count := policy_count + 1;
  RAISE NOTICE 'Policy "Allow QR code sign-ins" created.';

  -- POLICY 4: Owners (sheet creators) can view all entries for their sheets
  RAISE NOTICE 'Creating policy "Owners can view entries"...';
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
  policy_count := policy_count + 1;
  RAISE NOTICE 'Policy "Owners can view entries" created.';

  -- POLICY 5: Authenticated attendees can view only their own entry
  RAISE NOTICE 'Creating policy "Attendees see only their entry"...';
  CREATE POLICY "Attendees see only their entry"
    ON public.musterentries
    FOR SELECT
    TO authenticated
    USING (
      auth.uid() = user_id
    );
  policy_count := policy_count + 1;
  RAISE NOTICE 'Policy "Attendees see only their entry" created.';

  -- UPDATE rights for creators
  RAISE NOTICE 'Creating policy "Creators can update entries"...';
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
  policy_count := policy_count + 1;
  RAISE NOTICE 'Policy "Creators can update entries" created.';

  -- DELETE rights for creators
  RAISE NOTICE 'Creating policy "Creators can delete entries"...';
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
  policy_count := policy_count + 1;
  RAISE NOTICE 'Policy "Creators can delete entries" created.';

  RAISE NOTICE 'RLS policy application complete. Total policies created: %', policy_count;

  RETURN jsonb_build_object(
    'status', status_message,
    'policies_applied', policy_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
