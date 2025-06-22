# Muster Buddy Check – QR Code Sign-In Fix Guide

This document records the investigation and resolution of the **“Sheet Not Found”** error that prevented the QR-code / link sign-in flow from working for attendees without an account.  
Copy this file into your release notes for **v2.0.0** (or later) and keep it updated if further QR-related changes are made.

---

## 1  Root Cause Analysis

| # | Symptom | Underlying Cause |
|---|---------|------------------|
| 1 | Creator saw QR code locally, but scanning on another device showed **Sheet Not Found**. | Front-end queried table `muster_sheets` (underscore) while the real table is `mustersheets` (no underscore). PostgREST returned **406**. |
| 2 | After renaming tables, unauthenticated scans still failed. | Row-Level Security (RLS) policies did not explicitly grant `anon` role `SELECT` on active sheets or `INSERT` on entries. |
| 3 | SQL migration initially combined `FOR UPDATE, DELETE` in one policy causing **42601** syntax error, so policies were never applied. |
| 4 | `QRCodePage` generated QR code before `fetchSheet()` finished, resulting in blank image when network latency was high (race condition). |
| 5 | Supabase CLI script used `require()` in an ESM project; the script silently failed to apply new policies. |

---

## 2  Fix Details

### 2.1 Database (schema + RLS)

* **Tables created / verified**
  * `public.mustersheets`
  * `public.musterentries`
* **RLS policies**
  * `Public can view active muster sheets` – `SELECT` allowed for `authenticated, anon` **WHEN** `is_active = true` **AND** (`expires_at` IS NULL OR > now()).
  * `Allow QR-code sign-ins` – `INSERT` allowed for `anon, authenticated` into `musterentries` if parent sheet is active & not expired.
  * Creator-only policies for `UPDATE`, `DELETE`, `SELECT` on their own sheets and entries.
  * Attendee privacy: authenticated users only `SELECT` their own entry.

### 2.2 Front-End Code

| File | Change |
|------|--------|
| `src/components/CreateSheetModal.tsx` | Insert sheets into **`mustersheets`** (removed underscore). |
| `src/pages/AttendancePage.tsx` | Query **`mustersheets`**, insert into **`musterentries`**; improved error mapping. |
| `src/pages/QRCodePage.tsx` | Query `mustersheets`; moved `generateQRCode()` to separate `useEffect` dependent on `sheet` to eliminate race. |
| `src/integrations/supabase/types.ts` | Regenerated types to use `mustersheets` / `musterentries`. |

### 2.3 Tooling

* **`create_tables_and_policies.sql`** – full migration creating tables, adding indexes, and applying explicit policies (`TO authenticated, anon`).
* **`scripts/apply-rls-policies.js`** – converted to ES Modules (`import`), loads `.env`, runs migration via Supabase **service_role** key.

---

## 3  Testing Steps

1. **Apply Migration**  
   * In Supabase Dashboard → *SQL Editor* → *New SQL Snippet* → paste **`create_tables_and_policies.sql`** → **Run**.  
   * Verify:  
     ```sql
     select tablename, policyname
     from pg_policies
     where tablename in ('mustersheets','musterentries');
     ```
     should list 8 policies.

2. **Local Functional Test**  
   ```bash
   npm run dev        # start Vite
   # Create a sheet, press QR/Link
   ```
   * QR code image should appear.
   * Scan from another phone on same LAN (use machine’s IP, not `localhost`) – attendance page loads.
   * Submit form – entry appears in creator’s *Results* page.

3. **Staging / Lovable Deploy**  
   * Push to `main`, Lovable auto-deploys.  
   * Visit `/qr/{sheetId}` – QR shown.  
   * Scan and submit on mobile with no login – success (check Supabase `musterentries` rows).

4. **Edge Cases**  
   * Sheet expired → public attendees receive “Event Expired”.  
   * `is_active = false` → “Event Inactive”.  
   * Logged-out creator visiting `/results/{sheetId}` correctly blocked.

---

## 4  Preventative Measures

| Area | Recommendation |
|------|----------------|
| Naming | Adopt **single-word table names** (no underscores) or reflect names consistently in code, migrations, and types. |
| Migrations | Treat SQL as single source of truth. Any schema change **must** go in a migration file then regenerate TS types. |
| RLS | Always specify `TO authenticated, anon` explicitly for public policies to avoid role-ambiguity. |
| Scripts | Ensure project uses **one** module system (ESM). Test any Node CLI script under `npm run apply-rls` in CI. |
| CI Tests | Add an integration test that: 1) spins up Supabase (or mocks PostgREST), 2) creates sheet via API, 3) requests `/qr/:id` and `/attend/:id` as anon, expecting 200. |
| Monitoring | Enable Supabase Logs filter for `status=4xx` on `/rest/v1/mustersheets` to catch policy regressions early. |

---

## 5  Appendix – Common Errors & Fixes

| Error | Meaning | Fix |
|-------|---------|-----|
| **406** `/rest/v1/muster_sheets` | Wrong table name (_underscore_) | Update queries & types to `mustersheets`. |
| **PGRST301 / 42501** | Permission denied by RLS | Confirm public `SELECT` / `INSERT` policies include `anon`. |
| **42601** at `FOR UPDATE, DELETE` | Invalid policy syntax | Separate into two distinct policies. |
| QR image blank | `generateQRCode()` called before sheet fetched | Run QR generation in `useEffect([sheet])`. |

---

### ✔ Status After Fix

* **QR code page** loads immediately for creator.  
* **Attendance link / scan** works for any device with just internet access.  
* **Entries** populate in real-time for the sheet owner.  

Your QR sign-in workflow is now production-ready. Keep this document updated with any future changes.  
