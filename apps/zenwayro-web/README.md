# zenwayro-web

Grainlet + Vite port of the Zenwayro frontend. Dev server: **http://localhost:3000**.

```bash
npm install
cp .env.example .env.local   # then fill values
npm run dev
```

## Google sign-in (required Console config)

This app uses **Google Identity Services (GIS)** in the browser via `VITE_GOOGLE_CLIENT_ID` and `grainlet/auth-sdk` (`initialize` + One Tap `prompt`, `ux_mode: popup`). That is **not** the same wire path as the Next.js app (`frontend/`), which uses **next-auth** Google OAuth (server redirect + `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`).

Use the **same OAuth 2.0 Web client ID** in both apps. Configure that one client for **both** flows:

| App | Flow | Console field that matters |
|-----|------|----------------------------|
| `apps/zenwayro-web` (this app) | GIS ID token in the browser | **Authorized JavaScript origins** |
| `frontend/` (Next.js) | next-auth redirect | **Authorized redirect URIs** |

### Checklist (Google Cloud Console)

1. Open [APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials).
2. Edit the OAuth 2.0 Client ID of type **Web application** whose ID matches `VITE_GOOGLE_CLIENT_ID` (same value as Next’s `GOOGLE_CLIENT_ID`).
3. Under **Authorized JavaScript origins**, add **exactly** (scheme + host + port, no path):
   - `http://localhost`
   - `http://localhost:3000` ← required for this Vite app
   - production origin(s) when you deploy (HTTPS only outside localhost)
4. Under **Authorized redirect URIs** (needed for Next.js next-auth, not for GIS popup):
   - `http://localhost:3000/api/auth/callback/google` (Next local)
   - production Next callback URL(s) as already configured
5. **OAuth consent screen**: if the app is in **Testing**, add your Google account under **Test users**.
6. Save. Wait 1–5 minutes for propagation, hard-refresh the app, retry.

### Port / origin notes

- Dev port is **3000** (`vite.config.js`, `strictPort: true`). An earlier Vite port (**5174**) will keep failing with `origin_mismatch` / GIS **403** unless that origin is still listed — add `http://localhost:3000` (and `http://localhost`). You may **remove** `http://localhost:5174` once nothing uses it; leaving it listed is harmless.
- `GET https://accounts.google.com/gsi/status?...` returning **403 Forbidden**, or console `[GSI_LOGGER]: The given origin is not allowed for the given client ID`, means the **current page origin** is missing from **Authorized JavaScript origins**. That is a Console fix, not an app client-id / init bug, when `VITE_GOOGLE_CLIENT_ID` matches the client in the failing URL.

### Env

- Set only `VITE_GOOGLE_CLIENT_ID` in this app (public web client ID).
- Do **not** put `GOOGLE_CLIENT_SECRET` in the Vite app; next-auth needs the secret on the Next server only.
- After changing env, restart `npm run dev`.

### What this app already does

- Loads GIS from `https://accounts.google.com/gsi/client` via `grainlet/auth-sdk`.
- Initializes with the env client ID and acquires an ID token, then `POST`s it to the backend sync endpoint (same contract as Next’s Google `signIn` callback).
- Serves `Referrer-Policy: strict-origin-when-cross-origin` from the Vite dev/preview server so GIS can see the page origin. No COOP/COEP isolation headers are set (those can break GIS popups).
