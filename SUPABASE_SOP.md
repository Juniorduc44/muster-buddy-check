# Supabase Standard Operating Procedure (SOP)  
*Muster Buddy Check Edition*

---

## 1. Purpose
This SOP defines the step-by-step process for safely modifying the Supabase back-end that powers the **muster-buddy-check** application.  It covers:

1. Accessing the Supabase dashboard  
2. Managing database tables & schemas  
3. Creating / updating Row-Level Security (RLS) policies  
4. Configuring authentication providers (GitHub OAuth)  
5. Handling environment variables in the codebase and CI/CD  
6. Testing & validating every change before and after deployment  

Follow these procedures to ensure data integrity, security, and a smooth developer workflow.

---

## 2. Prerequisites
| Requirement | Description |
|-------------|-------------|
| **Supabase account** | Project Owner or **Team Admin** role |
| **Service-role key** | Needed for CLI / scripts (keep secret!) |
| **Anon/public key** | Exposed to the browser, safe for client apps |
| **Local tools** | Node.js ≥ 18, npm/pnpm, Supabase CLI (optional) |
| **Repository** | `https://github.com/Juniorduc44/muster-buddy-check` cloned locally |

---

## 3. Accessing the Supabase Admin Interface
1. Log in at <https://app.supabase.com>.  
2. Select the **muster-buddy-check** project.  
3. Familiarise yourself with the left-hand menu:  

| Section | Purpose |
|---------|---------|
| **Table Editor** | Browse / edit rows, create tables & columns |
| **SQL Editor** | Run ad-hoc queries or apply migrations |
| **Authentication → Settings → External OAuth Providers** | Manage GitHub, Google, etc. |
| **Settings → API** | Retrieve URL & keys |
| **Database → Replication / RLS** | View current RLS status |

> **Tip:** Use **SQL Editor ➜ “Quick Start” ➜ “Templates”** for handy snippets.

---

## 4. Managing Tables & Schemas

### 4.1 Creating / Altering Tables
*Preferred method: migrations committed to `supabase/migrations/`.*

1. Add a new `.sql` file in the migrations folder.  
   ```sql
   -- 20250622_add_column_rank.sql
   ALTER TABLE public.muster_entries
   ADD COLUMN rank text;
   ```
2. Commit & push → CI/CD (or manual Supabase CLI) will apply the migration.

**Manual dashboard alternative**

- Table Editor → “New column” → fill details → **Save**.  
- Record the change in a new migration file afterwards to keep Git history consistent.

### 4.2 Data Types & Constraints  
- Use `uuid` PKs (`gen_random_uuid()`).  
- Foreign keys: `muster_entries.sheet_id REFERENCES muster_sheets(id)`.  
- Unique constraints where applicable (`UNIQUE (sheet_id, user_id)` if needed).  
- NEVER disable RLS once enabled (see § 5).

---

## 5. Row-Level Security (RLS)

### 5.1 Enabling RLS
```sql
ALTER TABLE public.muster_sheets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muster_entries    ENABLE ROW LEVEL SECURITY;
```

### 5.2 Muster Buddy Check Policies
| Table | Policy Name | FOR / TO | USING / WITH CHECK | Purpose |
|-------|-------------|----------|--------------------|---------|
| `muster_sheets` | Public can view sheets | SELECT TO `anon` | `true` *(optionally `is_active = true AND (expires_at IS NULL OR expires_at > now())`)* | Attendees must load sheet metadata |
| `muster_sheets` | Owners full control | ALL | `auth.uid() = owner_id` | Teachers manage their own sheets |
| `muster_entries` | Allow QR code sign-ins | INSERT TO `anon` | `EXISTS (SELECT 1 FROM muster_sheets WHERE id = sheet_id)` | Anyone may submit an entry |
| `muster_entries` | Owners can view entries | SELECT | `EXISTS (SELECT 1 FROM muster_sheets WHERE id = sheet_id AND owner_id = auth.uid())` | Teachers see all their attendees |
| `muster_entries` | Attendees see only their entry | SELECT | `(auth.uid() = user_id)` | Prevent cross-attendee snooping |
| `muster_entries` | Owners manage entries | UPDATE/DELETE | same `EXISTS` clause | Future admin UI |

**Automated install:**  
Run `npm run apply-rls` (script: `scripts/apply-rls-policies.js`).  
It authenticates with `SUPABASE_SERVICE_KEY` and executes the SQL above idempotently (skips existing policies).

### 5.3 Verifying Policies
```sql
SELECT policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN ('muster_sheets','muster_entries');
```
or Supabase Dashboard → Database → Policies.

---

## 6. Authentication Providers

### 6.1 Enabling GitHub OAuth
1. **GitHub** → Settings → Developer settings → OAuth Apps → “New OAuth App”  
   - *Homepage URL*: `https://<your-domain>`  
   - *Authorization callback URL*: `https://<your-project>.supabase.co/auth/v1/callback`  
2. Copy **Client ID** & **Client Secret**.
3. Supabase Dashboard → Authentication → Settings → **External OAuth Providers** → GitHub:  
   - Paste ID & Secret  
   - Save.  
4. In `.env` / build provider, ensure your Supabase URL & anon key are set; nothing extra needed for OAuth on the client.

### 6.2 Front-end Usage
```ts
import { supabase } from '@/integrations/supabase/client';

await supabase.auth.signInWithOAuth({
  provider: 'github',
  options: { redirectTo: `${window.location.origin}/` }
});
```
After redirect, `AuthContext` detects the new session.

---

## 7. Environment Variables

| Variable | Scope | Description |
|----------|-------|-------------|
| `SUPABASE_URL` | Node / scripts | Project REST endpoint |
| `SUPABASE_SERVICE_KEY` | Node / scripts | **Secret** admin key (never ship to client) |
| `VITE_SUPABASE_ANON_KEY` | Front-end | Public anon key |
| `NODE_ENV` / `PORT` | Build / dev server | As usual |

1. Store secrets in `.env` (ignored by Git).  
2. Local dev: `npm run dev` loads `.env` automatically via `dotenv`.  
3. CI/CD / Hosting: add the same vars in provider dashboard.

---

## 8. Testing Changes

### 8.1 Local Functional Test
1. `npm run dev -- --host`  
2. Scan QR code from phone: <http://<LAN_IP>:5173/attend/<sheetId>>  
3. Submit entry → Should succeed without login.

### 8.2 Policy Validation
```sql
-- As anon (SQL Editor ➜ “Run as anon”)
select * from muster_sheets limit 1;          -- should return rows
insert into muster_entries (...) returning *; -- should succeed
select * from muster_entries;                 -- should ERROR

-- As authenticated user (owner_id = YOUR_UID)
select * from muster_entries where sheet_id = '<id>'; -- returns rows
```

### 8.3 End-to-End (Production)
1. Deploy (Vercel/Netlify/Lovable).  
2. Confirm GitHub login works.  
3. Create sheet, scan QR, submit, view results.  

---

## 9. Rollback / Disaster Recovery
- Keep database [point-in-time recovery] enabled (Supabase Settings → Database Backups).  
- Each migration file is reversible; create `DROP POLICY` / `ALTER TABLE ... DROP COLUMN` statements if needed.  
- In emergencies: disable `ENABLE ROW LEVEL SECURITY` **only temporarily**, or toggle policies to `WITH CHECK (false)` for quick lock-down.

---

## 10. Change Management & Versioning
- **Branch strategy**: all code merges to **main** → triggers auto-deploy.  
- Each Supabase change **must** be represented by a migration file committed to `supabase/migrations/`.  
- Update `CHANGELOG.md` under the heading for the next version.  
- Tag releases (`git tag v2.0.1 && git push --tags`).  

> **Automated Push Policy**: Every modification committed locally should `git push origin main` immediately (CI enforces lint & build). No manual confirmation dialogue.

---

## 11. Appendix A – Common SQL Snippets
```sql
-- Create uuid default
ALTER TABLE public.muster_entries
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Soft-delete helper
UPDATE muster_entries SET deleted_at = now() WHERE id = '...';
```

---

## 12. Appendix B – Useful links
- Supabase docs: <https://supabase.com/docs>  
- RLS guide: <https://supabase.com/docs/guides/auth/row-level-security>  
- GitHub OAuth callback setup: <https://supabase.com/docs/guides/auth/social-login/github>  
- Muster Buddy Check repo: <https://github.com/Juniorduc44/muster-buddy-check>  
