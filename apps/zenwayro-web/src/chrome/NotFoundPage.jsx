import { useI18n } from 'grainlet/i18n';
import { Link } from 'grainlet/route';
import { translateApp } from '../i18n.js';
import { NAV_SIGN_UP_CLASS } from './nav.js';
import { ROUTE_HOME } from '../routes.js';

export function NotFoundPage() {
  const i18n = useI18n();
  const t = (key) => translateApp(i18n, key);

  return (
    <section class="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <p class="text-sm font-semibold tracking-wide text-[#ff6b4a]">404</p>
      <h1 class="mt-2 text-3xl font-bold tracking-tight text-foreground">Page not found</h1>
      <p class="mt-3 max-w-sm text-sm text-muted-foreground">
        We could not find that page. It may have been moved, or the address may be wrong.
      </p>
      <Link href={ROUTE_HOME} class={`mt-6 ${NAV_SIGN_UP_CLASS}`}>
        {t('nav.home')}
      </Link>
    </section>
  );
}
