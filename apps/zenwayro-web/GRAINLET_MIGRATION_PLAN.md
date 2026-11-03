# Zenwayro → Grainlet migration plan

Checkpoint: page modules below are implemented and routed in `src/App.jsx`. Unit tests and `vite build` pass. Full browser verification of every flow was not finished. Host-element JSX constants are wrapped by `vite/jsx-const-accessors.js` so Grainlet does not call them as signals.

Source: `frontend/` (read-only parity). Target: `apps/zenwayro-web` (Vite + Grainlet). Do not edit `frontend/`, `packages/grain`, or `packages/create-grainlet`.

Provider order: Auth → I18n → Query → Router. Tailwind v4 and design tokens load from `src/styles/globals.css`. API base: `VITE_API_URL` or `http://localhost:3001`. Session key `zenwayro.auth.session`. Protected routes redirect to `/`.

Splat params: `useParams()['*']`. Named params: `useParams().id`.

Wire TypeScript types stay in `frontend/src/lib/api/contracts` until a page needs a field; path helpers live in `src/api/paths`.

## Acceptance (every row)

A row is done only when the Grainlet page loads real data or the real form, preserves validation, loading, error, and empty states, auth guards, and the source actions. A title-only placeholder, TODO, or dead control is not done.

## Route matrix

| Source route | Target file | Access | Status |
|---|---|---|---|
| `/` | `src/pages/home/HomePage.jsx` | public | not started |
| `/explore` | `src/pages/explore/ExplorePage.jsx` | public | not started |
| `/quiz` | `src/pages/quiz/QuizPage.jsx` | public | not started |
| `/terms` | `src/pages/legal/TermsPage.jsx` | public | not started |
| `/privacy` | `src/pages/legal/PrivacyPage.jsx` | public | not started |
| `/contact` | `src/pages/legal/ContactPage.jsx` | public | not started |
| `/cookies` | `src/pages/legal/CookiesPage.jsx` | public | not started |
| `/auth/signin` | `src/pages/auth/SignInPage.jsx` | public | done |
| `/auth/signup` | `src/pages/auth/SignUpPage.jsx` | public | not started |
| `/auth/forgot-password` | `src/pages/auth/ForgotPasswordPage.jsx` | public | not started |
| `/auth/reset-password` | `src/pages/auth/ResetPasswordPage.jsx` | public | not started |
| `/auth/verify` | `src/pages/auth/VerifyPage.jsx` | public | not started |
| `/auth/verify-pending` | `src/pages/auth/VerifyPendingPage.jsx` | public | not started |
| `/popular-trips` | `src/pages/popular/PopularTripsPage.jsx` | public | not started |
| `/popular-trips/browse` | `src/pages/popular/PopularBrowsePage.jsx` | public | not started |
| `/popular-trips/*` | `src/pages/popular/PopularTripPage.jsx` | public | not started |
| `/plan/new` | `src/pages/plan/PlanPage.jsx` (`id=new`) | public | not started |
| `/plan/:id` | `src/pages/plan/PlanPage.jsx` | public edge | not started |
| `/plan/shared/*` | `src/pages/plan/SharedPlanPage.jsx` | public | not started |
| `/trips` | `src/pages/trips/TripsPage.jsx` | protected | not started |
| `/settings` | `src/pages/settings/SettingsPage.jsx` | protected | not started |
| `/admin` | `src/pages/admin/AdminHomePage.jsx` | protected | not started |
| `/admin/images` | `src/pages/admin/AdminImagesPage.jsx` | protected | not started |
| `/admin/ai-enrichment` | `src/pages/admin/AdminAiEnrichmentPage.jsx` | protected | not started |
| `/admin/article-import` | `src/pages/admin/AdminArticleImportPage.jsx` | protected | not started |
| `/admin/article-import/runs` | `src/pages/admin/AdminArticleImportRunsPage.jsx` | protected | not started |
| `/admin/article-import/runs/:runId` | `src/pages/admin/AdminArticleImportRunPage.jsx` | protected | not started |
| `/admin/cities/create` | `src/pages/admin/AdminCityCreatePage.jsx` | protected | not started |
| `/admin/users` | `src/pages/admin/AdminUsersPage.jsx` | protected | not started |
| `/admin/entities` | `src/pages/admin/AdminEntitiesPage.jsx` | protected | not started |
| `/admin/entities/:entityKey` | `src/pages/admin/AdminEntityPage.jsx` | protected | not started |
| `/admin/entities/:entityKey/new` | `src/pages/admin/AdminEntityEditPage.jsx` | protected | not started |
| `/admin/entities/:entityKey/:recordId` | `src/pages/admin/AdminEntityEditPage.jsx` | protected | not started |
| unmatched | `src/chrome/NotFoundPage.jsx` | public | not started |
| notifications bell (no route) | `src/chrome/Notifications.jsx` | session | not started |
| navbar, bottom nav, footer | `src/chrome/AppChrome.jsx` | shell | not started |

## Module order

Chrome and legal/auth/home can land together because they own separate directories. Explore, plan, and popular trips own maps and must not edit each other's files. `App.jsx` is wired by the lead after each module exports its page components.

## Verification

`npm test` and `npm run build` in `apps/zenwayro-web`. Browser: every route family, loading/error/empty, and one mutation path. Dev server port 3000.
