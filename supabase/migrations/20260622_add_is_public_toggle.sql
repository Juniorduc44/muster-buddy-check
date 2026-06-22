-- Migration: 20260622_add_is_public_toggle.sql
-- Description: Add a public/private submission mode to mustersheets and make the
--   musterentries INSERT policies mode-aware.
--
--   is_public = true  → anyone with the link can sign in (anon OR authenticated)
--   is_public = false → only the sheet creator may add entries (in-person/desk
--                        sign-in); the public attendance form is hidden.
--
-- Verification (creator-only, from the Results page) is unchanged.

-- 1. Column -----------------------------------------------------------------
ALTER TABLE public.mustersheets
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

-- Existing sheets default to public (restores the originally intended behavior).
UPDATE public.mustersheets SET is_public = true WHERE is_public IS NULL;

-- 2. INSERT policies on musterentries --------------------------------------
-- Replace the single "sheet exists" insert policy with two mode-aware policies.
-- RLS policies are OR-ed: an insert succeeds if ANY permissive policy passes.
DROP POLICY IF EXISTS "Allow QR code sign-ins" ON public.musterentries;
DROP POLICY IF EXISTS "Public sign-ins on public sheets" ON public.musterentries;
DROP POLICY IF EXISTS "Owners can add entries to their sheets" ON public.musterentries;

-- 2a. PUBLIC sheets: anyone (anon or authenticated) may sign in.
CREATE POLICY "Public sign-ins on public sheets"
  ON public.musterentries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mustersheets
      WHERE id = sheet_id
        AND is_public = true
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > now())
    )
  );

-- 2b. ANY sheet (public or private): the creator may always add entries to
--     their own active sheet. This is what enables private "desk" sign-in.
CREATE POLICY "Owners can add entries to their sheets"
  ON public.musterentries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mustersheets
      WHERE id = sheet_id
        AND creator_id = auth.uid()
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > now())
    )
  );

-- 3. Ensure the creator can write the attendance_hash on their own entries
--    (needed for private desk sign-in, where the creator is authenticated
--    rather than anon). Idempotent re-create.
DROP POLICY IF EXISTS "Creators can update entries" ON public.musterentries;
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
