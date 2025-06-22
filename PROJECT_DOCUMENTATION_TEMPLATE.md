# Muster Buddy Check – Release v3.0.0  
*Release date: **YYYY-MM-DD***  

---

## 1  Version & Release Metadata
| Item                | Value                                   |
|---------------------|-----------------------------------------|
| **Version**         | 3.0.0                                   |
| **Previous Version**| 2.0.0                                   |
| **Release Date**    | YYYY-MM-DD                              |
| **Git Tag / SHA**   | `v3.0.0` / `<commit-sha>`               |
| **Environment**     | Production & Staging                    |
| **Migration Script**| `supabase/migrations/20250621_rls_policies.sql` |

---

## 2  Executive Summary  
v3.0.0 is a stability-focused release that makes QR-code attendance fully public, introduces GitHub single-sign-on, and eliminates the “Sheet Not Found” errors caused by table-name mismatches. It also converts Node scripts to ESM, adds comprehensive RLS policies, and updates documentation for seamless deployment on Lovable or local networks.

---

## 3  Detailed Change Log  

| Area | Change | Impact |
|------|--------|--------|
| **QR Code Flow** | • Fixed race condition in `QRCodePage.tsx` so QR renders after sheet fetch.<br>• Updated `AttendancePage` error handling for clearer messages. | Attendees can reliably scan & submit without login. |
| **Database Schema** | • Standardised table names to `mustersheets` & `musterentries` across code & SQL.<br>• Added index `idx_musterentries_sheet_id`. | Prevents 404s and improves query performance. |
| **Row Level Security** | • New explicit policies (`TO authenticated, anon`).<br>• Public `SELECT` on active sheets, public `INSERT` on entries.<br>• Creator-only `SELECT / UPDATE / DELETE` on results. | Secure public sign-in while safeguarding results. |
| **Auth Improvements** | • GitHub OAuth login in `AuthForm.tsx`.<br>• Guest mode refinements & session handling.<br>• Logout 403 resolved by correcting global scope request. | Smoother sign-in options; fewer auth errors. |
| **Scripts & Tooling** | • `scripts/apply-rls-policies.js` refactored to ES Modules, loads `.env` via `dotenv`.<br>• Added `npm run apply-rls` convenience command.<br>• `.env.example` template committed. | Easy, repeatable database policy deployment. |
| **Docs** | • New `MUSTER_BUDDY_QR_FIX.md` and `SUPABASE_SOP.md`.<br>• Expanded README with local-network QR testing, env setup, and GitHub SSO guide. | Faster onboarding & clearer troubleshooting. |
| **UX Polish** | • Dashboard, Sheet Card, Results page use consistent badges & copy.<br>• Added CSV export button. | Better visual clarity and data export convenience. |
| **Versioning** | Bumped **package.json** to `3.0.0`. | Aligns app & npm versions. |

---

## 4  Technical Changes

### 4.1  Database
* **Tables**: `mustersheets`, `musterentries` (no underscores).  
* **Indexes**: `idx_musterentries_sheet_id` for faster look-ups.  
* **RLS Policies**: see `supabase/migrations/20250621_rls_policies.sql` – 8 total policies.  
* **Script Execution**: `npm run apply-rls` (requires `SUPABASE_SERVICE_KEY`).

### 4.2  API / Front-end
* Updated Supabase queries to match new table names.  
* Added GitHub OAuth call:  
  ```ts
  supabase.auth.signInWithOAuth({ provider: 'github', options:{ redirectTo: window.location.origin }});
  ```
* All Node scripts converted to ESM (`import` syntax).

### 4.3  Dependencies
* **@supabase/supabase-js** → ^2.50.0  
* **dotenv** for local script env vars.  
* Minor bumps: React 18.3.1, Vite 5.4.1 etc.

---

## 5  Deployment / Upgrade Instructions

1. **Pull latest main**  
   ```bash
   git checkout main && git pull
   ```

2. **Install deps**  
   ```bash
   npm ci
   ```

3. **Environment**  
   * Copy `.env.example` → `.env`  
   * Fill `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_KEY`.

4. **Apply DB migration** (one-time):  
   ```bash
   npm run apply-rls      # or run SQL in Supabase dashboard
   ```

5. **Build & deploy**  
   * **Local**: `npm run dev` then access `http://<LAN-IP>:3000`.  
   * **Lovable**: push to `main`, auto-deploy triggers.

6. **Cache busting**  
   * Confirm new environment variables on hosting platform.  
   * Clear service-worker cache if QR images still stale.

---

## 6  Known Issues

| ID | Description | Workaround |
|----|-------------|------------|
| **#42** | Supabase `PGRST301` errors on very first cold start in anon mode. | Hard-refresh or retry after 2 s. |
| **#45** | Large CSV exports (>1 MB) may freeze browser tab on mobile Safari. | Export from desktop. |
| **#50** | Google OAuth occasionally conflicts with Guest mode localStorage. | Clear storage and re-login. |

---

## 7  Contributors

| GitHub Handle | Area |
|---------------|------|
| **@Juniorduc44** | Product owner, front-end |
| **@Factory-AI** | Code automation & release engineering |
| **@supabase** | Upstream library maintainers |

*(Add any additional contributors who helped on v3.0.0.)*

---

## 8  Future Roadmap

* **Offline PWA mode** – cache QR & form for poor connectivity.  
* **Custom QR styling** – brand logos & colors.  
* **Email confirmations** – send attendee confirmation emails.  
* **Role-based analytics** – separate instructor vs. TA permissions.  
* **Mobile app wrapper** – native scanning & push notifications.  

---

*End of Release v3.0.0 Template*  
