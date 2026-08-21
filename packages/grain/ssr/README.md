# SSR (library)

Import from **`grainlet/ssr`** (not the main `grainlet` entry):

```js
import {
  renderToString,
  renderToStringAsync,
  renderToReadableStream,
  createRequestHandler,
  renderDocument,
  wrapHtmlDocument,
  Head,
  Title,
  Meta,
  runWithSSR,
  isServer,
} from 'grainlet/ssr';
```

| Export | Role |
|--------|------|
| `renderToString(type, props?, { url? })` | Sync HTML string for a component tree |
| `renderToStringAsync(type, props?, { url?, maxPasses? })` | Await `lazy` / `createResource`, then HTML |
| `renderToReadableStream(type, props?, options?)` | Shell-first Web stream with out-of-order Suspense patches |
| `wrapHtmlDocument(body, options?)` | Full HTML document wrapper |
| `renderDocument(body, options?)` | Safe document wrapper with managed head and JSON hydration state |
| `Head`, `Title`, `Meta`, `HeadLink` | Declarative request-local SSR and client head management |
| `hydrate(type, container, props?)` | Attach to existing DOM |
| `runWithSSR(fn)` / `isServer()` | SSR mode flag (effects skipped; supports async `fn`) |

Client hydration in apps usually uses `hydrate` from `grainlet` (core). Prefer plain function components. Markup includes `data-component` / `data-fg="fragment"` hosts to match the client DOM layer.

Pass `{ url }` so routing location is seeded on the server.

`runWithSSR` uses Node's async context storage when available, isolating URL,
resources, route/query state, and head entries across concurrent requests.
Inline state emitted by `renderDocument` is escaped for safe embedding.

`head` is escaped text. Trusted hand-authored markup must use the explicit
`unsafeHead` option. Prefer `Title`, `Meta`, `HeadLink`, `Canonical`, `JsonLd`,
and `OpenGraph`; all structured values are escaped. Pass one CSP `nonce` to
stream/document options so hydration state and boundary patches inherit it.

For nested data routes, prefer `renderRouteDocument` from `grainlet/route`; it
prepares loaders and query data before buffered rendering and returns redirects,
HTTP status/headers, and hydration state.

## Production handlers

`createRequestHandler` is Web-standard and returns a `Response`, making it the
base adapter for serverless and edge runtimes. It accepts an optional async
context carrier through `setSSRContextStorage`. Node resolves the same package
to an entry that also exports `createNodeHandler`; it handles disconnect
aborts, backpressure, redirects, and streamed responses.

Always create one `QueryClient` per request. Never share authentication,
resource caches, route state, or query caches between requests.

Vercel and Cloudflare deployment lives in the separate **`grainlet-adapters`**
package. It wraps `createRequestHandler` and emits Vercel Build Output API or
Cloudflare worker/assets/wrangler files via `grainletPlatform()` from
`grainlet-adapters/vite`.

## Static generation

`prerenderPaths` returns generated pages in memory. Node additionally exports
`writePrerendered`, which writes route directories and a
`grainlet-prerender.json` manifest. Dynamic routes provide `getStaticPaths` or
the build passes an explicit `paths` list.

Streaming flushes the shell and Suspense fallbacks first. Redirects discovered
by route loaders happen before the shell. Errors after shell emission remain
inside their boundary and are reported through `onError`.

Demo app (workspace): `npm run ssr:demo` → `apps/ssr-demo`.
