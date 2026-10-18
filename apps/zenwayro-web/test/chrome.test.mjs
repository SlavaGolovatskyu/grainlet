import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  accountNavItems,
  BOTTOM_NAV_CLASS,
  bottomNavItems,
  chromeVisibility,
  headerClass,
  isAppNavbarHidden,
  isBottomNavHidden,
  isBottomNavItemActive,
  isImmersiveChromePath,
  primaryNavItems,
  showsAuthenticatedNav,
  topBarRouteItems,
} from '../src/chrome/nav.js';
import {
  badgeCount,
  formatBadgeCount,
  notificationErrorMessage,
  notificationItems,
  unreadNotifications,
} from '../src/chrome/notifications.js';
import {
  applyDarkClass,
  normalizeTheme,
  readStoredTheme,
  shouldUseDarkClass,
  THEME_STORAGE_KEY,
} from '../src/chrome/theme.js';

const ids = (items) => items.map((item) => item.id);

test('shouldUseDarkClass follows light, dark, and system', () => {
  assert.equal(shouldUseDarkClass('light', true), false);
  assert.equal(shouldUseDarkClass('light', false), false);
  assert.equal(shouldUseDarkClass('dark', false), true);
  assert.equal(shouldUseDarkClass('dark', true), true);
  assert.equal(shouldUseDarkClass('system', false), false);
  assert.equal(shouldUseDarkClass('system', true), true);
  assert.equal(shouldUseDarkClass('nope', true), false);
  assert.equal(normalizeTheme(null), 'light');
});

test('readStoredTheme and applyDarkClass use zenwayro-theme', () => {
  assert.equal(THEME_STORAGE_KEY, 'zenwayro-theme');
  const saved = new Map();
  const storage = {
    getItem: (key) => saved.get(key) ?? null,
  };
  assert.equal(readStoredTheme(storage), 'light');
  saved.set(THEME_STORAGE_KEY, 'dark');
  assert.equal(readStoredTheme(storage), 'dark');
  saved.set(THEME_STORAGE_KEY, 'system');
  assert.equal(readStoredTheme(storage), 'system');

  const classes = new Set();
  const root = {
    classList: {
      toggle(name, on) {
        if (on) classes.add(name);
        else classes.delete(name);
      },
    },
  };
  assert.equal(applyDarkClass(root, 'system', true), true);
  assert.equal(classes.has('dark'), true);
  assert.equal(applyDarkClass(root, 'light', true), false);
  assert.equal(classes.has('dark'), false);
});

test('signed-out account links are sign in and sign up', () => {
  const items = accountNavItems(false);
  assert.deepEqual(ids(items), ['signIn', 'signUp']);
  assert.equal(items[0].href, '/auth/signin');
  assert.equal(items[1].href, '/auth/signup');
});

test('signed-in account links are trips, settings, and sign out', () => {
  const items = accountNavItems(true);
  assert.deepEqual(ids(items), ['trips', 'settings', 'signOut']);
  assert.equal(items[0].href, '/trips');
  assert.equal(items[1].href, '/settings');
  assert.equal(items[2].action, 'signOut');
  assert.equal(showsAuthenticatedNav('authenticated'), true);
  assert.equal(showsAuthenticatedNav('loading'), true);
  assert.equal(showsAuthenticatedNav('unauthenticated'), false);
});

test('primary nav visibility matches the source navbar rules', () => {
  assert.deepEqual(ids(primaryNavItems({ signedIn: false })), ['popularTrips', 'quiz']);
  assert.deepEqual(
    ids(primaryNavItems({ signedIn: true, hasCompletedQuiz: true })),
    ['explore', 'popularTrips', 'plan', 'trips']
  );
  assert.deepEqual(
    ids(
      primaryNavItems({
        signedIn: true,
        hasCompletedQuiz: false,
        quizStatusLoading: false,
      })
    ),
    ['explore', 'popularTrips', 'plan', 'trips', 'quiz']
  );
  assert.deepEqual(
    ids(
      primaryNavItems({
        signedIn: true,
        hasCompletedQuiz: true,
        quizStatusLoading: true,
      })
    ),
    ['explore', 'popularTrips', 'plan', 'trips']
  );
  assert.equal(primaryNavItems({ signedIn: true })[2].href, '/plan/new');
});

test('top bar includes home and does not repeat trips', () => {
  assert.deepEqual(ids(topBarRouteItems({ signedIn: false })), ['home', 'popularTrips', 'quiz']);
  assert.deepEqual(
    ids(topBarRouteItems({ signedIn: true, hasCompletedQuiz: false })),
    ['home', 'explore', 'popularTrips', 'plan', 'quiz']
  );
  assert.equal(topBarRouteItems({ signedIn: false })[0].href, '/');
});

test('bottom nav me target depends on the session', () => {
  assert.equal(bottomNavItems(false).find((item) => item.id === 'me').href, '/auth/signin');
  assert.equal(bottomNavItems(true).find((item) => item.id === 'me').href, '/trips');
  assert.deepEqual(ids(bottomNavItems(true)), ['home', 'explore', 'community', 'plan', 'me']);
  assert.equal(bottomNavItems(true)[2].href, '/popular-trips');
  assert.equal(bottomNavItems(true)[3].href, '/plan/new');
  assert.equal(BOTTOM_NAV_CLASS.includes('md:hidden'), true);
});

test('bottom nav active matching follows source prefixes', () => {
  assert.equal(isBottomNavItemActive('home', '/'), true);
  assert.equal(isBottomNavItemActive('home', '/explore'), false);
  assert.equal(isBottomNavItemActive('explore', '/explore/map'), true);
  assert.equal(isBottomNavItemActive('popular', '/popular-trips/italy'), true);
  assert.equal(isBottomNavItemActive('plan', '/plan/abc'), true);
  assert.equal(isBottomNavItemActive('plan', '/explore'), false);
  assert.equal(isBottomNavItemActive('trips', '/trips/1'), true);
});

test('chrome visibility hides quiz and new-plan, and keeps the home footer', () => {
  assert.equal(isImmersiveChromePath('/quiz'), true);
  assert.equal(isImmersiveChromePath('/plan/new'), true);
  assert.equal(isImmersiveChromePath('/'), false);
  assert.deepEqual(chromeVisibility('/quiz'), {
    top: false,
    topDesktopOnly: false,
    bottom: false,
    footer: false,
  });
  assert.deepEqual(chromeVisibility('/plan/new'), {
    top: false,
    topDesktopOnly: false,
    bottom: false,
    footer: false,
  });
  assert.equal(chromeVisibility('/').footer, true);
  assert.equal(chromeVisibility('/').bottom, true);
  assert.equal(chromeVisibility('/').topDesktopOnly, true);
  assert.equal(headerClass('/').includes('hidden md:block'), true);
  assert.equal(headerClass('/explore').includes('hidden'), false);
  assert.equal(isAppNavbarHidden('/'), true);
  assert.equal(isAppNavbarHidden('/trips'), true);
  assert.equal(isAppNavbarHidden('/popular-trips'), true);
  assert.equal(isAppNavbarHidden('/explore'), false);
  assert.equal(isBottomNavHidden('/quiz'), true);
  assert.equal(isBottomNavHidden('/plan/new'), true);
  assert.equal(isBottomNavHidden('/explore'), false);
});

test('notification helpers keep unread rows, badge text, and errors', () => {
  const items = notificationItems({
    items: [
      { id: 'a', readAt: null },
      { id: 'b', readAt: '2026-01-01T00:00:00.000Z' },
    ],
  });
  assert.deepEqual(ids(unreadNotifications(items)), ['a']);
  assert.equal(badgeCount({ count: 4 }, items), 4);
  assert.equal(badgeCount(null, items), 1);
  assert.equal(formatBadgeCount(12), '9+');
  assert.equal(formatBadgeCount(3), '3');
  assert.equal(formatBadgeCount(0), '');
  assert.equal(notificationErrorMessage(new Error('nope'), 'fallback'), 'nope');
  assert.equal(notificationErrorMessage(null, 'fallback'), 'fallback');
  assert.equal(notificationItems(null).length, 0);
});
