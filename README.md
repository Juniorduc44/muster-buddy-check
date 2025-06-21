# Welcome to your Lovable project

> **Project Name**: **Muster Buddy Check**  
> **Current Version**: **v2.0.0**

Muster Buddy Check is a lightweight attendance-tracking web application designed for colleges, clubs and events.  Attendees simply scan a QR code or click a shareable link—no account needed.

---

## Table of contents
1. Prerequisites  
2. Installation  
3. Supabase setup  
4. Environment variables  
5. Running the RLS policy script  
6. Development workflow  
7. Using the QR-code attendance flow  
8. Deployment  
9. Change log (v1.1.0 → v2.0.0)  
10. Editing options (Lovable, IDE, Codespaces)

---

## 1. Prerequisites
• Node.js (v18+) and npm or pnpm  
• A Supabase project (free tier is fine)  
• Git (optional but recommended)

## 2. Installation

```bash
git clone <YOUR_GIT_URL>
cd muster-buddy-check
# install dependencies
npm install            # or: pnpm install
```

## 3. Supabase setup
1. Create a new Supabase project.  
2. Open **SQL Editor → New Query** and run the schema located in `supabase/migrations` (all `*.sql` files).  
3. Create a **service role** API key (Settings → API).  
4. Copy the **anon/public** API key (also in Settings → API).  
5. Continue with the Environment setup below.

## 4. Environment variables
All variables live in a `.env` file (never commit secrets). A template is provided:

```bash
cp .env.example .env
# then edit .env with your keys
```

Required keys:
* `SUPABASE_URL=https://<project-id>.supabase.co`
* `SUPABASE_SERVICE_KEY=<SERVICE_ROLE_KEY>` (used **only** by the CLI script)
* `VITE_SUPABASE_ANON_KEY=<PUBLIC_ANON_KEY>` (exposed to the browser)

## 5. Running the RLS policy script
We ship an automated helper to apply Row Level Security (RLS) policies that make attendance pages public while still securing private data.

```bash
npm run apply-rls
# or: node scripts/apply-rls-policies.js
```

The script connects with your `SUPABASE_SERVICE_KEY`, enables RLS, and installs all required policies.

## 6. Development workflow

```bash
# start local dev server at http://localhost:5173
npm run dev
```

Open the site, create a muster sheet, then visit `/qr/<sheetId>` to view the auto-generated QR code.

## 7. Using the QR-code attendance flow
1. Log in (or continue as guest) and create a new muster sheet.  
2. Go to **QR Code** from the sheet card or `/qr/<sheetId>`.  
3. Download or print the QR code.  
4. Attendees scan the code or use the link `/attend/<sheetId>`.  
5. Submissions appear in real-time on the **Results** page.  

The attendance page is completely public—no Supabase account required by the attendee.

## 8. Deployment

### Lovable ✨
The easiest path: open [Lovable](https://lovable.dev/projects/066e7d8b-7097-4ef3-94ea-977294650014) → **Share** → **Publish**.  
Lovable handles build & hosting automatically.

### Vercel / Netlify / Render
1. Create a new project and point it at this repo.  
2. Add the same env vars (`VITE_…`) in the provider’s dashboard.  
3. Build command: `npm run build`  
4. Publish directory: `dist`

Remember: self-hosted CI/CD will **not** run the RLS script automatically—you must execute `npm run apply-rls` once, or run the SQL manually.

## 9. Change log

### v2.0.0 — 2025-06-21
* Public attendance pages powered by new **Row Level Security** policies  
* **QR Code** page (`/qr/:sheetId`) with copy / download / test buttons  
* NPM script **apply-rls** for one-click database policy installation  
* Improved error handling & friendly messaging on the attendance page  
* Added `.env.example` template and dotenv support  
* Upgraded dependencies (React 18.3, Supabase JS v2.50, etc.)  
* Project version bumped from **v1.1.0 → v2.0.0** in `package.json`  

### v1.1.0 → v1.1.x
Previous minor patches included small UI tweaks, guest-mode login, and performance improvements.

## 10. How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/066e7d8b-7097-4ef3-94ea-977294650014) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/066e7d8b-7097-4ef3-94ea-977294650014) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
