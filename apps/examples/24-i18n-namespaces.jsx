import { render } from 'grainlet';
import {
  createI18n,
  I18nProvider,
  useTranslation,
} from 'grainlet/i18n';
import enCommon from './locales/en/common.json';
import ukCommon from './locales/uk/common.json';
import enDashboard from './locales/en/dashboard.json';
import ukDashboard from './locales/uk/dashboard.json';

const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  resources: {
    en: {
      common: enCommon,
      dashboard: enDashboard,
      profile: () => import('./locales/en/profile.json'),
    },
    uk: {
      common: ukCommon,
      dashboard: ukDashboard,
      profile: () => import('./locales/uk/profile.json'),
    },
  },
});

function LocaleSwitcher() {
  const { t, locale, setLocale } = useTranslation('common');

  return (
    <section class="locale-picker">
      <strong>{() => t('language')}</strong>
      <button
        class={() => (locale() === 'en' ? 'active' : '')}
        onClick={() => setLocale('en')}
      >
        {() => t('english')}
      </button>
      <button
        class={() => (locale() === 'uk' ? 'active' : '')}
        onClick={() => setLocale('uk')}
      >
        {() => t('ukrainian')}
      </button>
    </section>
  );
}

function CommonNamespace() {
  const { t } = useTranslation('common');

  return (
    <article>
      <span class="namespace">common.json</span>
      <h2>{() => t('welcome', { name: 'Grainlet' })}</h2>
      <p>{() => t('segment.title.key.first')}</p>
      <code>t('segment.title.key.first')</code>
      <p class="fallback">
        Fallback demo: {() => t('fallbackOnly')}
      </p>
    </article>
  );
}

function DashboardNamespace() {
  const { t } = useTranslation('dashboard');

  return (
    <article>
      <span class="namespace">dashboard.json</span>
      <h2>{() => t('title')}</h2>
      <p>{() => t('stats.projects', { count: 3 })}</p>
      <small>{() => t('stats.lastUpdated')}</small>
    </article>
  );
}

function LazyProfileNamespace() {
  const { t } = useTranslation('profile');

  return (
    <article>
      <span class="namespace">profile.json — lazy import</span>
      <h2>{() => t('title')}</h2>
      <p>{() => t('description')}</p>
    </article>
  );
}

function Demo() {
  return (
    <I18nProvider client={i18n}>
      <main>
        <h1>grainlet/i18n namespaces</h1>
        <p class="lead">
          Static and lazy JSON namespaces, deep keys, fallback, interpolation,
          and reactive locale switching.
        </p>
        <LocaleSwitcher />
        <div class="grid">
          <CommonNamespace />
          <DashboardNamespace />
          <LazyProfileNamespace />
        </div>
      </main>
    </I18nProvider>
  );
}

render(Demo, document.getElementById('app'));
