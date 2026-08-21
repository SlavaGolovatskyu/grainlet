# __PROJECT_NAME__

Production-oriented Grainlet starter with nested routing, request-local Query,
streaming SSR, and separate client/server Vite builds.

```sh
npm install
npm run dev
```

Build and run the production bundles:

```sh
npm run build
npm start
```

Use `writePrerendered` from `grainlet/ssr` in a build script when routes should
also be emitted as static HTML.

## Vercel and Cloudflare

The default server uses Node `createNodeHandler`. Optional entries live in
`src/vercel.js` and `src/cloudflare.js`. Install is already included via
`grainlet-adapters`.

1. Point the SSR Vite config `input` at `src/vercel.js` or `src/cloudflare.js`.
2. Add `grainletPlatform({ target: 'vercel' | 'cloudflare', clientOutDir: 'dist/client' })`
   from `grainlet-adapters/vite` next to `grainJsx()`.
3. Run `npm run build:client` then `npm run build:server`.
4. Deploy `.vercel/output` with `vercel deploy --prebuilt`, or
   `npx wrangler deploy --config dist/cloudflare/wrangler.json`.

See the [grainlet-adapters README](https://www.npmjs.com/package/grainlet-adapters).
