# create-grainlet

Scaffold a Vite + [grainlet](https://www.npmjs.com/package/grainlet) app.

```bash
npx create-grainlet my-app
cd my-app
npm install
npm run dev
```

Use `npx create-grainlet my-app --ssr` for the opt-in production starter with
nested routing, streaming SSR, separate client/server Vite builds, and SSG
primitives. That template also includes optional `src/vercel.js` /
`src/cloudflare.js` entries and `grainlet-adapters` for cloud deploys. The
default remains a client-rendered SPA.

The generated project depends on:

| Package | Role |
|---------|------|
| `grainlet` | Runtime (dependency) |
| `grainlet-adapters` | Vercel/Cloudflare adapters (`--ssr` template only) |
| `grainlet-vite` | JSX Vite plugin (devDependency) |
| `vite` | Bundler (devDependency) |
| `@babel/core`, `@babel/plugin-syntax-jsx` | Peers for the Vite plugin (devDependencies) |

The generated app includes:

- `AuthProvider` and a starter client in `src/auth.js` for `grainlet/auth`
- `I18nProvider`, English/Ukrainian JSON files, and namespace setup in
  `src/i18n.js` for `grainlet/i18n`
- A `public/` folder for static assets (`styles.css`, `images/`) served at `/`

Both features are subpath exports of the `grainlet` dependency, so no separate
runtime packages are required.
