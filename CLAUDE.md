# Muster Buddy Check — Workspace Map

**MusterSheets / Muster Buddy Check** — a public, QR-based attendance web app. Attendees scan a QR code or open a link and sign in with no account; organizers create sheets, view results, and verify signed receipts. Live on GitHub Pages (`juniorduc44.github.io/muster-buddy-check`) and Netlify.

**Stack:** Vite · React 18 + TypeScript · React Router · TanStack Query · Tailwind + shadcn-ui (Radix) · Supabase (Postgres + RLS + Edge Functions) · `qrcode`. Path alias `@/` → `src/`. Dev server runs on port **8080**.

## Read this map first on every task, then route:

| Task | Read context | Work in | Reference docs |
|------|--------------|---------|----------------|
| UI, components, pages, styling, routing | `workspaceFlow/frontend/CONTEXT.md` | `src/` | `knowledge/react/`, `knowledge/tailwind-shadcn/` |
| DB, RLS, auth, edge functions, hashing | `workspaceFlow/data-security/CONTEXT.md` | `supabase/`, `*.sql`, `scripts/`, `src/integrations/`, `src/lib/hash-utils.ts` | `knowledge/supabase/` |
| Build, deploy, CI, env vars | `workspaceFlow/ops/CONTEXT.md` | `vite.config.ts`, `deploy.sh`, `.github/`, `package.json` | `knowledge/vite/` |
| Recall or add documentation | `workspaceFlow/knowledge/INDEX.md` | `workspaceFlow/knowledge/` | — |

## Rules
- **Memory before web.** Check `workspaceFlow/knowledge/INDEX.md` before searching the internet. If a needed doc is missing, fetch it from the official source, save it under `knowledge/<tech>/`, and add a line to `INDEX.md`. Local + GitHub are the memory — don't re-search what's already cached.
- **Main stays clean.** All of `workspaceFlow/` plus this `CLAUDE.md` are workflow memory. They live on the **`claude`** branch and are **never** merged to `main`. Only real app changes (`src/`, `supabase/`, `public/`, configs) go to main. See `workspaceFlow/ops/CONTEXT.md` for the merge procedure.
- Match the surrounding code style. Ask before creating files outside the routed work folder.
- Keep this map to one screen. All detail lives in the workspace `CONTEXT.md` files.

## Naming conventions
- React components `PascalCase.tsx` · hooks `use-kebab.ts(x)` · utils/libs `kebab-case.ts`
- SQL migrations `YYYYMMDD_short_description.sql` in `supabase/migrations/`
- Decision notes `workspaceFlow/memory/YYYY-MM-DD-title.md`
- Cached docs `workspaceFlow/knowledge/<tech>/<topic>.md`

_Last updated: 2026-06-20_
