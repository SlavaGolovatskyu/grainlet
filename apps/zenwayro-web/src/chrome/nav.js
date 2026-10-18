import {
  ROUTE_AUTH_SIGNIN,
  ROUTE_AUTH_SIGNUP,
  ROUTE_EXPLORE,
  ROUTE_HOME,
  ROUTE_PLAN_NEW,
  ROUTE_POPULAR_TRIPS,
  ROUTE_QUIZ,
  ROUTE_SETTINGS,
  ROUTE_TRIPS,
} from '../routes.js';

/** Quiz is a full-screen flow in the source navbar. */
export const NAVBAR_EXCLUDED_PATHS = ['/quiz'];

export const NAV_BUTTON_CLASS =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-50 h-9 px-3 hover:bg-accent hover:text-accent-foreground';

export const NAV_SIGN_UP_CLASS =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer h-9 px-3 coral-gradient border-0 text-white hover:opacity-90';

export const APP_NAVBAR_CLASS =
  'sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b border-border bg-white/95 px-4 backdrop-blur-md md:gap-4 md:px-6 dark:border-gray-800 dark:bg-gray-950/95';

export const BOTTOM_NAV_CLASS =
  'fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] md:hidden dark:border-gray-800 dark:bg-gray-950/95';

export const APP_SHELL_ROOT_CLASS =
  'zenwayro-v2-ui flex flex-col flex-1 min-h-0 h-full bg-background text-foreground dark:bg-gray-950 dark:text-gray-100';

export const APP_SHELL_HEADER_CLASS = 'shrink-0 z-40';

export const APP_SHELL_MAIN_CLASS =
  'flex-1 min-h-0 overflow-auto';

export const APP_SHELL_MAIN_BOTTOM_CLEARANCE_CLASS =
  'pb-[calc(4rem+env(safe-area-inset-bottom,0px)+0.75rem)] md:pb-0';

const BUTTON_BASE = NAV_BUTTON_CLASS;

export function showsAuthenticatedNav(status) {
  return status === 'authenticated' || status === 'loading';
}

export function isAppNavbarHidden(pathname) {
  return (
    NAVBAR_EXCLUDED_PATHS.includes(pathname) ||
    pathname === ROUTE_HOME ||
    pathname === ROUTE_TRIPS ||
    pathname === ROUTE_POPULAR_TRIPS ||
    pathname === ROUTE_PLAN_NEW
  );
}

export function isBottomNavHidden(pathname) {
  return NAVBAR_EXCLUDED_PATHS.includes(pathname) || pathname === ROUTE_PLAN_NEW;
}

/** Quiz and new-plan hide both the source navbar and the bottom nav. */
export function isImmersiveChromePath(pathname) {
  return isAppNavbarHidden(pathname) && isBottomNavHidden(pathname);
}

export function showsAppFooter(pathname) {
  return pathname === ROUTE_HOME;
}

export function chromeVisibility(pathname) {
  const immersive = isImmersiveChromePath(pathname);
  return {
    top: !immersive,
    /** Home, trips, and popular trips hide the source navbar; desktop still needs it. */
    topDesktopOnly: !immersive && isAppNavbarHidden(pathname),
    bottom: !isBottomNavHidden(pathname),
    footer: showsAppFooter(pathname),
  };
}

export function headerClass(pathname) {
  const mode = chromeVisibility(pathname);
  if (!mode.top) return 'hidden';
  if (mode.topDesktopOnly) return `${APP_SHELL_HEADER_CLASS} hidden md:block`;
  return APP_SHELL_HEADER_CLASS;
}

/**
 * Source primary links (explore, popular trips, plan, trips, quiz).
 * Admin links are omitted; this shell has no role flags.
 */
export function primaryNavItems({
  signedIn = false,
  hasCompletedQuiz = false,
  quizStatusLoading = false,
} = {}) {
  const items = [];
  if (signedIn) {
    items.push({ id: 'explore', href: ROUTE_EXPLORE, labelKey: 'nav.explore' });
  }
  items.push({
    id: 'popularTrips',
    href: ROUTE_POPULAR_TRIPS,
    labelKey: 'nav.popularTrips',
  });
  if (signedIn) {
    items.push({ id: 'plan', href: ROUTE_PLAN_NEW, labelKey: 'nav.planTrip' });
    items.push({ id: 'trips', href: ROUTE_TRIPS, labelKey: 'nav.allTrips' });
  }
  if (!signedIn || (!quizStatusLoading && !hasCompletedQuiz)) {
    items.push({ id: 'quiz', href: ROUTE_QUIZ, labelKey: 'nav.takeTheQuiz' });
  }
  return items;
}

/** Desktop/menu route row. Trips stays on the account cluster so it is not listed twice. */
export function topBarRouteItems(params) {
  return [
    { id: 'home', href: ROUTE_HOME, labelKey: 'nav.home' },
    ...primaryNavItems(params).filter((item) => item.id !== 'trips'),
  ];
}

export function accountNavItems(signedIn) {
  if (signedIn) {
    return [
      { id: 'trips', href: ROUTE_TRIPS, labelKey: 'nav.allTrips' },
      { id: 'settings', href: ROUTE_SETTINGS, labelKey: 'nav.settings' },
      { id: 'signOut', labelKey: 'nav.signOut', action: 'signOut' },
    ];
  }
  return [
    { id: 'signIn', href: ROUTE_AUTH_SIGNIN, labelKey: 'nav.signIn' },
    { id: 'signUp', href: ROUTE_AUTH_SIGNUP, labelKey: 'nav.signUp' },
  ];
}

export function bottomNavItems(signedIn) {
  return [
    { id: 'home', href: ROUTE_HOME, labelKey: 'nav.home', match: 'home' },
    { id: 'explore', href: ROUTE_EXPLORE, labelKey: 'nav.explore', match: 'explore' },
    {
      id: 'community',
      href: ROUTE_POPULAR_TRIPS,
      labelKey: 'nav.community',
      match: 'popular',
    },
    { id: 'plan', href: ROUTE_PLAN_NEW, labelKey: 'nav.planTrip', match: 'plan' },
    {
      id: 'me',
      href: signedIn ? ROUTE_TRIPS : ROUTE_AUTH_SIGNIN,
      labelKey: 'nav.me',
      match: 'trips',
    },
  ];
}

export function isBottomNavItemActive(match, pathname) {
  if (match === 'home') return pathname === ROUTE_HOME;
  if (match === 'explore') {
    return pathname === ROUTE_EXPLORE || pathname.startsWith(`${ROUTE_EXPLORE}/`);
  }
  if (match === 'popular') {
    return pathname === ROUTE_POPULAR_TRIPS || pathname.startsWith(`${ROUTE_POPULAR_TRIPS}/`);
  }
  if (match === 'plan') return pathname.startsWith('/plan');
  if (match === 'trips') {
    return pathname === ROUTE_TRIPS || pathname.startsWith(`${ROUTE_TRIPS}/`);
  }
  return false;
}

export function isNavHrefActive(href, pathname) {
  if (href === ROUTE_HOME) return pathname === ROUTE_HOME;
  if (href === ROUTE_EXPLORE) {
    return pathname === ROUTE_EXPLORE || pathname.startsWith(`${ROUTE_EXPLORE}/`);
  }
  if (href === ROUTE_POPULAR_TRIPS) {
    return pathname === ROUTE_POPULAR_TRIPS || pathname.startsWith(`${ROUTE_POPULAR_TRIPS}/`);
  }
  if (href === ROUTE_PLAN_NEW) return pathname.startsWith('/plan');
  if (href === ROUTE_QUIZ) return pathname === ROUTE_QUIZ || pathname.startsWith(`${ROUTE_QUIZ}/`);
  if (href === ROUTE_TRIPS) return pathname === ROUTE_TRIPS || pathname.startsWith(`${ROUTE_TRIPS}/`);
  if (href === ROUTE_SETTINGS) {
    return pathname === ROUTE_SETTINGS || pathname.startsWith(`${ROUTE_SETTINGS}/`);
  }
  return pathname === href;
}

export function topBarLinkClass(active) {
  if (active) return `${BUTTON_BASE} text-[#ff6b4a]`;
  return BUTTON_BASE;
}

export function bottomNavLinkClass(active) {
  const base =
    'flex min-h-[44px] min-w-[44px] flex-col items-center justify-center rounded-xl px-2 py-1 transition-all duration-200';
  if (active) return `${base} text-[#ff6b4a]`;
  return `${base} text-muted-foreground hover:text-foreground`;
}

export function bottomNavLabelClass(active) {
  const base = 'mt-0.5 text-[10px] font-medium tracking-wide';
  if (active) return `${base} text-[#ff6b4a]`;
  return `${base} text-muted-foreground`;
}

export function accountControlClass(item) {
  if (item.id === 'signUp') return NAV_SIGN_UP_CLASS;
  return NAV_BUTTON_CLASS;
}
