import { createMemo, For, Show } from 'grainlet';
import { useSession } from 'grainlet/auth';
import { useI18n } from 'grainlet/i18n';
import { useQuery } from 'grainlet/query';
import { Link, useLocation } from 'grainlet/route';
import { apiClient, USERS_PATHS } from '../../api.js';
import { translateApp } from '../../i18n.js';
import {
  errorText,
  profileCanAccess,
  visibleAdminNavLinks,
} from './admin-helpers.js';

export const fieldClass =
  'mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white';

export const buttonClass =
  'rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60';

export const secondaryButtonClass =
  'rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100';

export const panelClass =
  'rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900';

export function adminText(i18n, key, fallback, variables) {
  const translated = translateApp(i18n, key, variables);
  if (typeof translated !== 'string' || translated.length === 0) return fallback;
  const dot = key.indexOf('.');
  const rest = dot > 0 ? key.slice(dot + 1) : key;
  if (translated === key || translated === rest) return fallback;
  return translated;
}

export function useAdminAccess(kind) {
  const session = useSession();
  const profile = useQuery(() => ({
    queryKey: ['users', 'me'],
    enabled: session.status() === 'authenticated',
    queryFn: ({ signal }) => apiClient.get(USERS_PATHS.me, { signal }),
  }));
  const allowed = createMemo(() => profileCanAccess(profile.data(), kind));
  const pending = createMemo(() => {
    if (session.status() === 'loading') return true;
    if (session.status() !== 'authenticated') return false;
    return profile.isPending() && !profile.data();
  });
  return { session, profile, allowed, pending };
}

function AdminNavLink(props) {
  const i18n = useI18n();
  const location = useLocation();
  const active = () => location().pathname === props.link.href;
  return (
    <Link
      href={props.link.href}
      class={
        active()
          ? 'rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white'
          : 'rounded-md border border-gray-200 px-3 py-1.5 text-sm text-indigo-700 hover:bg-indigo-50 dark:border-gray-700 dark:text-indigo-300'
      }
    >
      {adminText(i18n, props.link.titleKey, props.link.title)}
    </Link>
  );
}

export function AdminShell(props) {
  const i18n = useI18n();
  const t = (key, fallback, variables) => adminText(i18n, key, fallback, variables);
  const links = createMemo(() => visibleAdminNavLinks(props.access.profile.data()));
  const showBody = () => props.access.allowed();
  return (
    <section class="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <nav class="flex flex-wrap gap-2" aria-label={t('nav.admin', 'Admin')}>
        <For each={links()}>{(link) => <AdminNavLink link={link} />}</For>
      </nav>
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{props.title}</h1>
          <Show when={props.description}>
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">{props.description}</p>
          </Show>
        </div>
        <Show when={props.showBack}>
          <Link href="/admin" class="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
            {t('admin.backToAdmin', 'Back to admin')}
          </Link>
        </Show>
      </div>
      <Show when={props.access.pending()}>
        <p class="text-sm text-gray-500">{t('admin.loading', 'Loading…')}</p>
      </Show>
      <Show when={!props.access.pending() && props.access.session.status() !== 'authenticated'}>
        <p class="text-sm text-red-600">{t('admin.signInRequired', 'Sign in with an admin account to use this page.')}</p>
      </Show>
      <Show when={!props.access.pending() && props.access.profile.error()}>
        {(err) => (
          <p class="text-sm text-red-600">{errorText(err, t('admin.profileError', 'Could not load your account.'))}</p>
        )}
      </Show>
      <Show
        when={
          !props.access.pending() &&
          props.access.session.status() === 'authenticated' &&
          !props.access.profile.error() &&
          !props.access.allowed()
        }
      >
        <p class="text-sm text-red-600">{t('admin.forbidden', 'You do not have permission to access this page.')}</p>
      </Show>
      <Show when={showBody()}>{props.children}</Show>
    </section>
  );
}

export function DataRegion(props) {
  const i18n = useI18n();
  const loadingText = () => adminText(i18n, 'admin.loading', 'Loading…');
  return (
    <>
      <Show when={props.pending}>
        <p class="text-sm text-gray-500">{loadingText()}</p>
      </Show>
      <Show when={props.error}>
        {(err) => <p class="text-sm text-red-600">{errorText(err, props.errorFallback)}</p>}
      </Show>
      <Show when={!props.pending && !props.error && props.empty}>
        <p class="text-sm text-gray-500">{props.emptyText}</p>
      </Show>
      <Show when={!props.pending && !props.error && !props.empty}>{props.children}</Show>
    </>
  );
}

export function Notice(props) {
  return (
    <Show when={props.message}>
      {(message) => (
        <p class="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
          {message}
        </p>
      )}
    </Show>
  );
}
