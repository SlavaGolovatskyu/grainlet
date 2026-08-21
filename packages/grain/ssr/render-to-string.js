import {
  setCurrentComponent,
  currentComponent,
} from '../signals/reactive-context/reactive-context.js';
import { untrack } from '../signals/untrack/untrack.js';
import { setLocationState } from '../route/location/location.js';
import {
  runWithSSR,
  clearSSRPending,
  getSSRContext,
  getSSRPending,
} from './context.js';
import { serializeVnode } from './serialize.js';

function parseUrl(url) {
  try {
    const u = new URL(url, 'http://localhost');
    return {
      pathname: u.pathname || '/',
      search: u.search || '',
      hash: u.hash || '',
      state: null,
    };
  } catch {
    return { pathname: '/', search: '', hash: '', state: null };
  }
}

function createSSROwner() {
  return {
    _effects: [],
    _cleanups: [],
    _effectsInitialized: true,
    _renderCount: 1,
    _children: new Map(),
    _bindings: [],
  };
}

/** Resolve a component type to the user function that returns a vnode. */
function getComponentFn(type) {
  if (typeof type !== 'function') {
    throw new TypeError('Expected a component function');
  }
  if (typeof type._ssrFn === 'function') return type._ssrFn;
  return type;
}

export function renderComponentForSSR(type, props) {
  const fn = getComponentFn(type);
  const owner = createSSROwner();
  const previous = currentComponent;
  setCurrentComponent(owner);
  try {
    return untrack(() => fn(props));
  } finally {
    setCurrentComponent(previous);
  }
}

/**
 * Render a component tree to an HTML string.
 *
 * @param {Function} type - Component function or createComponent factory
 * @param {object} [props]
 * @param {{ url?: string }} [options]
 */
export function renderToString(type, props = {}, options = {}) {
  const render = () => {
    if (options.url) {
      setLocationState(parseUrl(options.url));
    }

    const vnode = renderComponentForSSR(type, props);
    return serializeVnode(vnode, renderComponentForSSR);
  };
  return getSSRContext()
    ? render()
    : runWithSSR(render, { url: options.url || null });
}

/**
 * Render a component tree to HTML, awaiting Suspense-tracked promises
 * (`lazy`, `createResource`) until the tree is ready (not the fallback).
 *
 * @param {Function} type
 * @param {object} [props]
 * @param {{ url?: string, maxPasses?: number }} [options]
 * @returns {Promise<string>}
 */
export async function renderToStringAsync(type, props = {}, options = {}) {
  const maxPasses = options.maxPasses ?? 25;

  const render = async () => {
    if (options.url) {
      setLocationState(parseUrl(options.url));
    }

    for (let pass = 0; pass < maxPasses; pass++) {
      clearSSRPending();
      const vnode = renderComponentForSSR(type, props);
      // Nested components (Suspense, lazy, resources) run during serialize.
      const html = serializeVnode(vnode, renderComponentForSSR);
      const pending = getSSRPending();
      const list = pending ? [...pending] : [];

      if (list.length === 0) {
        return html;
      }

      await Promise.all(
        list.map((p) => Promise.resolve(p).catch(() => {}))
      );
    }

    throw new Error(
      `renderToStringAsync: exceeded maxPasses (${maxPasses}); still waiting on Suspense`
    );
  };
  return getSSRContext()
    ? render()
    : runWithSSR(render, { url: options.url || null });
}
