# grainlet/i18n

Signal-based translations for Grainlet applications. Translation files stay
in your app and can be split into any namespaces you choose.

## Setup

Create one JSON file per locale and namespace:

```text
src/locales/
  en/common.json
  en/auth.json
  uk/common.json
  uk/auth.json
```

```json
{
  "welcome": "Welcome, {name}",
  "actions": {
    "continue": "Continue"
  }
}
```

Register those dictionaries and provide the client:

```jsx
import { render } from 'grainlet';
import { createI18n, I18nProvider } from 'grainlet/i18n';
import enCommon from './locales/en/common.json';
import ukCommon from './locales/uk/common.json';

const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  resources: {
    en: { common: enCommon },
    uk: { common: ukCommon },
  },
});

function Root() {
  return (
    <I18nProvider client={i18n}>
      <App />
    </I18nProvider>
  );
}

render(Root, document.getElementById('app'));
```

`I18nProvider` can also create the client from a `config` prop.

## Translate a namespace

Pass the namespace to `useTranslation`, then use keys relative to that
namespace:

```jsx
import { useTranslation } from 'grainlet/i18n';

function Welcome() {
  const { t, locale, setLocale } = useTranslation('common');

  return (
    <main>
      <h1>{() => t('welcome', { name: 'Mike' })}</h1>
      <button onClick={() => setLocale(locale() === 'en' ? 'uk' : 'en')}>
        Switch language
      </button>
    </main>
  );
}
```

Use a function child (`{() => t(...)}`) wherever the DOM should update when
the locale changes. Nested JSON is addressed with dot paths, such as
`t('actions.continue')`.

If a key is absent from the active locale, Grainlet checks `fallbackLocale`.
If neither dictionary contains it, `t` returns the key.

## Lazy namespaces

A namespace may be a loader. The loader runs once and is cached:

```js
const i18n = createI18n({
  locale: 'en',
  resources: {
    en: {
      common: () => import('./locales/en/common.json'),
      auth: () => import('./locales/en/auth.json'),
    },
  },
});
```

Calling `t` starts an unloaded namespace and updates tracked translations when
it resolves. To load before rendering, await it explicitly:

```js
await i18n.loadNamespace(i18n.locale(), 'auth');
```

## Headless usage

The client can translate outside components:

```js
i18n.t('common', 'welcome', { name: 'Mike' });
i18n.changeLanguage('uk');
```

`changeLanguage` is an alias for `setLocale`.

## Form validation

Grainlet form validators accept lazy message functions, so they follow locale
changes:

```js
import { required } from 'grainlet/forms';
import { useTranslation } from 'grainlet/i18n';

const { t } = useTranslation('validation');
const rule = required(() => t('required'));
```
