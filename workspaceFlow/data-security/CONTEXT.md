# Data & Security Workspace

_Last updated: 2026-06-20_

Supabase data layer, Row Level Security, auth, and the attendance-hash receipt system. This workspace combines data management and security because in this app they are the same surface: RLS *is* the access-control model.

## Data model (Postgres, schema `public`)
- `mustersheets` — a sheet/event. Key columns: `id`, `creator_id` (→ `auth.uid()`), `is_active`, `expires_at`.
- `musterentries` — one attendance sign-in. Key columns: `id`, `sheet_id` (→ `mustersheets.id`), `user_id` (null for anonymous), attendee fields, and `attendance_hash`.

## Files
- `supabase/migrations/*.sql` — **source of truth** for schema + RLS, applied in date order:
  - `20250621_rls_policies.sql` — the 6 RLS policies
  - `20250622_apply_rls_function.sql` — RPC used by the apply script
  - `20250623_add_attendance_hash.sql` — adds `attendance_hash`
- Root SQL (`apply_rls_policies.sql`, `create_tables_and_policies.sql`, `fix_anonymous_hash_updates.sql`) — helper/one-shot scripts.
- `scripts/apply-rls-policies.js` — `npm run apply-rls`; connects with `SUPABASE_SERVICE_KEY` and installs policies.
- `supabase/functions/generate-hash/index.ts` — edge function for server-side hashing.
- `src/integrations/supabase/client.ts` — browser client (holds the **anon/publishable** key; safe to be public). `types.ts` is generated DB types.
- `src/lib/hash-utils.ts` — SHA-256 attendance receipt hash (Web Crypto, with a weak fallback). Used by `/verify`.

## RLS policy intent (`musterentries` / `mustersheets`)
1. Public can SELECT active, non-expired sheets (attendance page). 2. Owners manage their own sheets (`creator_id = auth.uid()`). 3. Anon INSERT entries only if the sheet exists. 4. Anon UPDATE entries (to write the hash). 5. Owners SELECT all entries for their sheets. 6. Authed attendees SELECT only their own entry.

## What good looks like
Schema/policy changes land as a **new dated migration** (never edit an applied one), are mirrored in `src/integrations/supabase/types.ts` if columns change, keep public pages working without auth, and apply cleanly via `npm run apply-rls`.

## Known security issues to track (do not silently change app behavior)
- **Policy 4 `Allow anonymous hash updates` uses `USING (true)`** → any anonymous client can UPDATE any entry row. Tighten before relying on hashes as tamper-proof. Logged in `workspaceFlow/memory/`.
- `hash-utils.ts` salt is a hardcoded client-side constant → the SHA-256 receipt is integrity-only, not secret-keyed. Server-side `generate-hash` is the stronger path.

## Avoid
Editing applied migrations · committing the **service_role** key (anon key is fine) · loosening RLS to "fix" a bug without noting the exposure · diverging the SQL helper scripts from the migrations.
