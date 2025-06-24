# 🎉 Muster Buddy Check v3.2.0 Release Notes

_Release date: 2025-06-24_

Welcome to **v3.2.0**!  This is a polish & stability update focused on bug-fixes discovered after the 3.1.0 “Teacher Toolkit” drop, plus a small round of documentation and environment-setup tweaks.  No breaking changes — just a smoother experience. 🛠️✨

---

## 🐞 Bug Fixes
| Fix | Impact |
| --- | ------ |
| **QR Code & Attendance** 📱 | Resolved *“Sheet Not Found”* / blank-screen issues when anonymous users visited attendance links on mobile & incognito browsers.  |
| **URI Malformed** 🛠️ | Fixed a Vite dev-server crash caused by an invalid `decodeURI` call during hot-module reload. |
| **UI Tweaks** 🎨 | Removed accidental white backgrounds on icon buttons and unified toast messaging for copy-link actions. |

---

## 📚 Documentation
* **README** – Added QR-code LAN-testing tips and local network advice.  
* **CHANGELOG** – Now tracks changes through v3.2.0.  
* **.env.example** – New template plus security guidance for service-role keys.

---

## ⚙️ Environment & Configuration
- Added `.env.example` template for safer local setup.  
- `.gitignore` updated to exclude local credential files.  
- `apply-rls` npm script ensures RLS stays in sync during deployments.

---

## 🔮 What’s Next
1. **Analytics Dashboard Revamp** – Live charts for attendance trends & CSV export. 📊  
2. **Preset Library** – Share and browse muster sheet templates in a community gallery. 📚  
3. **Role-Based Permissions** – Granular roles (TA, assistant) with custom access scopes. 🛡️  
4. **Offline Mode (PWA)** – Capture sign-ins without connectivity; sync when back online. 📶  
5. **Accessibility Enhancements** – WCAG 2.1 AA color contrast & keyboard-first navigation. ♿

Stay tuned!

---

Thank you to all contributors and testers who helped make this release possible. Have feedback? [Open an issue](https://github.com/Juniorduc44/muster-buddy-check/issues) or join the discussion on our community channel.

_Happy mustering!_ 🎓
