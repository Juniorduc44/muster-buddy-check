# Muster Buddy Check – Release Notes  
## Version 3.1.0 · “Teacher Toolkit”  

_Release date: 2025-06-24_

---

### ✨ Highlights
| Area | Summary |
| ---- | ------- |
| **Pre-loaded Templates** | Complete refresh of the built-in muster sheet presets. |
| **Class Attendance** | Teacher-focused template now ships first-class: student ID field, clearer icon, descriptive text, and auto-selected columns. |
| **Template Consistency** | All presets now share the same field IDs and descriptions used by the GUI, preventing mismatches when a user edits an existing sheet. |
| **New Presets** | Added **Military Formation** and **Family Reunion** options, plus renamed **General Event** and **Corporate Meeting** for clarity. |

---

### 🆕 New Features
| Feature | Details |
| ------- | ------- |
| **Revamped Class Attendance Template** | • Default fields: First Name, Last Name, Email, Phone, **Badge Number (Student ID)**  <br>• Tailored description for college / K-12 teachers <br>• Appears prominently in _Create Sheet_ modal with the 🎓 icon |
| **Additional Templates** | • **Military Formation** (24-hour time) <br>• **Family Reunion** (age & contact details) <br>• **Corporate Meeting** (unit / department) <br>• **Custom** template for blank slates |

---

### 🔧 Improvements & Fixes
* **GUI Synchronisation** – `CreateSheetModal` now reads from the same field list as `preloaded-sheets.ts`, eliminating missing-column errors.
* **Iconography Refresh** – New Lucide icons (`Heart`, `Building`) for quicker visual identification.
* **Field Options Array** – Centralised field metadata (`FIELD_OPTIONS`) ensures uniform validation rules across components.
* **Template IDs Standardised** – Lower-case, hyphen-free IDs (`class`, `military`, `family`, `corporate`, `event`, `custom`) to keep URLs clean.

---

### 🛠 Developer Notes
* **Branch** `main_sheets` contains all template-related commits for easy review.
* All templates are **idempotent** — editing a template in code will not break existing sheets because field IDs remain unchanged.
* Types added to `src/data/preloaded-sheets.ts` (`PreloadedSheetTemplate`) for type-safe consumption in React.

---

### 🚀 Upgrade Guide
1. **Pull latest** `main_sheets` or merge into your feature branch.  
2. `npm i && npm run dev` – hot-module reload will show new presets instantly.  
3. If you maintain custom RLS scripts, no changes are required—field IDs are untouched.  

---

### 🙌 Thank You
Special thanks to educators who provided feedback on early prototypes. Your insights shaped the new Class Attendance template.

Happy mustering!
