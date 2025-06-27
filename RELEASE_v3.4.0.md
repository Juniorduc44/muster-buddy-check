# 📢 Muster Buddy Check – Release v3.4.0  
*Release date: 2025-06-27*

> Fast, QR-powered attendance for classrooms, events, and formations.  
> This milestone brings powerful sheet-management tools, a refreshed onboarding flow, and dozens of quality fixes.

---

## ✨ New Features

| Area | Description |
|------|-------------|
| **Sheet Cloning** 🔄 | • “Clone” button on every sheet card.<br>• Duplicates title, description, required fields, time format, expiry & active state.<br>• New copy is immediately *Active* so you can publish its QR code in seconds. |
| **Sheet Editing** ✏️ | • *Edit* button appears only on **active + non-expired** sheets.<br>• Opens `/edit/{sheetId}` with a full form to update title, description, required fields, time format, expiry, and active flag.<br>• Live Supabase validation & toast confirmations. |
| **Revamped Login & Onboarding** 🎨 | • Split-screen login page with brand panel + compact auth box.<br>• First-visit splash with larger logo and multi-step tour.<br>• “Don’t show again” stored in `localStorage`. |
| **GitHub OAuth** 🔑 | Added **Sign in with GitHub** via Supabase Auth, alongside email & Google. |

---

## 🛠 Improvements & Fixes

| Category | Highlights |
|----------|------------|
| **Templates** | • Icons moved from `preloaded-sheets.ts` → **`preloaded-sheets.tsx`** to support JSX.<br>• Created bridge file `preloaded-sheets.ts` to re-export, preventing build errors.<br>• Added *badge_number* (Student ID) to Class template and aligned field lists. |
| **Conditional Edit Button** | Disabled on expired or inactive sheets to prevent accidental edits. |
| **Public Attendance Flow** | Fixed “Sheet Not Found” errors when scanning QR from anonymous devices by updating RLS policies and improving error messages. |
| **Row-Level Security Helper** | New **`scripts/apply-rls-policies.js`** (ESM) + SQL migrations.<br>Run `npm run apply-rls` once to expose public attendance endpoints securely. |
| **Local LAN Testing** | README now explains `vite --host`, finding your IP, and scanning QR from phones on the same Wi-Fi. |
| **UI Polish** | Larger splash logo, consistent Lucide icons, cleaner hover states, color-coded badges, unified toast messages. |
| **House-Keeping** | • Added `.env.example` + `.gitignore` update.<br>• Updated package.json scripts (`apply-rls`, `build:dev`).<br>• Browserslist DB update reminder.<br>• Vulnerability audit hint (`npm audit fix`). |

---

## 🔧 Developer Notes

- **Breaking**: If you previously imported from `src/data/preloaded-sheets.ts`, keep using the same path—the new bridge file handles it automatically.
- **RLS Migration**: Ensure your Supabase project has run both migration files in `supabase/migrations/*` or execute `npm run apply-rls`.
- **Environment**: Add `GITHUB_CLIENT_ID` and `GITHUB_SECRET` to Supabase and `.env`.
- **LAN Dev**: `npm run dev -- --host` exposes Vite on your local network.

---

## ⬆️ Upgrade Steps

```bash
# 1. Pull latest main
git checkout main && git pull

# 2. Install updated deps
npm install

# 3. Apply (or re-apply) RLS policies
npm run apply-rls   # requires SUPABASE_SERVICE_KEY

# 4. Add GitHub OAuth env vars
echo "VITE_GITHUB_CLIENT_ID=..." >> .env
echo "VITE_GITHUB_SECRET=..." >> .env
```

---

## 🚀 Contributors

Thanks to everyone who reported issues, tested QR flows on real classrooms, and reviewed PRs for this release. Your feedback drives Muster Buddy Check forward. 🙌

---

_Happy mustering!_ 🎓
