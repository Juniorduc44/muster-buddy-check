# Ops Workspace

_Last updated: 2026-06-20_

Build, environment, deployment, CI, and branch hygiene.

## Build & run
- Package manager: npm (also has `bun.lock`). Node 18 (matches CI).
- `npm run dev` — Vite dev server on **:8080** (`--host` to expose on LAN for phone QR testing).
- `npm run build` — production build to `dist/`. `npm run build:dev` for dev-mode build. `npm run preview` to serve `dist/`.
- `npm run lint` — ESLint (`eslint.config.js`).

## Environments / deploy targets
- **GitHub Pages** (primary): `.github/workflows/main.yml` builds on push to `main` and deploys `dist/` via Pages. `homepage` in `package.json` + base path matter for asset URLs. Manual path: `npm run deploy` (gh-pages → `dist`). `predeploy` sets `VITE_GITHUB_PAGES=true`.
- **Netlify**: `public/_redirects` provides SPA fallback. See root `NETLIFY_AUTH_TROUBLESHOOTING.md`.
- Two CI workflows exist (`main.yml`, `npm-deploy-pages.yml`) — they overlap; consolidate when touched.

## Env vars (`.env`, template in `.env.example`)
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (server/CLI only — **never** in client), `VITE_SUPABASE_ANON_KEY` (browser-safe). Vite only exposes `VITE_`-prefixed vars.

## Branch hygiene — keep `main` clean (project rule)
Workflow memory must not pollute `main`. The scaffolding — `CLAUDE.md` and the entire `workspaceFlow/` tree — stays on the **`claude`** branch only.
When shipping a real app change to `main`:
1. Make/commit the change on `claude`.
2. Merge to main **selectively** — `git checkout main && git checkout claude -- <app paths>` (e.g. `src/ supabase/ public/ package.json`), then commit. Do **not** `git merge claude` wholesale (that would drag in `workspaceFlow/` and `CLAUDE.md`).
3. Confirm `git diff main claude -- workspaceFlow CLAUDE.md` shows the scaffolding only ever exists on `claude`.

## What good looks like
`npm run build` passes before any push to main · secrets stay out of the repo and the client bundle · deploy artifact is `dist/` · `main` contains only app/web files.

## Avoid
Pushing `workspaceFlow/` or `CLAUDE.md` to `main` · committing `.env` or the service key · changing the Pages base path without re-testing asset URLs.
