import { createEffect, createSignal, For, onCleanup, onMount, Show } from 'grainlet';
import { useSession } from 'grainlet/auth';
import { useI18n } from 'grainlet/i18n';
import { Link, navigate, useLocation } from 'grainlet/route';
import { translateApp } from '../i18n.js';
import { ROUTE_HOME } from '../routes.js';
import {
  APP_FOOTER_LEGAL_LINK_CLASS,
  APP_FOOTER_NAV_CLASS,
  APP_FOOTER_ROOT_CLASS,
  LEGAL_LINKS,
  SOCIAL_LINK_CLASS,
  SOCIAL_LINKS,
} from './footerLinks.js';
import {
  accountControlClass,
  accountNavItems,
  APP_NAVBAR_CLASS,
  APP_SHELL_MAIN_BOTTOM_CLEARANCE_CLASS,
  APP_SHELL_MAIN_CLASS,
  APP_SHELL_ROOT_CLASS,
  bottomNavItems,
  bottomNavLabelClass,
  bottomNavLinkClass,
  BOTTOM_NAV_CLASS,
  chromeVisibility,
  headerClass,
  isBottomNavItemActive,
  isNavHrefActive,
  showsAuthenticatedNav,
  topBarLinkClass,
  topBarRouteItems,
} from './nav.js';
import { NotificationsBell } from './Notifications.jsx';
import {
  applyDarkClass,
  readStoredTheme,
  THEME_OPTIONS,
  THEME_STORAGE_KEY,
  themeButtonClass,
} from './theme.js';

const MENU_PANEL_CLASS =
  'absolute top-0 right-0 bottom-0 z-10 flex w-full max-w-sm flex-col border-l border-gray-200 bg-white text-gray-900 shadow-xl max-[540px]:max-w-none dark:border-gray-800 dark:bg-gray-950 dark:text-white';

const MENU_LINK_CLASS =
  'block rounded-sm py-3 text-lg font-bold tracking-tight text-gray-900 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-white dark:hover:text-nav-link-hover dark:focus-visible:ring-white/40 dark:focus-visible:ring-offset-gray-950';

const MENU_ACTION_CLASS =
  'group flex w-full items-center gap-3 rounded-sm text-left text-lg font-bold text-gray-900 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white cursor-pointer dark:text-white dark:hover:text-nav-link-hover dark:focus-visible:ring-white/40 dark:focus-visible:ring-offset-gray-950';

const BOTTOM_ICONS = {
  home: [
    'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
    'M16.24 7.76 14.12 14.12 7.76 16.24l2.12-6.36 6.36-2.12z',
  ],
  explore: [
    'M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z',
    'M15 5.764v15',
    'M9 3.236v15',
  ],
  community: [
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2',
    'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    'M22 21v-2a4 4 0 0 0-3-3.87',
    'M16 3.13a4 4 0 0 1 0 7.75',
  ],
  plan: [
    'M4 19.5A2.5 2.5 0 0 1 6.5 17H20',
    'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
  ],
  me: [
    'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2',
    'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  ],
};

function useCopy() {
  const i18n = useI18n();
  return (key, variables) => translateApp(i18n, key, variables);
}

function ThemeSwitcher() {
  const t = useCopy();
  const [theme, setTheme] = createSignal(
    typeof window === 'undefined' ? 'light' : readStoredTheme(window.localStorage)
  );
  const [prefersDark, setPrefersDark] = createSignal(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  onMount(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    setPrefersDark(media.matches);
    const onChange = (event) => setPrefersDark(event.matches);
    media.addEventListener('change', onChange);
    onCleanup(() => media.removeEventListener('change', onChange));
  });

  createEffect(() => {
    if (typeof document === 'undefined') return;
    applyDarkClass(document.documentElement, theme(), prefersDark());
  });

  function choose(next) {
    setTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* private mode */
    }
  }

  return (
    <div
      class="flex gap-1 bg-gray-200 dark:bg-gray-800/90 p-1 rounded-lg max-w-max mx-0 shadow-none"
    >
      <For each={THEME_OPTIONS}>
        {(option) => (
          <button
            type="button"
            class={themeButtonClass(theme() === option.value)}
            aria-pressed={theme() === option.value ? 'true' : 'false'}
            aria-label={t('theme.switchTo', { name: t(option.labelKey) })}
            onClick={() => choose(option.value)}
          >
            <span aria-hidden="true">{option.icon}</span>
            <span class="hidden lg:inline">{t(option.labelKey)}</span>
          </button>
        )}
      </For>
    </div>
  );
}

function Brand(props) {
  const t = useCopy();
  return (
    <Link
      href={ROUTE_HOME}
      class="flex shrink-0 items-center gap-2 !text-foreground font-bold tracking-tight"
      onClick={props.onNavigate}
    >
      <span class="coral-gradient flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
        <svg
          class="text-white"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" />
          <path d="M15 5.764v15" />
          <path d="M9 3.236v15" />
        </svg>
      </span>
      <span class="text-base">{t('common.appName')}</span>
    </Link>
  );
}

function RouteLink(props) {
  const t = useCopy();
  const location = useLocation();
  const active = () => isNavHrefActive(props.item.href, location().pathname);
  const linkClass = props.menu ? MENU_LINK_CLASS : topBarLinkClass(active());
  return (
    <Link
      href={props.item.href}
      class={linkClass}
      aria-current={active() ? 'page' : undefined}
      onClick={props.onNavigate}
    >
      {t(props.item.labelKey)}
    </Link>
  );
}

function AccountControl(props) {
  const t = useCopy();
  const item = props.item;
  if (item.action === 'signOut') {
    return (
      <button
        type="button"
        class={props.menu ? MENU_ACTION_CLASS : accountControlClass(item)}
        onClick={props.onSignOut}
      >
        {t(item.labelKey)}
      </button>
    );
  }
  return (
    <Link
      href={item.href}
      class={props.menu ? MENU_LINK_CLASS : accountControlClass(item)}
      onClick={props.onNavigate}
    >
      {t(item.labelKey)}
    </Link>
  );
}

function AppFooter() {
  const t = useCopy();
  const year = String(new Date().getFullYear());
  return (
    <footer class={APP_FOOTER_ROOT_CLASS}>
      <nav aria-label={t('footer.socialNav')} class={APP_FOOTER_NAV_CLASS}>
        <For each={SOCIAL_LINKS}>
          {(link) => (
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              class={SOCIAL_LINK_CLASS}
            >
              <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d={link.iconPath} />
              </svg>
              <span>{t(link.labelKey)}</span>
            </a>
          )}
        </For>
      </nav>
      <nav aria-label={t('footer.legalNav')} class={APP_FOOTER_NAV_CLASS}>
        <For each={LEGAL_LINKS}>
          {(link) => (
            <Link href={link.href} class={APP_FOOTER_LEGAL_LINK_CLASS}>
              {t(link.labelKey)}
            </Link>
          )}
        </For>
      </nav>
      <p class="text-sm text-text-muted">{t('footer.copyright', { year })}</p>
    </footer>
  );
}

function BottomNav(props) {
  const t = useCopy();
  const location = useLocation();
  return (
    <nav class={BOTTOM_NAV_CLASS} aria-label={t('nav.primaryNavigation')}>
      <div class="mx-auto flex h-16 w-full max-w-4xl items-center justify-around px-2 md:px-4">
        <For
          each={bottomNavItems(
            typeof props.signedIn === 'function' ? props.signedIn() : props.signedIn
          )}
        >
          {(item) => {
            const active = () => isBottomNavItemActive(item.match, location().pathname);
            return (
              <Link
                href={item.href}
                class={bottomNavLinkClass(active())}
                aria-current={active() ? 'page' : undefined}
              >
                <span class="relative flex flex-col items-center">
                  <svg
                    class="transition-all duration-200"
                    width="22"
                    height="22"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    stroke-width={active() ? 2.5 : 1.8}
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    style={active() ? { stroke: '#ff6b4a' } : undefined}
                  >
                    {BOTTOM_ICONS[item.id].map((d) => (
                      <path d={d} />
                    ))}
                  </svg>
                  <Show when={active()}>
                    <span class="mt-0.5 h-1 w-1 rounded-full bg-[#ff6b4a]" />
                  </Show>
                </span>
                <span class={bottomNavLabelClass(active())}>{t(item.labelKey)}</span>
              </Link>
            );
          }}
        </For>
      </div>
    </nav>
  );
}

export function AppChrome(props) {
  const session = useSession();
  const location = useLocation();
  const t = useCopy();
  const [menuOpen, setMenuOpen] = createSignal(false);
  const pathname = () => location().pathname;
  const visibility = () => chromeVisibility(pathname());
  const signedIn = () => showsAuthenticatedNav(session.status());
  const routes = () => topBarRouteItems({ signedIn: signedIn() });
  const account = () => accountNavItems(signedIn());
  const bottomSignedIn = () => session.status() === 'authenticated';

  createEffect(() => {
    pathname();
    setMenuOpen(false);
  });

  createEffect(() => {
    if (!menuOpen() || typeof document === 'undefined') return;
    const onKey = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    onCleanup(() => document.removeEventListener('keydown', onKey));
  });

  async function handleSignOut() {
    setMenuOpen(false);
    try {
      await session.signOut();
    } catch {
      return;
    }
    navigate(ROUTE_HOME);
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div class={APP_SHELL_ROOT_CLASS} data-ui-version="v2">
      <Show when={visibility().top}>
        <header class={headerClass(pathname())}>
          <nav class={APP_NAVBAR_CLASS} aria-label={t('nav.primaryNavigation')}>
            <Brand onNavigate={closeMenu} />
            <div class="flex min-w-0 flex-1 items-center justify-end gap-2">
              <div class="hidden min-w-0 items-center gap-1 md:flex">
                <For each={routes()}>
                  {(item) => <RouteLink item={item} />}
                </For>
                <For each={account()}>
                  {(item) => (
                    <AccountControl item={item} onSignOut={handleSignOut} />
                  )}
                </For>
              </div>
              <ThemeSwitcher />
              <NotificationsBell />
              <button
                type="button"
                class="p-2 rounded-md text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950 cursor-pointer md:hidden"
                aria-label={menuOpen() ? t('nav.closeMenu') : t('nav.openMenu')}
                aria-expanded={menuOpen() ? 'true' : 'false'}
                onClick={() => setMenuOpen((open) => !open)}
              >
                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d={menuOpen() ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
                  />
                </svg>
              </button>
            </div>
          </nav>
          <Show when={menuOpen()}>
            <div class="fixed inset-0 z-[60] md:hidden">
              <button
                type="button"
                class="absolute inset-0 bg-black/50 dark:bg-black/60"
                aria-label={t('nav.closeMenu')}
                onClick={closeMenu}
              />
              <div class={MENU_PANEL_CLASS} role="dialog" aria-modal="true" aria-label={t('nav.menu')}>
                <div class="flex shrink-0 justify-end px-4 pt-4 pb-2">
                  <button
                    type="button"
                    class="p-2 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 cursor-pointer dark:text-white dark:hover:bg-white/10 dark:focus-visible:ring-white/50"
                    aria-label={t('nav.closeMenu')}
                    onClick={closeMenu}
                  >
                    <svg class="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div class="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-8">
                  <div class="mb-6 shrink-0">
                    <Brand onNavigate={closeMenu} />
                  </div>
                  <nav class="flex flex-col gap-1" aria-label={t('nav.menu')}>
                    <For each={routes()}>
                      {(item) => <RouteLink item={item} menu onNavigate={closeMenu} />}
                    </For>
                  </nav>
                  <div class="min-h-8 flex-1" aria-hidden="true" />
                  <div class="mt-auto flex shrink-0 flex-col gap-3">
                    <For each={account()}>
                      {(item) => (
                        <AccountControl
                          item={item}
                          menu
                          onNavigate={closeMenu}
                          onSignOut={handleSignOut}
                        />
                      )}
                    </For>
                  </div>
                </div>
              </div>
            </div>
          </Show>
        </header>
      </Show>
      <main
        class={
          visibility().bottom
            ? `${APP_SHELL_MAIN_CLASS} ${APP_SHELL_MAIN_BOTTOM_CLEARANCE_CLASS}`
            : APP_SHELL_MAIN_CLASS
        }
      >
        {props.children}
        <Show when={visibility().footer}>
          <div class="hidden lg:block">
            <AppFooter />
          </div>
        </Show>
      </main>
      <Show when={visibility().bottom}>
        <BottomNav signedIn={bottomSignedIn()} />
      </Show>
    </div>
  );
}
