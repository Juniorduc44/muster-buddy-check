# Muster Buddy Check – QR Code Sign-In Fix Guide  
*Document owner: @Juniorduc44 — Last updated: YYYY-MM-DD*

This document captures the full investigation and resolution of the **“Sheet Not Found”** error that prevented public QR-code sign-in. Copy the content into your release notes for **v 3.0.0** (or later) and keep it updated if the QR flow changes.

---

## 1  Root-Cause Analysis

| # | Symptom | Underlying Cause |
|---|---------|------------------|
| 1 | Creator could see a QR code locally, but scanning on another device showed **Sheet Not Found**. | Front-end queried table **`muster_sheets`** (with underscore) while the real table is **`mustersheets`** (no underscore). PostgREST returned **404 / 406**. |
| 2 | After fixing the name, anonymous scans still failed. | Row-Level Security (RLS) policies did **not** grant `anon` role `SELECT` on active sheets or `INSERT` on entries. |
| 3 | SQL migration initially combined `FOR UPDATE, DELETE` in one policy, causing **42601** syntax error, so policies were never applied. |
| 4 | `QRCodePage` generated QR before `fetchSheet()` finished when network latency was high, showing a blank placeholder (race condition). |
| 5 | Local script to apply RLS used `require()` in an ESM project; it silently aborted, leaving policies missing. |

---

## 2  What We Fixed

### 2.1 Table-Name Consistency
* All React components now reference **`mustersheets`** and **`musterentries`** (no underscores).  
* Regenerated `supabase/types.ts` so TypeScript types align with table names.  
* `CreateSheetModal.tsx` inserts into **`mustersheets`**; `AttendancePage.tsx`, `ResultsPage.tsx`, `Dashboard.tsx`, and `MusterSheetCard.tsx` query the same names.

### 2.2 Database & RLS Policies

| Policy | Table | Roles | Action | Condition |
|--------|-------|-------|--------|-----------|
| **Public can view active sheets** | `mustersheets` | `authenticated, anon` | `SELECT` | `is_active = true` **AND** sheet not expired |
| **Allow QR code sign-ins** | `musterentries` | `authenticated, anon` | `INSERT` | Parent sheet exists, active, not expired |
| **Creator CRUD** | both tables | `authenticated` | `ALL` | `creator_id = auth.uid()` |
| **Attendee privacy** | `musterentries` | `authenticated` | `SELECT` | `user_id = auth.uid()` |

The migration lives in **`supabase/migrations/20250621_rls_policies.sql`** and is applied via:

```bash
npm run apply-rls   # requires SUPABASE_SERVICE_KEY in .env
```

### 2.3 Front-End Logic

* `QRCodePage.tsx`
  * Waits for sheet fetch before generating the QR (`useEffect([sheet])`).
  * Friendly error mapping for RLS errors (`PGRST301` / `42501`).
* `AttendancePage.tsx`
  * Same error mapping; posts to `musterentries`.
* UX polish: clearer badges, tips, loading states.

---

## 3  How to Test

1. **Apply the migration**  
   * Run the SQL in Supabase or `npm run apply-rls`.  
   * Verify with:  
     ```sql
     select tablename, policyname from pg_policies
     where tablename in ('mustersheets','musterentries');
     ```
     Expect 8 policies.

2. **Local dev**  
   ```bash
   npm run dev
   # Create a sheet → press “QR/Link”
   ```
   * QR image appears.
   * Scan from phone on same LAN (use `http://<host-ip>:3000`) → attendance page loads.
   * Submit form → entry shows in creator’s Results page.

3. **Staging (Lovable)**  
   * Push `main`, wait for deploy.  
   * Visit `/qr/{sheetId}` — QR visible.  
   * Scan and submit while logged-out — success; row appears in `musterentries`.

4. **Edge cases**  
   * Expired sheet → “Event Expired”.  
   * Inactive sheet → “Event Inactive”.  
   * Logged-out creator opening `/results/{sheetId}` → blocked.

---

## 4  Troubleshooting Cheat-Sheet

| Error | Meaning | Fix |
|-------|---------|-----|
| **404 / 406** on `/rest/v1/muster_sheets` | Wrong table name (underscore) | Replace with **`mustersheets`** in code and types. |
| **PGRST301 / 42501** | Permission denied by RLS | Ensure public `SELECT` / `INSERT` policies include `anon`. |
| **42601** at `FOR UPDATE, DELETE` | SQL syntax error in policy | Split into separate `FOR UPDATE` and `FOR DELETE` policies. |
| Blank QR image | QR generated before sheet fetched | Confirm `useEffect([sheet])` pattern. |
| QR scan still “Sheet Not Found” | Policies missing | Re-run `npm run apply-rls`; check Supabase logs. |
| Logout returns 403 | Invalid session token | Clear cookies/localStorage, retry login. |

---

## 5  Preventive Measures

* **Naming**: Use single-word table names or match exactly across SQL, code, and generated TS types.  
* **Migrations**: All schema changes via SQL migration files, never ad-hoc.  
* **RLS**: Always list roles explicitly (`TO authenticated, anon`) to avoid ambiguity.  
* **Scripts**: Stick to one module system (ESM) for Node scripts; test `npm run apply-rls` in CI.  
* **CI**: Add an integration test that:  
  1. Spins up Supabase,  
  2. Creates a sheet via API,  
  3. Requests `/qr/:id` and `/attend/:id` anonymously, expecting HTTP 200.  
* **Monitoring**: Supabase Logs → filter on `status=4xx` for `/rest/v1/mustersheets` to catch future regressions early.

---

### ✔ Current Status

* QR code page loads instantly for sheet creators.  
* Attendees (no account) can scan & submit from any device.  
* Entries update in real-time on the Results page.  

This QR sign-in workflow is now production-ready. Keep this document updated with future amendments.  
