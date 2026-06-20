# Plan: QR scan verification (creator-only)

_Logged: 2026-06-20 · Status: FINAL, approved direction · Workspaces: frontend + data-security_

## Decisions (locked by owner)
- Scan library: **@zxing/browser** (+ @zxing/library).
- Receipt QR stays a **raw hash**. **No public verification URL.**
- Verification is **creator-only**: lives on the authenticated creator's Results page, scoped to the sheet they own, ownership enforced via Supabase RLS. Manual hash entry stays as fallback. **Never** expose attendee details on a public page.

## Why this is the right model (grounded in code)
- `ResultsPage` (`/results/:sheetId`) already: requires `user`, checks `sheet.creator_id === user.id` (else "Access Denied"), and loads ALL `musterentries` for the sheet *including* `attendance_hash` via RLS Policy 5 ("Owners can view entries").
- So a scanned hash can be matched against the already-loaded `records` array — **no new query, no RLS change, no data exposure.** Ownership + sheet-scope are already guaranteed by the page.
- The current public `/verify` page does an anon SELECT by hash that RLS blocks anyway (no anon SELECT policy on `musterentries`) — it's both broken and a privacy liability. Retire it.

## Build steps
1. `npm i @zxing/browser @zxing/library`.
2. New `src/components/QrScannerModal.tsx` (shadcn `Dialog`): three inputs —
   - **Scan (live):** `BrowserQRCodeReader.decodeFromVideoDevice` with `facingMode: environment`, `<video playsinline>`.
   - **Take photo / Upload:** `<input type="file" accept="image/*" capture="environment">` → `decodeFromImageUrl`/`decodeFromImageElement`.
   - Props: `open`, `onOpenChange`, `onDecode(text)`. Stops the stream on close/unmount.
3. Integrate into `ResultsPage`:
   - Add a "Verify a receipt (scan)" button near the records header.
   - On decode: extract a 64-char hash (accept raw hash; tolerate stray whitespace), validate with `isValidHashFormat`.
   - **Verify locally:** find a record in `records` (this owner's sheet) whose `attendance_hash === scanned`. Match → show attendee + check-in time inline (owner already sees this data on the page). No match → "Not a valid receipt for this sheet."
   - Manual text-entry fallback box that runs the same matcher.
4. Retire public exposure: remove the `/verify` route + `VerifyReceiptPage` from `App.tsx` (or convert to a redirect). Confirm no nav links point to it.
5. Edge cases: camera permission denied → fall back to upload; no camera device; no QR detected; secure-context note (camera needs HTTPS; GitHub Pages/Netlify/localhost OK, LAN http not).
6. Verify build: `npm run lint` + `npm run build`. Manual test: desktop webcam, iOS Safari, Android Chrome, file upload, bad image.
7. After landing: update `frontend/CONTEXT.md` (scanner + Results verify) and `data-security/CONTEXT.md` (public /verify retired; verify = owner-scoped local match), flip this note to "done".

## Notes
- No schema/RLS migration required. Does not alter the pre-existing issues in [[2026-06-20-rls-anon-update-exposure]] (still tracked separately).
- Keeps integrity check available: can still call `verifyAttendanceHash()` on the matched record if we want to detect a stored-hash/data mismatch, but the authoritative check is "hash belongs to an entry on your sheet."
