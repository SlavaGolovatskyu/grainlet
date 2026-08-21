# grainlet

Fine-grained reactive UI: **signals**, **JSX**, **queries**, **forms**, **auth**, **i18n**, **History API routing**, and **SSR / hydrate**.

## Install

```bash
npm install grainlet
```

For Vite JSX (dev only — install as `devDependencies`):

```bash
npm install -D grainlet-vite vite @babel/core @babel/plugin-syntax-jsx
```

Or scaffold a project:

```bash
npx create-grainlet my-app
```

## Usage

```js
import { createSignal, render } from 'grainlet';

function App() {
  const [count, setCount] = createSignal(0);
  return (
    <button type="button" onClick={() => setCount((c) => c + 1)}>
      {count()}
    </button>
  );
}

render(App, document.getElementById('app'));
```

## Vite

```js
import { defineConfig } from 'vite';
import { grainJsx } from 'grainlet-vite';

export default defineConfig({
  plugins: [grainJsx()],
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'grainlet',
  },
});
```

## Entry points

| Import | Purpose |
|--------|---------|
| `grainlet` | Core API (signals, flow, render, hydrate) |
| `grainlet/route` | History API routing (`Router`, `Route`, `Link`, …) |
| `grainlet/forms` | Form state (`FormProvider`, `Field`, `createForm`, …) — see [forms/README.md](./forms/README.md) |
| `grainlet/auth` | Session auth (`createAuth`, `AuthProvider`, `useSession`, …) — see [auth/README.md](./auth/README.md) |
| `grainlet/auth-sdk` | Google, Apple, and GitHub OAuth integration — see [auth-sdk/README.md](./auth-sdk/README.md) |
| `grainlet/i18n` | Translations (`createI18n`, `I18nProvider`, `useTranslation`, …) — see [i18n/README.md](./i18n/README.md) |
| `grainlet/query` | Async server state (`QueryClient`, `useQuery`, `useMutation`, …) — see [query/README.md](./query/README.md) |
| `grainlet/utils` | Generic helpers (`stableHash`, `replaceEqualDeep`, `Subscribable`, …) — see [utils/README.md](./utils/README.md) |
| `grainlet/store` | Fine-grained proxy stores (`createStore`, `produce`, `reconcile`) |
| `grainlet/testing` | Component, hook, event, query, wait, and hydration test helpers |
| `grainlet/devtools` | Development signal/owner and Query inspectors |
| `grainlet/ssr` | Buffered/streaming SSR, SSG, head, and Web/Node adapters |
| `grainlet/jsx-runtime` | Automatic JSX runtime |
| `grainlet-vite` | `grainJsx()` Vite plugin (separate package, `devDependency`) |
| `grainlet-adapters` | Vercel and Cloudflare SSR deploy adapters (separate package) |

> **Breaking:** Router and SSR APIs are no longer re-exported from `grainlet`. Import them from `grainlet/route` and `grainlet/ssr`. Forms, auth, auth-sdk, and i18n live under their respective `grainlet/*` entry points only.

## Reactive scheduling and lifecycle

`batch(fn)` coalesces signal writes. `onMount(fn)` runs once after the owned DOM
is mounted and may return cleanup. `startTransition`, `useTransition`, and
`createDeferred` schedule non-urgent updates without changing the default
synchronous signal behavior. Large nested state can use `createStore` from
`grainlet/store` for path-level tracking.

## Control flow

```js
import {
  Show,
  For,
  VirtualList,
  Switch,
  Match,
  Suspense,
  ErrorBoundary,
  Portal,
  createContext,
  useContext,
  createResource,
  lazy,
} from 'grainlet';
```

| Component | Role |
|-----------|------|
| `Show` | Render children when `when` is truthy (else `fallback`) |
| `For` | Map `each` list to children; prefers `item.id` keys |
| `VirtualList` | Windowed list (vertical or horizontal) — overscan, optional `debounceTime`, infinite scroll via `onEndReached` |
| `Switch` / `Match` | First matching `when` branch |
| `Suspense` | `fallback` while nested `createResource` / `lazy` is pending |
| `ErrorBoundary` | Catch render/update errors; `fallback` or `(error, reset) => …` |
| `Portal` | Render children into `document.body` (or `mount`) |
| `createContext` / `useContext` | Share data without prop drilling (`Provider` + consume) |
| `createResource` | Async data `[resource]` — `resource()` reads value |
| `lazy` | Lazy-load a component (`lazy(() => import('./Page.js'))`) |

Prefer these over `{cond() && <X/>}` so conditionals update without re-running the parent.

```js
<VirtualList
  each={items()}
  itemHeight={48}
  height={400}
  overscan={5}
  aria-label="Items"
>
  {(item) => <div class="row">{item.label}</div>}
</VirtualList>

// The outer scroller accepts normal div props, a DOM ref, and an imperative API.
let scroller;
let listApi;

<VirtualList
  each={items()}
  itemHeight={48}
  height={400}
  id="search-results"
  aria-label="Search results"
  data-testid="results-list"
  ref={(element) => (scroller = element)}
  apiRef={(api) => (listApi = api)}
  onScroll={(event) => console.log(event.currentTarget.scrollTop)}
>
  {(item) => <div class="row">{item.label}</div>}
</VirtualList>

listApi?.scrollToIndex(250, { align: 'center', behavior: 'smooth' });
listApi?.scrollToItem(items()[0]);
listApi?.scrollToOffset(0);
listApi?.getVisibleRange(); // { start, end }
listApi?.getElement() === scroller; // true

<VirtualList
  orientation="horizontal"
  each={items()}
  itemWidth={120}
  width={480}
  height={80}
  debounceTime={32}
  aria-label="Horizontal items"
  data-layout="horizontal"
  apiRef={(api) => (listApi = api)}
>
  {(item) => <div class="card">{item.label}</div>}
</VirtualList>

// Infinite scroll — parent owns fetch + append
const [page, setPage] = createSignal([]);
const [loading, setLoading] = createSignal(false);
const [hasMore, setHasMore] = createSignal(true);

async function loadMore() {
  if (loading() || !hasMore()) return;
  setLoading(true);
  const next = await fetchPage(page().length);
  setPage((list) => [...list, ...next.items]);
  setHasMore(next.hasMore);
  setLoading(false);
}

<VirtualList
  each={page()}
  itemHeight={88}
  height={520}
  onEndReached={loadMore}
  endReachedThreshold={0.2}
  endReachedLoading={loading()}
  aria-label="Infinite results"
  aria-busy={loading()}
  apiRef={(api) => (listApi = api)}
>
  {(item) => <div class="row">{item.label}</div>}
</VirtualList>
```

```js
<ErrorBoundary
  fallback={(error, reset) => (
    <div>
      <p>Something went wrong: {error.message}</p>
      <button type="button" onClick={reset}>Try Again</button>
    </div>
  )}
>
  <ErrorProne />
</ErrorBoundary>
```

Event handlers and `setTimeout` callbacks are not caught (same as Solid).

```js
<div style={{ overflow: 'hidden' }}>
  <Portal>
    <div class="popup">Escapes overflow clipping</div>
  </Portal>
</div>

<Portal mount={document.querySelector('#portal-root')}>
  <p>Custom mount node</p>
</Portal>

{/* SVG: wrap in <g>; head: no wrapper */}
<Portal mount={svgEl} isSVG>
  <circle r="4" />
</Portal>
```

```js
const CounterContext = createContext();

function CounterProvider(props) {
  const [count, setCount] = createSignal(props.count ?? 0);
  return (
    <CounterContext.Provider value={[count, setCount]}>
      {props.children}
    </CounterContext.Provider>
  );
}

function useCounter() {
  const value = useContext(CounterContext);
  if (!value) throw new Error('Missing CounterProvider');
  return value;
}

function Child() {
  const [count, setCount] = useCounter();
  return (
    <button type="button" onClick={() => setCount((n) => n + 1)}>
      {count()}
    </button>
  );
}
```

Pass a signal (or store) as `value` so consumers stay reactive without remounting the Provider.

## Refs

Attach `ref` to any host element to get the DOM node (Solid-compatible):

```js
// Callback
<input ref={(el) => { inputEl = el; }} />

// Signal setter (stable function identity)
const [el, setEl] = createSignal(null);
<div ref={setEl} />

// Variable form — requires grainJsx() (rewrites to an assignment callback)
let box;
<div ref={box} />

// Forwarding
function Field(props) {
  return <input ref={props.ref} />;
}
<Field ref={setEl} />
```

Refs are set when the node is created and cleared with `null` when it is removed (e.g. inside `Show`).

## TypeScript

Types ship with the package (no extra install). Use the same Vite config with `jsxImportSource: 'grainlet'`:

```ts
import { createSignal, render, type Accessor } from 'grainlet';

function App() {
  const [count, setCount] = createSignal(0);
  return (
    <button type="button" onClick={() => setCount((c) => c + 1)}>
      {count()}
    </button>
  );
}

render(App, document.getElementById('app')!);
```

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "grainlet"
  }
}
```

`grainlet-vite` includes typings for `grainJsx()`.

## Forms

Formik-inspired forms — import from **`grainlet/forms`**:

```js
import {
  FormProvider,
  Form,
  Field,
  ErrorMessage,
  createForm,
  useFormContext,
  required,
  isEmail,
  minLength,
} from 'grainlet/forms';

function Signup() {
  return (
    <FormProvider
      initialValues={{ email: '', password: '' }}
      rules={{
        email: [required('Email is required'), isEmail('Enter a valid email')],
        password: [
          required('Password is required'),
          minLength(8, 'Use at least 8 characters'),
        ],
      }}
      onSubmit={async (values) => {
        await api.signup(values);
      }}
    >
      <Form>
        <Field name="email" type="email" />
        <ErrorMessage name="email" />
        <Field name="password" type="password" />
        <ErrorMessage name="password" />
        <button type="submit">Sign up</button>
      </Form>
    </FormProvider>
  );
}
```

Headless (no provider):

```js
const form = createForm({
  initialValues: { email: '' },
  rules: { email: [required(), isEmail()] },
  onSubmit: async (values) => { /* … */ },
});
// form.values(), form.handleChange, form.handleSubmit, …
```

Supports nested paths (`social.facebook`, `friends[0]`), field-level `validate={[required(), isEmail()]}`, optional Yup `validationSchema`, and `FieldArray`. Full guide: **[forms/README.md](./forms/README.md)**.

## Auth

Headless, Auth.js-style sessions — import from **`grainlet/auth`**. Your app owns the API, cookies, and OAuth SDK:

```js
import { Show, render } from 'grainlet';
import {
  AuthProvider,
  Credentials,
  createAuth,
  createLocalStorageAdapter,
  useSession,
  ProtectedRoute,
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
  ],
  refresh: ({ userId, refreshToken }) =>
    api.post('/api/auth/refresh', { userId, refreshToken }),
  storage: createLocalStorageAdapter(),
});

function AccountMenu() {
  const session = useSession();

  return (
    <Show
      when={() => session.status() === 'authenticated'}
      fallback={
        <button
          type="button"
          onClick={() =>
            session.signIn('credentials', {
              email: 'user@example.com',
              password: 'secret',
            })
          }
        >
          Sign in
        </button>
      }
    >
      <span>{session.data()?.user.email}</span>
      <button type="button" onClick={() => session.signOut()}>
        Sign out
      </button>
    </Show>
  );
}

function SettingsRoute() {
  return (
    <ProtectedRoute
      redirectTo="/auth/signin"
      loadingFallback={<p>Checking session…</p>}
    >
      <Settings />
    </ProtectedRoute>
  );
}

render(
  () => (
    <AuthProvider client={auth}>
      <AccountMenu />
    </AuthProvider>
  ),
  document.getElementById('app')
);
```

`useSession()` returns the auth client. Call accessors: `data()`, `status()` (`loading` | `authenticated` | `unauthenticated`), `error()`. Also: `signIn`, `signOut`, `getSession`, `refresh`, `update`. Default storage is memory-only; use `createLocalStorageAdapter()` to persist across reloads. Full guide: **[auth/README.md](./auth/README.md)**.

For batteries-included Google, Apple, and GitHub sign-in, configure
`createAuthSdk()` and add `GoogleSignIn(sdk)`, `AppleSignIn(sdk)`, and
`GitHubSignIn(sdk)` to the providers array. The SDK handles provider scripts,
popups, tokens, and calls to your backend. Full guide:
**[auth-sdk/README.md](./auth-sdk/README.md)**.

## i18n

Namespaced JSON translations — import from **`grainlet/i18n`**:

```js
import { render } from 'grainlet';
import { createI18n, I18nProvider, useTranslation } from 'grainlet/i18n';
import enCommon from './locales/en/common.json';
import ukCommon from './locales/uk/common.json';

// en/common.json — { "welcome": "Welcome, {name}", "actions": { "continue": "Continue" } }

const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  resources: {
    en: {
      common: enCommon,
      // Lazy namespace: auth: () => import('./locales/en/auth.json'),
    },
    uk: { common: ukCommon },
  },
});

function Welcome() {
  const { t, locale, setLocale } = useTranslation('common');

  return (
    <main>
      <h1>{t('welcome', { name: 'Mike' })}</h1>
      <p>{t('actions.continue')}</p>
      <button type="button" onClick={() => setLocale(locale() === 'en' ? 'uk' : 'en')}>
        Switch language
      </button>
    </main>
  );
}

render(
  () => (
    <I18nProvider client={i18n}>
      <Welcome />
    </I18nProvider>
  ),
  document.getElementById('app')
);
```

Pass a namespace to `useTranslation`, then use keys relative to that file. Nested keys use dot paths (`segment.title.key`). Missing keys fall back to `fallbackLocale`, then the key string. For form validators, pass lazy messages: `required(() => t('validation.required'))`. Full guide: **[i18n/README.md](./i18n/README.md)**.

## Routing

History API router — no hash required:

```js
import {
  Router,
  Route,
  Link,
  navigate,
  useParams,
  useLocation,
} from 'grainlet/route';

function User() {
  const params = useParams();
  const location = useLocation();
  return (
    <section>
      <h2>User {params().id}</h2>
      <p>{location().pathname}</p>
    </section>
  );
}

function App() {
  return (
    <>
      <nav>
        <Link href="/" activeClass="active">Home</Link>
        <Link href="/users/1" activeClass="active">User 1</Link>
      </nav>
      <Router basename="/app">
        <Route path="/" component={Home} />
        <Route path="/users/:id" component={User} />
        <Route path="*" component={NotFound} />
      </Router>
    </>
  );
}

// Imperative navigation (respects Router basename)
navigate('/users/3');
```

| API | Role |
|-----|------|
| `Router` | Match location to `Route` children (optional `basename`) |
| `Route` | `path` + `component` (`:param`, `*` catch-all) |
| `Link` | Client-side `<a>`; `activeClass` when the path matches |
| `navigate(to)` | Push/replace history |
| `useParams()` | Signal of route params (`params().id`) |
| `useLocation()` | Signal of `{ pathname, search, hash, state }` |

## SSR

```js
import { Suspense, lazy, hydrate } from 'grainlet';
import {
  renderToString,
  renderToStringAsync,
  wrapHtmlDocument,
} from 'grainlet/ssr';

const body = renderToString(App, {}, { url: 'http://localhost/' });

// Await lazy / createResource before emitting HTML (resolved content, not fallback)
const Home = lazy(() => import('./pages/home.js'));
function App() {
  return (
    <Suspense fallback={<p>Loading</p>}>
      <Home />
    </Suspense>
  );
}
const asyncBody = await renderToStringAsync(App);
```

On the server, `createEffect` is a no-op; `createMemo` evaluates once for the HTML snapshot.
`renderToStringAsync` keeps SSR mode on across passes until pending Suspense work settles.

Production apps should use `createRequestHandler` (Web `Response`) or the Node
`createNodeHandler` export. Streaming uses `renderToReadableStream` and
`renderRouteToReadableStream`: the document shell and Suspense fallbacks flush
first, then escaped boundary patches replace resolved regions out of order.
Redirects from loaders happen before the shell. After shell emission, failures
stay inside their boundary and surface through `onError`.

Always create one `QueryClient` per request. `head` is escaped text; trusted
markup belongs in `unsafeHead`. Prefer `Title`, `Meta`, `HeadLink`, `Canonical`,
`JsonLd`, and `OpenGraph`. Pass a CSP `nonce` so state scripts and stream
patches inherit it. `prerenderPaths` / `writePrerendered` generate static HTML
plus a `grainlet-prerender.json` manifest. Scaffold this pipeline with
`npx create-grainlet my-app --ssr`.

`configureHydration({ onMismatch, strict })` reports expected/actual nodes,
JSX source, and a component stack. Hydration mismatches replace the subtree
on the client unless strict mode throws.
