# RLS: anonymous UPDATE policy is over-permissive

_Logged: 2026-06-20_

## Finding
`supabase/migrations/20250621_rls_policies.sql` Policy 4 (`Allow anonymous hash updates`):

```sql
CREATE POLICY "Allow anonymous hash updates"
  ON public.musterentries
  FOR UPDATE TO anon
  USING (true)            -- <-- any anon can target any row
  WITH CHECK ( EXISTS (SELECT 1 FROM public.mustersheets WHERE id = sheet_id) );
```

`USING (true)` means any anonymous client can UPDATE **any** `musterentries` row, not just their own. Combined with the client-side hash salt in `src/lib/hash-utils.ts` (a public constant), an attendance "receipt" hash is integrity-only, not tamper-proof against a determined actor.

## Impact
An attacker could overwrite other attendees' entries / hashes. Acceptable for a low-stakes sign-in sheet; **not** acceptable if hashes are treated as authoritative proof of attendance.

## Possible directions (not yet decided)
- Scope `USING` to the row just inserted (e.g. via a per-session token / claim) instead of `true`.
- Move hash generation fully server-side (`supabase/functions/generate-hash`) and block client UPDATE of `attendance_hash`.
- Add a short-lived signed token issued at INSERT, required for the UPDATE.

## Status
Tracked, not changed. Revisit when hardening the receipt system. Owner: juniorduc44@gmail.com.
