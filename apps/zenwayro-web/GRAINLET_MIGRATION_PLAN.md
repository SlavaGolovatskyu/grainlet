# Zenwayro → Grainlet migration plan

Source: `frontend/` (Next.js 15 App Router, React 19). Target: `apps/zenwayro-web` (Vite + Grainlet SPA). The Next app stays runnable and is not edited.

## Why this target

Grainlet apps in this repo are Vite workspaces under `apps/` (`github-lookup`, `ssr-demo`, `create-grainlet` template). `frontend/` is Next (RSC, `next-auth` middleware, OpenNext). Migrating in place would leave one tree on two frameworks. `apps/zenwayro` is deleted in the dirty tree and the root `vite.config.js` still points at it; do not restore those files or edit that config.

Run the new app from `apps/zenwayro-web` with `npm run dev` (port **5174**). Do not `npm install` at the repo root; `grainlet`, `grainlet-vite`, and `vite` already resolve from the monorepo `node_modules`.

## What stays vs what is rewritten

Stays (copied or called as-is): backend HTTP contracts, `API_URL` default `http://localhost:3001` (`VITE_API_URL`), locale JSON text, later CSS tokens and `maplibre-gl` / `pmtiles`.

Rewritten: every React/Next component, Radix, dnd-kit, motion, react-day-picker, lucide-react, TanStack Query, next-auth, RSC, middleware, Next API routes (`/api/auth`, revalidate, IndexNow). SEO (`sitemap.ts`, JSON-LD, pixels) waits for an explicit `grainlet/ssr` pass.

Grainlet imports only from subpaths. Provider order: **Auth → I18n → Query → Router**. JSX uses `class`, signal reads are `count()`, no React hooks, no `'use client'`.

## i18n and auth contracts to preserve

- Locales: `frontend/src/lib/i18n/locales/en.json` top-level keys are namespaces (`common`, `nav`, `home`, …). React `t("home.heroTitle")` splits on the first dot. Grainlet `useTranslation(ns)` is namespace-scoped. Load the JSON as `resources.en[namespace]`, rewrite `{{name}}` → `{name}` at load (Grainlet `interpolate` uses single braces; 46 strings use double braces). Persist locale in `localStorage` key `zenwayro-locale`.
- Theme flash script before paint: `localStorage` key `zenwayro-theme` (`dark` | `system` | else light), same as `frontend/src/app/layout.tsx`.
- Auth HTTP (`frontend/src/lib/api/contracts/auth/auth.paths.ts`), base `API_URL`:
  - credentials `POST /api/auth/login` `{ email, password }` → `{ userId, email, accessToken, refreshToken }`
  - Google `POST /api/auth/sync` `{ provider: "google", idToken }`
  - refresh `POST /api/auth/refresh` `{ userId, refreshToken }`
- Session storage key `zenwayro.auth.session` via `createLocalStorageAdapter`.
- Query defaults from the Next app: `staleTime: 0`, `gcTime: 0`, `refetchOnWindowFocus: false`, retry while `failureCount < 1` and status is not 401.
- Middleware (`frontend/src/middleware.ts`) sends anonymous users to `/`, not `/auth/signin`. `ProtectedRoute` uses `redirectTo="/"`.

## Public vs protected paths

Public exact: `/`, `/terms`, `/privacy`, `/contact`, `/cookies`, `/explore`, `/quiz`, `/auth`.
Public prefixes: `/auth/`, `/plan/shared/`, `/popular-trips`, `/plan/`.
Everything else (trips, settings, admin) is protected. `/plan/*` is public at the edge today; page-level auth comes with the plan module.

## Module sequence

| # | Module | React today | Grainlet target | Depends on | Risk | Status |
|---|--------|-------------|-----------------|------------|------|--------|
| 1 | Foundation | `layout.tsx`, `Providers`, middleware path gate | Vite bootstrap, auth/i18n/query clients, flat `Router`, placeholder routes, shell nav | — | medium | done |
| 2 | API client | `src/lib/api` + `contracts/` | plain `src/api` fetch client + copied path/type contracts | 1 | low | done |
| 3 | Chrome + tokens | `AppChrome`, `Navbar`, `Footer`, `design-system/tokens` | shell layout + copied CSS variables; Radix primitives later | 1 | high | not started |
| 4 | Auth pages | `app/auth/*`, `useSignInForm` etc. | `grainlet/forms` + `session.signIn` | 1–2 | high | not started |
| 5 | Legal | contact, cookies, privacy, terms | static routes using copied copy | 1, 3 | low | not started |
| 6 | Home | RSC `page.tsx` + `HomePageV2` | client page; `useQuery` popular-trips preview | 2, 3 | medium | not started |
| 7 | Explore | map, infinite POIs | `useInfiniteQuery` + maplibre (not React) | 2, 3 | high | not started |
| 8 | Quiz | `QuizFlow` | signals + forms | 2, 4 | medium | not started |
| 9 | Trips | protected list | `ProtectedRoute` + `useQuery` | 2, 4 | medium | not started |
| 10 | Popular trips | ISR + slug routes | client routes first; SSR later | 2, 3 | high | not started |
| 11 | Plan | map, dnd, mutations, wizard | `grainlet/store` + query + map | 2, 4, 7 | very high | not started |
| 12 | Settings | protected forms | forms + session | 4 | medium | not started |
| 13 | Admin | CRUD pages | query + forms, role gate | 2, 4 | high | not started |
| 14 | Notifications | `NotificationsProvider` | query + signals | 2, 4 | medium | not started |
| 15 | SEO / pixels / Next API | metadata, sitemap, analytics | `grainlet/ssr` follow-up; not part of the SPA cutover | 6, 10 | high | not started |

Wire TypeScript types remain in `frontend/src/lib/api/contracts` until a feature module needs them.

## Verification

Per module: `node --test` for pure helpers, `npm run build` in `apps/zenwayro-web`, then browser on port 5174 (navigate, not a single screenshot). Next app tests stay in `frontend/` (`npm test` there) and are not the Grainlet suite.

## Out of scope for every module

Do not edit `frontend/`, repo-root `vite.config.js`, `package-lock.json`, `apps/zenwayro/**`, `apps/bench`, `apps/examples`, or `packages/create-grainlet`. Do not commit.
