# grainlet-adapters

Deploy Grainlet SSR apps to **Vercel** and **Cloudflare** using the Web
`Request`/`Response` handler from `grainlet/ssr`. This package does not put
platform APIs into `grainlet` core.

```sh
npm install grainlet-adapters
```

Peer: `grainlet`. Optional peer: `vite` (for `grainlet-adapters/vite`).

## Runtime

Use the same `App` + `routes` object as the Node SSR template. Keep
`/client.js` as the production script name.

### Vercel

```js
import { createVercelHandler } from 'grainlet-adapters/vercel';
import { App, routes } from './App.jsx';

export default createVercelHandler({
  App,
  routes,
  document: { scripts: ['/client.js'] },
});
```

Export that module as the function entry. The handler accepts a Web `Request`
and optional Vercel context.

### Cloudflare Workers

```js
import { createCloudflareHandler } from 'grainlet-adapters/cloudflare';
import { App, routes } from './App.jsx';

export default createCloudflareHandler({
  App,
  routes,
  document: { scripts: ['/client.js'] },
});
```

`fetch(request, env, ctx)` passes `{ env, ctx }` as `platformContext`. If
`env.ASSETS.fetch` exists, static files are served first; 404s fall through to
SSR. `npx wrangler deploy` from the generated Cloudflare output directory.

`createGrainletHandler` is the shared Web factory used by both adapters. Pass
`assetPrefix` (or `GRAINLET_ASSET_PREFIX`) when scripts are not same-origin.
`streaming: false` buffers HTML for runtimes that do not stream.

## Vite build output

Keep `grainJsx()` from `grainlet-vite`. Add `grainletPlatform()` to the **SSR**
Vite config so it runs after the server bundle:

```js
import { defineConfig } from 'vite';
import { grainJsx } from 'grainlet-vite';
import { grainletPlatform } from 'grainlet-adapters/vite';

export default defineConfig({
  plugins: [
    grainJsx(),
    grainletPlatform({
      target: 'vercel', // or 'cloudflare'
      clientOutDir: 'dist/client',
      prerender: true, // or ['/', '/about']
      App, // required when prerender is enabled
      routes,
    }),
  ],
  esbuild: { jsx: 'automatic', jsxImportSource: 'grainlet' },
  build: {
    outDir: 'dist/server',
    rollupOptions: {
      input: 'src/vercel.js',
      output: { entryFileNames: 'server.js' },
    },
    ssr: true,
  },
});
```

Build order: `vite build --config vite.client.config.js` then the SSR config.

### Vercel

Emits Build Output API v3 under `.vercel/output/`:

- `static/` — client assets and prerendered HTML
- `functions/ssr.func/` — Edge function wrapping the SSR bundle
- `config.json` — filesystem routes first, then catch-all `/ssr`

Deploy with the Vercel CLI from the project root (`vercel deploy --prebuilt`).

### Cloudflare

Emits `dist/cloudflare/`:

- `assets/` — client files and prerendered HTML
- `worker.js` — Workers `fetch` export
- `wrangler.json` — `main` + `assets` binding `ASSETS`

```sh
npx wrangler deploy --config dist/cloudflare/wrangler.json
```

Dynamic routes stay on the SSR function. Prerendered paths are static files and
win over the catch-all.

The Node `createNodeHandler` template remains the default `create-grainlet --ssr`
starter. Point the SSR Vite `input` at `src/vercel.js` or `src/cloudflare.js`
when targeting a cloud.
