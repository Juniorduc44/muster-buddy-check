# Changelog

All notable changes to **Muster Buddy Check** will be documented in this file.  
The project adheres to [Semantic Versioning](https://semver.org/).

---

## [2.0.0] – 2025-06-21

### ✨ Added
- **Public attendance flow**
  - Implemented full set of **Row Level Security (RLS) policies** for `muster_sheets` and `attendance_records` tables, enabling:
    - Public (`anon`) _read_ access to active, non-expired sheets.
    - Public _insert_ access for attendance submissions.
    - Per-user CRUD privileges for sheet creators.
- **QR Code experience**
  - New `/qr/:sheetId` route that:
    - Generates a 300×300 PNG via api.qrserver.com.
    - Offers _Copy Link_, _Download PNG_ & _Test Page_ actions.
    - Provides usage tips and permission diagnostics.
- **RLS installer CLI**
  - Script `scripts/apply-rls-policies.js` automates enabling RLS and creating policies via the Supabase service role key.
  - Added NPM script `npm run apply-rls` for one-command execution.
- **Environment management**
  - `.env.example` template detailing required `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, and `VITE_SUPABASE_ANON_KEY`.
- **Enhanced error handling**
  - Attendance & QR pages now detect permission errors (`PGRST301`, `42501`) and display friendly “Access Restricted” messages.
  - Granular titles: *Sheet Not Found*, *Access Restricted*, *Network Error*, *Event Expired*.
- **UI/UX improvements**
  - Rich iconography (Lucide) & color-coded badges.
  - Success screen after submission with timestamp confirmation.
- **Authentication**
  - Added **“Sign in with GitHub”** OAuth flow (Supabase provider) in the Auth form, allowing creators to log in using a GitHub account.

### 🔄 Changed
- **Project version bump** to **2.0.0** in `package.json`.
- Upgraded core dependencies: React 18.3, Supabase JS 2.50, Vite 5.4, etc.
- Attendance form now derives required fields dynamically from sheet metadata and enforces name requirements.
- Time stamps honor sheet-level `time_format` (12-/24-hour).

### 🐛 Fixed
- Attendance page no longer fails silently when accessed by non-authenticated users.
- QR pages gracefully degrade if the sheet is inactive or expired.
- Clipboard copy & QR download now work across modern browsers.

### 🔥 Removed / Deprecated
- Legacy local-only attendance flow superseded by public RLS model.

### 🛠 Migration Notes
1. **Run the SQL migration** `supabase/migrations/20250621_rls_policies.sql` **or**  
   execute `npm run apply-rls` with your `SUPABASE_SERVICE_KEY`.
2. Update environment variables (`.env`) for new keys.
3. Rebuild & redeploy (`npm run build` or via Lovable/Vercel/Netlify).

---

## [1.1.1] – 2025-05-xx

_Patch release summary (for completeness):_
- Guest-mode sheet creation (localStorage flags).
- Minor UI polish and responsiveness tweaks.
- Performance optimisations in dashboard queries.

## [1.1.0] – 2025-04-xx

- Initial public release with sheet creation, dashboard and results views.

---

\* Dates are in ISO 8601 (YYYY-MM-DD). Older versions omitted for brevity.
