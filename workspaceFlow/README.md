# workspaceFlow — how this workspace runs

This folder is the **workflow memory** for Muster Buddy Check, built on the three-layer folder architecture from the Foundation guides in `guides/`. It exists so any session can pick up accurate context fast and without wasting tokens.

## The flow (always starts at the root `CLAUDE.md`)
1. **Layer 1 — the map:** root `CLAUDE.md`. Identity, stack, routing table, naming, rules. Read first, every task.
2. **Layer 2 — the rooms:** one `CONTEXT.md` per workspace. The map routes each task to exactly one.
   - `frontend/` — React UI (`src/`)
   - `data-security/` — Supabase, RLS, auth, hashing
   - `ops/` — build, deploy, CI, env, branch hygiene
3. **Layer 3 — the tools:** skills/docs wired in per workspace. The reference library lives in `knowledge/`.

## Supporting folders
- `knowledge/` — cached official documentation + `INDEX.md`. **Check before searching the web.** Each tech folder has a `SOURCES.md` of official URLs to fetch on demand.
- `memory/` — dated decision/finding notes (`YYYY-MM-DD-title.md`). The durable project log.
- `guides/` — the Foundation course PDFs this workflow is built from.

## Operating rules
- **Main stays clean:** everything here + root `CLAUDE.md` lives on the `claude` branch and is never merged to `main`. Only app code ships to main (procedure in `ops/CONTEXT.md`).
- **Keep it small & current:** `CLAUDE.md` ≤ one screen; each `CONTEXT.md` ≤ one page, 80% about the work; update the `Last updated:` line when you edit one. Grow the library from real tasks, don't bulk-build.
