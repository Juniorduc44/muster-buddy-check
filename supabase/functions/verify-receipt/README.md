# verify-receipt

Trusted public receipt verification for MusterSheets.

## Purpose

This function allows the public `/verify` page to validate a receipt hash without giving browser clients direct `SELECT` access to `musterentries`.

## Security Model

- Browser sends `receiptHash`
- Function uses service-role access to look up the matching entry
- Function recomputes the expected hash
- Function returns only safe public fields

## Safe Response Fields

- `isValid`
- `sheetTitle`
- `checkedInAt`
- `attendeeNameMasked`
- `error`

## Required Secrets

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Deployment Notes

Deploy after code changes:

```bash
supabase functions deploy verify-receipt
```

Set required secrets if they are not already configured:

```bash
supabase secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
```

## Rebuild Rule

Do not replace this with direct browser queries to `musterentries`.

That would require anonymous row-read access and would break attendance privacy.
