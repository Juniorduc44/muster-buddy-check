# Frontend Workspace

_Last updated: 2026-06-20_

The React web interface. This is where the UI, pages, routing, and styling live.

## What's here (in `src/`)
- `main.tsx` → mounts `App.tsx`. `App.tsx` wires providers (TanStack Query, Tooltip, Toaster/Sonner, `AuthProvider`) and the `BrowserRouter` route table.
- `pages/` — route screens:
  - `Index.tsx` (`/`) — landing + dashboard entry
  - `AttendancePage.tsx` (`/attend/:sheetId`) — **public, no auth**; attendee sign-in form
  - `ResultsPage.tsx` (`/results/:sheetId`) — organizer results view
  - `QRCodePage.tsx` (`/qr/:sheetId`) — generates/downloads the QR code
  - `EditSheetPage.tsx` (`/edit/:sheetId`) — edit a sheet
  - `VerifyReceiptPage.tsx` (`/verify`) — **public**; verify an attendance hash
  - `NotFound.tsx` (`*`)
- `components/` — app components (`Dashboard`, `Header`, `AuthForm`, `CreateSheetModal`, `MusterSheetCard`, `OnboardingModal`).
- `components/ui/` — shadcn-ui primitives (Radix). **Generated — don't hand-edit** unless changing the design system; re-add via the shadcn CLI (`components.json`).
- `contexts/AuthContext.tsx` — Supabase auth state, guest mode.
- `hooks/`, `lib/utils.ts` (the `cn()` helper), `data/preloaded-sheets.*`.

## How work flows here
1. Routing changes → `App.tsx`. 2. New screen → add a `pages/*.tsx` + route. 3. Reusable piece → `components/`. 4. Styling → Tailwind classes + tokens in `tailwind.config.ts` / `src/index.css`; compose classes with `cn()`.

## Conventions
- Imports use the `@/` alias (`@/components/...`), never long relative paths.
- Components `PascalCase.tsx`; hooks `use-kebab`. Keep data access in hooks/contexts, not inline in JSX.
- Data layer is Supabase via `@/integrations/supabase/client`. Anything touching the DB, RLS, or auth rules → switch to the **data-security** workspace.

## What good looks like
Type-checks clean (`npm run lint`, `tsc`), uses existing ui primitives before adding new ones, public pages (`/attend`, `/verify`) never assume a logged-in user, responsive (mobile attendees scanning QR codes are the primary audience).

## Avoid
Editing `components/ui/*` by hand · introducing a second styling system · breaking the public/protected route split · adding heavy deps when a Radix/shadcn primitive already exists.
