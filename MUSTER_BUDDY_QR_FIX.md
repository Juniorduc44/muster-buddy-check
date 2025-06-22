# Muster Buddy Check – QR Code & Attendance Fix Guide  
*Document owner: @Juniorduc44 — Last updated: 2025-06-22*

This document captures the full investigation and resolution of the **“Sheet Not Found”** / **406** error that prevented public QR-code sign-in. Copy the content into your release notes for **v 3.0.0** (or later) and keep it updated if the QR flow changes.

---

## 1 Root-Cause Analysis

| # | Symptom (public/anon) | Underlying Cause |
|---|-----------------------|------------------|
| 1 | Scanning QR or opening `/attend/:id` returns **Sheet Not Found**. Creator logged-in sees it fine. | FE called `/rest/v1/mustersheets?select=*` but RLS blocked anon role. |
| 2 | Network tab shows **GET 406** on `/mustersheets?…` or **GET 401** (*missing apikey*) when CURLing. | Sheet rows invisible to `anon` because either (a) RLS not applied, (b) `is_active = false`, (c) `expires_at < now()`, or (d) wrong table name `muster_sheets`. |
| 3 | Some deployments redirected OAuth back to **localhost:3000**. | Supabase **Site URL** still pointed to localhost. |
| 4 | Netlify direct links `/qr/:id` or `/attend/:id` gave **404**. | Missing `public/_redirects` for SPA routing. |
| 5 | In dev QR rendered blank. | `QRCodePage` generated image before `fetchSheet()` resolved (race condition). |

---

## 2 What We Fixed

### 2.1 Table-Name Consistency
* All code & types use **`mustersheets`** and **`musterentries`** (no underscores).
* Regenerated `supabase/types.ts`.
* `CreateSheetModal.tsx` now inserts into `mustersheets`.

### 2.2 Database & Row-Level Security (RLS)

| Policy | Table | Roles | Cmd | Condition |
|--------|-------|-------|-----|-----------|
| Public view active sheets | `mustersheets` | `authenticated, anon` | SELECT | `is_active` **AND** (`expires_at` IS NULL OR > now()) |
| Public insert entries | `musterentries` | `authenticated, anon` | INSERT | Parent sheet exists + active + not expired |
| Creator full CRUD | both | `authenticated` | ALL | `creator_id = auth.uid()` |
| Attendee privacy | `musterentries` | `authenticated` | SELECT | `user_id = auth.uid()` |

Migration file: **`supabase/migrations/20250621_rls_policies.sql`**

```bash
npm run apply-rls           # uses SUPABASE_SERVICE_KEY
```

### 2.3 Front-End Logic

* **QRCodePage.tsx**
  * Waits for sheet fetch before generating QR.
  * Maps PostgREST codes (`406`, `PGRST301`, `42501`) to user-friendly copy.
* **AttendancePage.tsx**
  * Same error mapping.
  * Submits to `musterentries`.
* Added **`public/_redirects`** → `/* /index.html 200` for Netlify SPA.
* Auth fix: Supabase **Site URL** set to `https://mustersheets.netlify.app`.

---

## 3 How to Test

1. **Apply migration**  
   ```sql
   select tablename, policyname
   from pg_policies
   where tablename in ('mustersheets','musterentries');
   -- expect 8 rows
   ```

2. **Curl as anon**  
   ```bash
   curl -H "apikey: $VITE_SUPABASE_ANON_KEY" \
        "https://<proj>.supabase.co/rest/v1/mustersheets?id=eq.<sheetId>&select=*"
   ```
   • Returns `[]` → sheet missing / inactive / expired / RLS  
   • Returns `[ { … } ]` → sheet visible to public.

3. **Local dev**  
   ```
   npm run dev
   # create sheet → QR link
   ```
   • Open `http://<LAN-IP>:3000/attend/<id>` from phone → form renders → submit → entry row appears.

4. **Netlify prod**  
   • Ensure `_redirects` file deployed.  
   • Visit `/qr/<id>` (share link) → QR and direct link show.  
   • Scan on mobile (logged-out) → attendance form loads.

Edge cases:

| Case | Expected |
|------|----------|
| Sheet `expires_at` < now | “Event Expired” page |
| Sheet `is_active = false` | “Event Inactive” page |
| Wrong ID | “Sheet Not Found” page |
| Policies missing | “Access Restricted” + owner tip |

---

## 4 Troubleshooting Cheat-Sheet

| Error | Meaning | Fix |
|-------|---------|-----|
| **GET 406** with anon | RLS blocking sheet | Run migration, ensure sheet active & not expired |
| **GET 401 “No API key”** in CURL | Missing `apikey` header | Use anon key in header |
| FE 404 on `/qr/:id` | Netlify lacks SPA redirect | Add `public/_redirects` |
| Google OAuth redirects to localhost | Supabase **Site URL** wrong | Set to Netlify domain |
| GitHub OAuth 400 | Callback URL mismatch | Update GitHub app + Supabase provider |

---

## 5 Preventive Measures

* **One source of truth** – all schema edits via SQL migrations.  
* **Always list RLS roles** explicitly (`TO authenticated, anon`).  
* **CI integration test**: create sheet, fetch anonymously, ensure 200.  
* **Monitor** Supabase logs filtering `status=4xx` on `/mustersheets`.

---

### ✔ Current Status

* QR page loads instant.  
* Anyone can open `/attend/:id` and submit.  
* Creator sees entries real-time.  

Keep this doc updated with future QR or RLS changes.  
