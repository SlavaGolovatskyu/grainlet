import {
  ensureHistoryListener,
  readWindowLocation,
  setLocationState,
  setNavigationType,
} from '../location/location.js';
import { normalizePath } from '../match/match.js';
import { getSSRContext } from '../../ssr/context.js';

let activeBasename = '';
let navigationInterceptor = null;

export function setNavigateBasename(basename = '') {
  const value = normalizeBasename(basename);
  const context = getSSRContext();
  if (context) context.basename = value;
  else activeBasename = value;
}

export function getNavigateBasename() {
  return getSSRContext()?.basename ?? activeBasename;
}

export function normalizeBasename(basename) {
  if (!basename || basename === '/') return '';
  let b = String(basename);
  if (!b.startsWith('/')) b = `/${b}`;
  if (b.endsWith('/')) b = b.slice(0, -1);
  return b;
}

/** Strip basename from pathname for route matching. */
export function stripBasename(pathname, basename) {
  const base = normalizeBasename(basename ?? getNavigateBasename());
  const path = normalizePath(pathname || '/');
  if (!base) return path;
  if (path === base) return '/';
  if (path.startsWith(base + '/')) {
    return normalizePath(path.slice(base.length) || '/');
  }
  return path;
}

/** Prefix basename onto an app path for history URLs. */
export function withBasename(to, basename) {
  const base = normalizeBasename(basename ?? getNavigateBasename());
  const url = typeof to === 'string' ? to : '/';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  const abs = new URL(url, 'http://local.invalid');
  let path = normalizePath(abs.pathname || '/');
  if (base) {
    path = path === '/' ? base : normalizePath(`${base}${path}`);
  }
  return path + (abs.search || '') + (abs.hash || '');
}

export function setNavigationInterceptor(interceptor) {
  navigationInterceptor =
    typeof interceptor === 'function' ? interceptor : null;
}

/**
 * @param {string} to - app path (basename applied automatically)
 * @param {{ replace?: boolean, state?: unknown, basename?: string }} [options]
 */
export function navigate(to, options = {}) {
  if (navigationInterceptor && options.__commit !== true) {
    return navigationInterceptor(to, options);
  }
  return commitNavigate(to, options);
}

export function commitNavigate(to, options = {}) {
  ensureHistoryListener();
  if (typeof window === 'undefined') return;

  if (options.basename != null) {
    setNavigateBasename(options.basename);
  }

  const full = withBasename(to, getNavigateBasename());
  const url = new URL(full, window.location.origin);
  const next = {
    pathname: url.pathname || '/',
    search: url.search || '',
    hash: url.hash || '',
    state: options.state ?? null,
  };

  const current = readWindowLocation();
  const same =
    current.pathname === next.pathname &&
    current.search === next.search &&
    current.hash === next.hash;

  if (options.replace || same) {
    setNavigationType('replace');
    window.history.replaceState(next.state, '', url.pathname + url.search + url.hash);
  } else {
    setNavigationType('push');
    window.history.pushState(next.state, '', url.pathname + url.search + url.hash);
  }

  setLocationState({
    ...next,
    state: window.history.state ?? next.state,
  });
}
