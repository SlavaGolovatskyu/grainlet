import { createSignal } from '../../signals/createSignal/createSignal.js';
import { getSSRContext, isServer } from '../../ssr/context.js';

function readWindowLocation() {
  if (typeof window === 'undefined') {
    return { pathname: '/', search: '', hash: '', state: null };
  }
  return {
    pathname: window.location.pathname || '/',
    search: window.location.search || '',
    hash: window.location.hash || '',
    state: window.history.state ?? null,
  };
}

const [getLocation, setLocation] = createSignal(readWindowLocation());

let listening = false;
let navigationType = 'initial';

export function ensureHistoryListener() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener('popstate', () => {
    navigationType = 'pop';
    setLocation(readWindowLocation());
  });
}

export function getLocationSignal() {
  return () => readLocation();
}

export function setLocationState(next) {
  const context = isServer() ? getSSRContext() : null;
  if (context) {
    context.location = next;
    return;
  }
  setLocation(next);
}

export function setNavigationType(type) {
  navigationType = type;
}

export function getNavigationType() {
  return navigationType;
}

export function readLocation() {
  const context = isServer() ? getSSRContext() : null;
  if (context?.location) return context.location;
  if (context?.url) {
    try {
      const url = new URL(context.url, 'http://localhost');
      return {
        hash: url.hash,
        pathname: url.pathname || '/',
        search: url.search,
        state: null,
      };
    } catch {
      // use global fallback
    }
  }
  return getLocation();
}

export { readWindowLocation };
