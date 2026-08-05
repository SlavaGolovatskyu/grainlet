# Grainlet Auth

Headless, reactive authentication primitives for Grainlet applications. The
package offers Auth.js-like session ergonomics without depending on Next.js or
`next-auth`; your application remains responsible for its API endpoints,
cookies, OAuth SDK, and account screens.

```js
import {
  AuthProvider,
  Credentials,
  Google,
  createAuth,
  createLocalStorageAdapter,
} from 'grainlet/auth';

const auth = createAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: (credentials) =>
        api.post('/api/auth/login', credentials),
    }),
    Google({
      // Connect your preferred Google Identity Services integration here.
      getIdToken: () => googleIdentity.getIdToken(),
      authorize: ({ idToken }) =>
        api.post('/api/auth/sync', {
          provider: 'google',
          idToken,
        }),
    }),
  ],
  refresh: ({ userId, refreshToken }) =>
    api.post('/api/auth/refresh', { userId, refreshToken }),
  storage: createLocalStorageAdapter(),
});

render(
  () => (
    <AuthProvider client={auth}>
      <App />
    </AuthProvider>
  ),
  document.getElementById('app')
);
```

Provider and refresh callbacks return a session with a `user` object:

```js
{
  user: { id: 'user-1', email: 'user@example.com' },
  accessToken: '...',
  refreshToken: '...',
  isNewUser: false
}
```

For compatibility with common API responses, `userId` and `email` at the top
level are also normalized into `session.user`.

## Session API

`useSession()` returns a Grainlet auth client. State fields are accessors and
must be called:

```js
import { Show } from 'grainlet';
import { useSession } from 'grainlet/auth';

function AccountMenu() {
  const session = useSession();

  return (
    <Show
      when={() => session.status() === 'authenticated'}
      fallback={<button onClick={() => session.signIn('google')}>Sign in</button>}
    >
      <span>{() => session.data()?.user.email}</span>
      <button onClick={() => session.signOut()}>Sign out</button>
    </Show>
  );
}
```

The client exposes:

- `data()` — current session or `null`
- `status()` — `loading`, `authenticated`, or `unauthenticated`
- `error()` — the latest `AuthError` or `null`
- `signIn(providerId, input)` and `signOut()`
- `getSession({ forceRefresh })`, `refresh({ force })`, and `update(patch)`
- `initialize()` for explicit hydration and `dispose()` for manual clients

`AuthProvider` initializes the client and disposes its refresh timer when
unmounted.

## Protected routes

`ProtectedRoute` renders its children only for an authenticated session. By
default it redirects to `/auth/signin`, replaces browser history, and preserves
the current URL in a `callbackUrl` query parameter.

```js
import { ProtectedRoute } from 'grainlet/auth';

function SettingsRoute() {
  return (
    <ProtectedRoute
      redirectTo="/auth/signin"
      loadingFallback={<p>Checking session…</p>}
      unauthenticatedFallback={<p>Redirecting…</p>}
    >
      <Settings />
    </ProtectedRoute>
  );
}
```

Use `redirectTo={false}` for a render-only guard. `basename`, `callbackParam`,
`preserveCallback`, and `replace` customize navigation.

## Refresh behavior

JWT access-token expiry is read from `exp` and reduced by a one-minute safety
buffer. Opaque tokens use a 14-minute fallback. Refreshes sharing the same user
and refresh token are deduplicated.

HTTP-style status `401` and `403` errors are terminal by default. Other errors
keep the current session and retry after 30 seconds, up to three failures.
Override `isRefreshErrorNonRecoverable`, `retryRefreshAfterMs`, and
`maxRefreshErrors` for another API error model. Set `autoRefresh: false` when
refreshing is controlled elsewhere.

## Storage and security

The default storage is memory-only and SSR-safe. It does not survive a page
reload. `createLocalStorageAdapter()` opts into browser persistence:

```js
createLocalStorageAdapter({ key: 'my-app.auth' });
```

Local storage tokens are readable by JavaScript and therefore exposed by an
XSS vulnerability. Prefer secure, HTTP-only cookies when your backend can own
the session. A custom adapter can bridge any storage mechanism:

```js
const storage = {
  getSession: async () => loadSession(),
  setSession: async (session) => saveSession(session),
  clearSession: async () => removeSession(),
};
```

All adapter methods may be synchronous or asynchronous. On the server, create
an auth client per request; do not share a mutable client between users.

## Auth.js concept mapping

- `NextAuth({...})` → `createAuth({...})`
- `SessionProvider` → `AuthProvider`
- `useSession()` → `useSession()` with Grainlet accessors
- `signIn()` / `signOut()` → methods on the auth client
- Credentials and Google providers → callback-based `Credentials()` and
  `Google()` factories
- JWT callback refresh logic → the `refresh` callback and refresh options
- Next.js middleware → `ProtectedRoute` for client routing

This package is headless: registration, password reset, email verification,
roles, and account UI stay in the application and can use `update()` after
changing the current user.
