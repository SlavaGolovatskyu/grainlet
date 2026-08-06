import { createSignal } from 'grainlet';
import { useSession } from 'grainlet/auth';
import { useTranslation } from 'grainlet/i18n';

export function App() {
  const [count, setCount] = createSignal(0);
  const session = useSession();
  const { t, locale, setLocale } = useTranslation('common');

  return (
    <main class="page">
      <div class="page__brand">
        <img class="page__logo" src="/images/logo.svg" alt="" width="40" height="40" />
        <h1 class="page__title">__PROJECT_NAME__</h1>
      </div>
      <p class="page__lead">
        {t('app.ready')} {t('app.description')}
      </p>
      <div class="page__languages" aria-label="Language">
        <button
          type="button"
          class={() => locale() === 'en' ? 'page__language is-active' : 'page__language'}
          onClick={() => setLocale('en')}
        >
          {t('language.english')}
        </button>
        <button
          type="button"
          class={() => locale() === 'uk' ? 'page__language is-active' : 'page__language'}
          onClick={() => setLocale('uk')}
        >
          {t('language.ukrainian')}
        </button>
      </div>
      <p class="page__status">
        {t('auth.status', { status: session.status() })}
      </p>
      <button
        type="button"
        class="page__button"
        onClick={() => setCount((c) => c + 1)}
      >
        {t('counter', { count: count() })}
      </button>
    </main>
  );
}
