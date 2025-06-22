# Muster Buddy Check – QR Code & Attendance Fix (Updated)  
*File: **MUSTER_BUDDY_QR_FIX_UPDATED.md** – Last revised: 2025-06-22*

This document records **all** findings and permanent fixes for the QR-code / public-attendance flow. Use it verbatim in your v3.0.0 release notes.

---

## 1 Symptom Recap

| Phase | URL Example | What Went Wrong |
|-------|-------------|-----------------|
| Dashboard | `/` | Creator sees sheets normally |
| QR page | `/qr/{sheetId}` | Creator sees QR *only* when logged-in; others get “Sheet Not Found” |
| Attendance page | `/attend/{sheetId}` | On mobile / incognito: input form fails to load – **GET 406** |

---

## 2 Root-Cause Analysis

| # | Root Cause | Details |
|---|------------|---------|
| 1 | **Table name mismatch** | Code queried `muster_sheets`; database table is `mustersheets` → PostgREST 404/406. |
| 2 | **Missing RLS rules** | `anon` role lacked `SELECT` on sheets & `INSERT` on entries. |
| 3 | **Bad SQL migration** | Combined `FOR UPDATE, DELETE` → syntax 42601, so policies never applied. |
| 4 | **Race condition** | QR generated before sheet metadata arrived → blank placeholder. |
| 5 | **Script in wrong module system** | `apply-rls-policies.js` used `require` inside ESM project → silently skipped. |
| 6 | **Query-string formatting bug** | Supabase `.eq('id', sheetId)` produced `…?id=eq.<uuid>` which PostgREST interpreted as *text* not UUID → **406 Not Acceptable** when used by unauthenticated clients. |

---

## 3 Fixes Implemented

### 3.1 Codebase

| File | Fix |
|------|-----|
| `QRCodePage.tsx` & `AttendancePage.tsx` | Replaced `.eq('id', sheetId)` **→** `.match({ id: sheetId })` to send clean `id=<uuid>` param, eliminating 406. Added extra debug & UX states. |
| `supabase/types.ts` | Regenerated – matches `mustersheets` & `musterentries`. |
| `public/_redirects` | Added `/* /index.html 200` so Netlify serves SPA routes (no 404). |
| `scripts/apply-rls-policies.js` | Converted to ES Modules + `dotenv` for secure service key. |

### 3.2 Database (Supabase)

* Enabled RLS on both tables.  
* **Policies (8 total)**:  

| Policy | Table | Role(s) | Action | Condition |
|--------|-------|---------|--------|-----------|
| Public view active | `mustersheets` | anon, authenticated | SELECT | `is_active AND (expires_at IS NULL OR expires_at>now())` |
| Creator manage own | `mustersheets` | authenticated | ALL | `creator_id = auth.uid()` |
| Public insert entry | `musterentries` | anon, authenticated | INSERT | Parent sheet active & not expired |
| Creator view entries | `musterentries` | authenticated | SELECT | Sheet.creator_id = auth.uid() |
| Attendee view self | `musterentries` | authenticated | SELECT | `user_id = auth.uid()` |
| + creator UPDATE / DELETE entry policies |

Migration file: `supabase/migrations/20250621_rls_policies.sql`.

---

## 4 Verification Steps

1. **Apply migration**  
   ```bash
   npm run apply-rls           # needs SUPABASE_SERVICE_KEY
   ```
   Check:
   ```sql
   select policyname from pg_policies
   where tablename in ('mustersheets','musterentries');
   ```

2. **Local test**  
   ```bash
   npm run dev
   # create sheet → QR page
   ```
   • QR renders only after fetch log.  
   • Scan via LAN IP on phone → attendance form loads.  
   • Submit → row appears under creator’s Results.

3. **Netlify prod**  
   Deploy main. Access `/qr/{id}` as logged-out user – QR visible.  
   Scan code → `/attend/{id}` shows input fields, submits OK.

4. **Regression guard**  
   Add Cypress (or Playwright) test that hits `/attend/{id}` without auth and expects 200 + form.

---

## 5 Troubleshooting Cheatsheet

| Error | Meaning | Resolution |
|-------|---------|------------|
| **GET 406** `/mustersheets?id=eq.<uuid>` | PostgREST rejected `eq.` syntax for UUID when unauth ‑ often RLS + query bug | Use `.match({ id: uuid })`, ensure RLS public SELECT. |
| **Sheet Not Found** on QR/Attend | No sheet, inactive, or RLS deny | Confirm `is_active`, not expired, policies applied. |
| Google redirect to localhost | Supabase “Site URL” still `http://localhost:3000` | Set to `https://mustersheets.netlify.app`. |
| 404 on dynamic route | Netlify doesn’t know SPA routes | Ensure `public/_redirects`. |
| Script `require is not defined` | CommonJS code in ESM project | Convert script to `import …` or rename `.cjs`. |

---

## 6 Post-mortem & Prevention

* **Consistency** – one canonical table name; TS types regenerated on every schema change.  
* **Scripts** – keep Node scripts ESM to match project; run in CI.  
* **Policies first** – write tests that hit endpoints as `anon` before merging.  
* **Monitoring** – Supabase dashboard → Logs filter `status>=400` on `/rest/v1/mustersheets`. Alert on spikes.  

---

### ✅ Current Status

Public QR scanning and link access now render the attendance form for **any** user (logged-in or not). Submissions insert rows, and creators view results privately. The 406 error is fully resolved by switching to `.match()` queries and the corrected RLS policies.
