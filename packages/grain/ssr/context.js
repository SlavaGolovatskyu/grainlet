import { setServerMode, isServer } from '../signals/env.js';

let ssrContext = null;
let requestStorage = null;

function detectAsyncLocalStorage() {
  const fromProcess = globalThis.process
    ?.getBuiltinModule?.('node:async_hooks')
    ?.AsyncLocalStorage;
  if (typeof fromProcess === 'function') return fromProcess;
  if (typeof globalThis.AsyncLocalStorage === 'function') {
    return globalThis.AsyncLocalStorage;
  }
  return null;
}

const DetectedAsyncLocalStorage = detectAsyncLocalStorage();
if (DetectedAsyncLocalStorage) {
  requestStorage = new DetectedAsyncLocalStorage();
}

export function setSSRContextStorage(storage) {
  if (storage?.getStore && storage?.run) requestStorage = storage;
}

export function ensureSSRContextStorage() {
  if (requestStorage) return requestStorage;
  const ALS = detectAsyncLocalStorage();
  if (typeof ALS === 'function') {
    requestStorage = new ALS();
  }
  return requestStorage;
}

export function getSSRContext() {
  return requestStorage?.getStore() ?? ssrContext;
}

export { isServer };

/**
 * Thenables registered during an SSR render pass (lazy / createResource).
 * Used by renderToStringAsync to await before the next pass.
 */
export function getSSRPending() {
  return getSSRContext()?.pending ?? null;
}

export function clearSSRPending() {
  const context = getSSRContext();
  if (context?.pending) {
    context.pending.clear();
  }
}

/** Register a thenable for renderToStringAsync. No-op off the server. */
export function trackSSRThenables(thenable) {
  const context = getSSRContext();
  if (!context || thenable == null) return;
  if (typeof thenable.then !== 'function') return;
  if (!context.pending) {
    context.pending = new Set();
  }
  context.pending.add(thenable);
}

/**
 * Per-request cache so createResource resolves sync on later async SSR passes.
 * @returns {Map<string, { status: string, value?: unknown, error?: unknown }> | null}
 */
export function getSSRResourceCache() {
  const context = getSSRContext();
  if (!context) return null;
  if (!context.resourceCache) {
    context.resourceCache = new Map();
  }
  return context.resourceCache;
}

export function createSSRContext(context = {}) {
  return {
    ...context,
    head: context.head instanceof Map ? context.head : new Map(),
    pending: new Set(),
    queryState: context.queryState ?? null,
    resourceCache:
      context.resourceCache instanceof Map
        ? context.resourceCache
        : new Map(),
    routeState: context.routeState ?? null,
    url: context.url ?? null,
  };
}

/**
 * Run `fn` in SSR mode (effects skipped; memos sync-evaluated).
 * Supports async `fn` — keeps server mode on until the promise settles.
 */
export function runWithSSR(fn, context = {}) {
  const nextContext = createSSRContext(context);
  if (requestStorage) {
    setServerMode(true);
    try {
      const result = requestStorage.run(nextContext, fn);
      if (result != null && typeof result.then === 'function') {
        return Promise.resolve(result).finally(() => setServerMode(false));
      }
      setServerMode(false);
      return result;
    } catch (error) {
      setServerMode(false);
      throw error;
    }
  }

  const previous = ssrContext;
  ssrContext = nextContext;
  setServerMode(true);

  const cleanup = () => {
    setServerMode(false);
    ssrContext = previous;
  };

  try {
    const result = fn();
    if (result != null && typeof result.then === 'function') {
      return Promise.resolve(result).finally(cleanup);
    }
    cleanup();
    return result;
  } catch (err) {
    cleanup();
    throw err;
  }
}
