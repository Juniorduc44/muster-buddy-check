# Netlify OAuth Authentication Troubleshooting  
**Target errors:**  
- **Google login** – `302` redirect loop (never completes)  
- **GitHub login** – `400 Bad Request`  

This guide walks you through fixing these issues for *https://mustersheets.netlify.app/* or any other Netlify-hosted front-end that uses Supabase Auth.

---

## 1 Understand the Errors

| HTTP Code | Provider | Likely Meaning |
|-----------|----------|----------------|
| **302**   | Google   | OAuth flow starts but Google redirects back to an **unauthorised** or **mismatched** URL, so Supabase immediately redirects again. Infinite loop. |
| **400**   | GitHub   | GitHub rejected the authorization request. Most common causes: wrong *Client ID/Secret* **or** callback URL not whitelisted in the GitHub OAuth App **or** Supabase provider settings. |

---

## 2 Quick Checklist

1. **Supabase Dashboard → Project → Auth → Settings → External OAuth Providers**  
   - Google & GitHub toggled **ON**  
   - **Redirect URLs** contain **exactly**  
     ```
     https://mustersheets.netlify.app/
     https://mustersheets.netlify.app/auth/v1/callback
     ```  
     (include trailing slash where shown; each on its own line)
2. **Google Cloud Console**  
   - OAuth 2.0 Client → *Authorized redirect URIs* list **must match** those above.
3. **GitHub Developer Settings → OAuth Apps**  
   - *Authorization callback URL* list includes  
     ```
     https://mustersheets.netlify.app/auth/v1/callback
     ```
4. **Supabase Dashboard → Auth → Settings → General → Site URL**  
   - Must be **`https://mustersheets.netlify.app`** (no `localhost`, no trailing slash).
5. **Netlify Environment Variables**  
   ```
   VITE_SUPABASE_URL       = https://<project>.supabase.co
   VITE_SUPABASE_ANON_KEY  = <anon key>
   ```  
   Redeploy if you changed any value.
6. Clear browser cache **or** use Incognito, then retest.

---

## 3 Step-by-Step Fix

### 3.1 Configure Google Provider in Supabase

1. Supabase → **Auth** → **Settings** → *Google*.  
2. Copy *Client ID* and *Client Secret* from Google Cloud Console.  
3. **Redirect URLs** (each on new line):  
   ```
   https://mustersheets.netlify.app/
   https://mustersheets.netlify.app/auth/v1/callback
   ```  
4. Click **Save**.

### 3.2 Update Google Cloud Console

1. API & Services → OAuth-consent → **Publishing status** = *In Production*.  
2. OAuth 2.0 Credentials → your Web client → **Authorized redirect URIs** → add the **exact** URLs above.  
3. Click **Save**.

### 3.3 Configure GitHub Provider in Supabase

1. Supabase → **Auth** → **Settings** → *GitHub*.  
2. Paste *Client ID* and *Secret* from GitHub OAuth App.  
3. Same **Redirect URLs** list as in §3.1.  
4. **Save**.

### 3.4 Update GitHub OAuth App

1. GitHub → **Settings** → **Developer settings** → **OAuth Apps** → your app.  
2. **Authorization callback URL** → set to  
   ```
   https://mustersheets.netlify.app/auth/v1/callback
   ```  
3. **Update application**.

### 3.5 Verify Supabase “Site URL” (Fixes *localhost:3000* Redirects)

If Google login sends users to **`http://localhost:3000`** after deployment, your Supabase **Site URL** is still pointing to localhost.

1. Supabase → **Auth** → **Settings** → **General**.  
2. Locate **Site URL**.  
3. Change it to your production domain **exactly**:  
   ```
   https://mustersheets.netlify.app
   ```  
   *No* trailing slash, *no* `http`, *no* `localhost`.  
4. Click **Save**. Supabase now uses this domain when it cannot infer `redirect_to`.  
5. Retest Google login. The redirect should now return to Netlify, not localhost.

---

## 4 Deploy & Test

| Step | Expected Result |
|------|-----------------|
| 1. `git push` → Netlify build. | Build succeeds, environment vars present. |
| 2. Open **Incognito** → press *Continue with Google*. | Google prompt appears, then redirects back to `/`. User is **signed in** (Supabase session token in localStorage). |
| 3. Sign out → press *Continue with GitHub*. | GitHub authorises, redirects back, user signed in. |
| 4. Supabase Dashboard → **Auth → Users**. | New user rows appear with identities `google` / `github`. |

---

## 5 Common Pitfalls

| Symptom | Fix |
|---------|-----|
| Google spins forever, network shows 302 → 302 → 302 | Redirect URL mismatch in Google Cloud *or* Supabase provider settings. |
| Google redirects to **localhost:3000** | **Site URL** in Supabase is still `http://localhost:3000`. Update to Netlify domain (see §3.5). |
| GitHub `400 Bad Request` immediately | Callback URL missing in GitHub OAuth App. |
| Works locally but not on Netlify | Forgot to add Netlify URL (including `https://`) in provider settings. |
| GitHub works in dev but not prod | Using **different** Supabase projects/keys between environments; confirm `VITE_SUPABASE_URL` & `ANON_KEY`. |
| 403 on `/auth/v1/logout` | Stale or corrupted cookies; clear site data & retry. |

---

## 6 Advanced Debug Tips

1. **Supabase Logs** → filter by `path like '/auth/v1/authorize%'`.  
2. Look for `error=redirect_uri_mismatch` (Google) or `redirect_uri` parameter rejected (GitHub).  
3. Confirm the `redirect_to` query param generated by your front-end matches the URLs saved in provider dashboards.  
4. Remember Netlify deploy previews (`https://deploy-preview-###--mustersheets.netlify.app`) need to be whitelisted separately if you test there.

---

## 7 If All Else Fails…

- Regenerate Client Secret (Google/GitHub) and update Supabase.  
- Ensure your Supabase project is **not paused** (Billing → usage).  
- Ask Supabase support with request ID from `x-request-id` response header.

Happy authenticating!  
