# grainlet/auth-sdk

Batteries-included Google, Apple, and GitHub sign-in for `grainlet/auth`.
The SDK loads provider browser libraries, acquires tokens or authorization
codes, and sends them to your backend for verification and session creation.

## Setup

```js
import {
  createAuth,
  AuthProvider,
  createLocalStorageAdapter,
} from 'grainlet/auth';
import {
  createAuthSdk,
  GoogleSignIn,
  AppleSignIn,
  GitHubSignIn,
} from 'grainlet/auth-sdk';

const sdk = createAuthSdk({
  baseUrl: '/api/auth',
  google: {
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  },
  apple: {
    clientId: import.meta.env.VITE_APPLE_CLIENT_ID,
    redirectURI: `${window.location.origin}/auth/apple/callback`,
  },
  github: {
    clientId: import.meta.env.VITE_GITHUB_CLIENT_ID,
    redirectUri: `${window.location.origin}/auth/github/callback`,
    scope: 'read:user user:email',
  },
});

export const auth = createAuth({
  providers: [
    GoogleSignIn(sdk),
    AppleSignIn(sdk),
    GitHubSignIn(sdk),
  ],
  refresh: sdk.refresh,
  storage: createLocalStorageAdapter(),
});
```

Mount the existing auth provider as usual:

```jsx
<AuthProvider client={auth}>
  <App />
</AuthProvider>
```

Then sign in from any user gesture:

```jsx
<button onClick={() => auth.signIn('google')}>Continue with Google</button>
<button onClick={() => auth.signIn('apple')}>Continue with Apple</button>
<button onClick={() => auth.signIn('github')}>Continue with GitHub</button>
```

The SDK also provides `sdk.signInGoogle(auth)`, `sdk.signInApple(auth)`, and
`sdk.signInGitHub(auth)` convenience methods.

## Backend contract

The browser cannot safely verify identity tokens or hold a GitHub client
secret. Your server must implement these JSON endpoints:

| Method | Default path | Request body |
|--------|--------------|--------------|
| `POST` | `/api/auth/google` | `{ "idToken": "..." }` |
| `POST` | `/api/auth/apple` | `{ "idToken": "...", "user": { ... } }` |
| `POST` | `/api/auth/github` | `{ "code": "...", "state": "...", "redirectUri": "..." }` |
| `POST` | `/api/auth/refresh` | `{ "userId": "...", "refreshToken": "..." }` |

Google and Apple routes verify the ID token with the provider. The GitHub
route exchanges the code using the server-only client secret. Each sign-in
route returns a Grainlet session:

```json
{
  "user": {
    "id": "user-1",
    "email": "user@example.com",
    "name": "Grain User"
  },
  "accessToken": "app-access-token",
  "refreshToken": "app-refresh-token",
  "expiresAt": 1786057200000
}
```

The refresh endpoint may return a full session or a partial session update.
Non-2xx JSON responses can include `{ "code": "...", "message": "..." }`;
the SDK preserves the code, message, and HTTP status.

Override routes when needed:

```js
createAuthSdk({
  baseUrl: '/v1/session',
  endpoints: {
    google: '/oauth/google',
    apple: '/oauth/apple',
    github: '/oauth/github',
    refresh: '/token/refresh',
  },
});
```

Absolute endpoint URLs are supported. `headers`, `credentials`, and a custom
`fetch` implementation can also be supplied.

## GitHub callback

Register the exact `redirectUri` with your GitHub OAuth App. That route must
send GitHub's query parameters back to the opener:

```js
import { completeGitHubSignIn } from 'grainlet/auth-sdk';

completeGitHubSignIn({
  targetOrigin: window.location.origin,
});
```

`completeGitHubSignIn` posts the code, state, or OAuth error to the original
window and closes the popup. The SDK validates the state before sending the
code to your backend. Popup blocking, early close, state mismatch, and timeout
are reported as `AuthSdkError`.

## Provider configuration

### Google

Create a Google web client ID and add your site to its authorized JavaScript
origins:

```js
google: {
  clientId: '...',
  autoSelect: false,
  hostedDomain: 'example.com',
}
```

The SDK loads Google Identity Services and uses its popup/One Tap prompt. A
pre-acquired token can be supplied with
`auth.signIn('google', { idToken })`.

### Apple

Create a Services ID, enable Sign in with Apple, and register the exact HTTPS
return URL:

```js
apple: {
  clientId: 'com.example.web',
  redirectURI: 'https://example.com/auth/apple/callback',
  scope: 'name email',
}
```

Apple returns the `user` name only on the first authorization. Persist it on
the server when present. A pre-acquired token can be supplied with
`auth.signIn('apple', { idToken, user })`.

### GitHub

Create a GitHub OAuth App and expose only its client ID in browser code:

```js
github: {
  clientId: '...',
  redirectUri: 'https://example.com/auth/github/callback',
  scope: 'read:user user:email',
  allowSignup: true,
}
```

Keep the GitHub client secret on the backend. The default popup timeout is two
minutes.

## Security

- Never put Google, Apple, or GitHub client secrets in frontend code.
- Verify token issuer, audience, signature, expiry, and nonce on the server.
- Validate GitHub state in the popup (the SDK does this) and again on the
  server when state is persisted there.
- Prefer secure HTTP-only session cookies. Local storage is convenient but
  exposes tokens to JavaScript and therefore to XSS.
- Create a separate auth client per SSR request.
