# __PROJECT_NAME__

Grainlet app scaffolded with [`create-grainlet`](https://www.npmjs.com/package/create-grainlet).

```bash
npm install
npm run dev
```

## Layout

| Path | Purpose |
|------|---------|
| `src/` | App source (JSX components) |
| `src/auth.js` | `grainlet/auth` client configuration |
| `src/i18n.js` | `grainlet/i18n` locale and namespace configuration |
| `src/locales/` | App-owned JSON translation files |
| `public/` | Static assets served at `/` (CSS, images, favicons) |
| `public/styles.css` | Global styles |
| `public/images/` | Images (e.g. `logo.svg` → `/images/logo.svg`) |

- **Runtime:** `grainlet` (production dependency)
- **Tooling:** `grainlet-vite`, `vite`, Babel peers (devDependencies)

## Authentication

`src/main.jsx` already mounts `AuthProvider`, and components can call
`useSession()` from `grainlet/auth`. Configure credentials, OAuth, storage, and
refresh behavior in `src/auth.js` when your backend is ready:

```js
import { Credentials, createAuth } from 'grainlet/auth';

export const auth = createAuth({
  providers: [
    Credentials({
      authorize: async (credentials) => {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify(credentials),
        });
        return response.ok ? response.json() : null;
      },
    }),
  ],
});
```

## Translations

The starter includes English and Ukrainian `common` namespaces. Add JSON files
under `src/locales/`, register them in `src/i18n.js`, then select a namespace:

```jsx
import { useTranslation } from 'grainlet/i18n';

function Heading() {
  const { t } = useTranslation('common');
  return <h1>{t('app.ready')}</h1>;
}
```

Nested keys such as `t('app.navigation.title')` and `{variable}` interpolation
are supported.
