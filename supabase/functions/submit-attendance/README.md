# submit-attendance

Trusted public attendance submission for MusterSheets.

## Purpose

This function preserves anonymous public sign-in after attendance row reads were removed from browser access.

The older browser flow used:

1. `insert()` into `musterentries`
2. `.select()` the inserted row
3. call `generate-hash`
4. `update()` the row with `attendance_hash`

That no longer works safely once anonymous `SELECT` access is removed.

## New Pattern

1. Browser sends `sheetId` and `formData`
2. Function validates sheet state
3. Function inserts the attendance row with service-role access
4. Function generates the legacy receipt hash
5. Function updates the row with `attendance_hash`
6. Function returns only the safe response needed by the UI

## Required Secrets

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Deployment

```bash
supabase functions deploy submit-attendance
```

## Rebuild Rule

Do not switch the public attendance page back to `insert().select()` from the browser if anonymous row reads are meant to stay blocked.
