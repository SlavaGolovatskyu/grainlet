import { createSignal } from '../../signals/createSignal/createSignal.js';
import { matchRouteBranch } from '../match/match.js';
import {
  commitNavigate,
  setNavigationInterceptor,
  stripBasename,
  withBasename,
} from '../navigate/navigate.js';
import {
  getNavigationType,
  readLocation,
} from '../location/location.js';
import { applyRouteHeadEntries } from '../../ssr/head.js';

const [navigationState, setNavigationState] = createSignal({
  state: 'idle',
  location: undefined,
  formAction: undefined,
  formData: undefined,
  formMethod: undefined,
});
const [routeState, setRouteState] = createSignal({
  actionData: new Map(),
  errors: new Map(),
  loaderData: new Map(),
  locationKey: null,
  matches: [],
});

let activeConfig = null;
let activeAbortController = null;
let pendingKey = null;
let lastHydratedState = null;
const scrollPositions = new Map();

function locationKey(location) {
  return `${location.pathname}${location.search}${location.hash}`;
}

function parseTarget(to, basename = '') {
  const base = typeof window === 'undefined'
    ? 'http://localhost'
    : window.location.origin;
  const url = new URL(withBasename(to, basename), base);
  return {
    hash: url.hash || '',
    pathname: url.pathname || '/',
    search: url.search || '',
    state: null,
  };
}

function createRequest(location, init = {}) {
  const base = typeof window === 'undefined'
    ? 'http://localhost'
    : window.location.origin;
  const url = new URL(
    `${location.pathname}${location.search}${location.hash}`,
    base
  );
  if (typeof Request === 'function') return new Request(url, init);
  return { method: init.method || 'GET', signal: init.signal, url: String(url) };
}

export class RouteRedirect extends Error {
  constructor(to, options = {}) {
    super(`Redirect to ${to}`);
    this.name = 'RouteRedirect';
    this.to = to;
    this.replace = options.replace !== false;
    this.status = options.status || 302;
  }
}

export function redirect(to, options) {
  throw new RouteRedirect(to, options);
}

export function isRouteRedirect(error) {
  return error instanceof RouteRedirect;
}

async function resolveRouteResult(result) {
  result = await result;
  if (typeof Response !== 'function' || !(result instanceof Response)) {
    return result;
  }
  const location = result.headers.get('location');
  if (location && result.status >= 300 && result.status < 400) {
    throw new RouteRedirect(location, { status: result.status });
  }
  if (!result.ok) throw result;
  if (result.status === 204) return undefined;
  return result.headers.get('content-type')?.includes('application/json')
    ? result.json()
    : result.text();
}

async function executeLoaders(matches, location, config, signal, reason) {
  const previous = routeState();
  const loaderData = new Map(previous.loaderData);
  const errors = new Map();
  const request = createRequest(location, { method: 'GET', signal });

  for (const match of matches) {
    const loader = match.route.loader;
    if (typeof loader !== 'function') continue;
    const shouldRun = reason !== 'hydrate'
      && (typeof match.route.shouldRevalidate !== 'function'
        || match.route.shouldRevalidate({
          currentLocation: readLocation(),
          nextLocation: location,
          reason,
        }) !== false);
    if (!shouldRun && loaderData.has(match.id)) continue;
    try {
      const data = await resolveRouteResult(loader({
        context: config.context,
        location,
        params: match.params,
        queryClient: config.queryClient,
        request,
        signal,
      }));
      if (signal.aborted) throw signal.reason;
      loaderData.set(match.id, data);
    } catch (error) {
      if (isRouteRedirect(error) || signal.aborted) throw error;
      errors.set(match.id, error);
      break;
    }
  }
  return { errors, loaderData };
}

function collectMetadata(matches, loaderData, location) {
  const metadata = [];
  for (const match of matches) {
    const value = typeof match.route.meta === 'function'
      ? match.route.meta({
        data: loaderData.get(match.id),
        location,
        params: match.params,
      })
      : match.route.meta;
    if (value) metadata.push(...(Array.isArray(value) ? value : [value]));
  }
  return metadata;
}

async function loadLocation(location, options = {}) {
  const config = activeConfig;
  if (!config) return null;
  const key = locationKey(location);
  if (options.commit !== false && typeof window !== 'undefined') {
    scrollPositions.set(locationKey(readLocation()), {
      x: window.scrollX || 0,
      y: window.scrollY || 0,
    });
  }
  const pathname = stripBasename(location.pathname, config.basename);
  const matches = matchRouteBranch(config.routes, pathname) || [];
  activeAbortController?.abort(new DOMException('Navigation superseded', 'AbortError'));
  const controller = new AbortController();
  activeAbortController = controller;
  pendingKey = key;
  setNavigationState({
    state: 'loading',
    location,
    formAction: undefined,
    formData: undefined,
    formMethod: undefined,
  });

  try {
    const loaded = await executeLoaders(
      matches,
      location,
      config,
      controller.signal,
      options.reason || 'navigation'
    );
    if (controller.signal.aborted || pendingKey !== key) return null;
    setRouteState({
      ...routeState(),
      errors: loaded.errors,
      loaderData: loaded.loaderData,
      locationKey: key,
      matches,
    });
    applyRouteHeadEntries(collectMetadata(matches, loaded.loaderData, location));
    if (options.commit !== false) {
      commitNavigate(
        `${stripBasename(location.pathname, config.basename)}${location.search}${location.hash}`,
        options
      );
      if (!options.preventScrollReset && typeof window !== 'undefined') {
        const scroll = config.scrollRestoration;
        if (scroll !== false) window.scrollTo?.(0, 0);
      }
    } else if (options.reason === 'pop' && typeof window !== 'undefined') {
      const position = scrollPositions.get(key);
      if (position && config.scrollRestoration !== false) {
        queueMicrotask(() => window.scrollTo?.(position.x, position.y));
      }
    }
    return routeState();
  } catch (error) {
    if (isRouteRedirect(error)) {
      return loadLocation(parseTarget(error.to, config.basename), {
        commit: true,
        replace: error.replace,
      });
    }
    if (!controller.signal.aborted) throw error;
    return null;
  } finally {
    const ownsNavigation = activeAbortController === controller;
    if (ownsNavigation) activeAbortController = null;
    if (ownsNavigation && pendingKey === key) pendingKey = null;
    if (ownsNavigation) {
      setNavigationState({
        state: 'idle',
        location: undefined,
        formAction: undefined,
        formData: undefined,
        formMethod: undefined,
      });
    }
  }
}

export function configureNavigation(config) {
  activeConfig = config;
  setNavigationInterceptor((to, options = {}) =>
    loadLocation(parseTarget(to, config.basename), {
      ...options,
      commit: true,
    })
  );
  const location = readLocation();
  const key = locationKey(location);
  const state = routeState();
  if (state.locationKey !== key && pendingKey !== key) {
    const pathname = stripBasename(location.pathname, config.basename);
    const matches = matchRouteBranch(config.routes, pathname) || [];
    const hasLoaders = matches.some((match) =>
      typeof match.route.loader === 'function'
    );
    if (hasLoaders) {
      loadLocation(location, {
        commit: false,
        reason: getNavigationType() === 'pop' ? 'pop' : 'initial',
      }).catch(() => {});
    } else {
      setRouteState({
        ...state,
        errors: new Map(),
        loaderData: new Map(),
        locationKey: key,
        matches,
      });
      applyRouteHeadEntries(collectMetadata(matches, new Map(), location));
      if (getNavigationType() === 'pop'
        && config.scrollRestoration !== false
        && typeof window !== 'undefined') {
        const position = scrollPositions.get(key);
        if (position) {
          queueMicrotask(() => window.scrollTo?.(position.x, position.y));
        }
      }
    }
  }
  return {
    navigation: navigationState,
    routeState,
  };
}

export async function submitRoute(target, options = {}) {
  if (!activeConfig) throw new Error('useSubmit requires a nested Router');
  const location = parseTarget(target, activeConfig.basename);
  const pathname = stripBasename(location.pathname, activeConfig.basename);
  const matches = matchRouteBranch(activeConfig.routes, pathname) || [];
  const actionMatch = [...matches].reverse().find((match) =>
    typeof match.route.action === 'function'
  );
  if (!actionMatch) throw new Error(`No route action matched ${target}`);

  activeAbortController?.abort(new DOMException('Submission superseded', 'AbortError'));
  const controller = new AbortController();
  activeAbortController = controller;
  const method = String(options.method || 'POST').toUpperCase();
  const formData = options.formData
    ?? (options.data instanceof FormData ? options.data : null);
  setNavigationState({
    state: 'submitting',
    location,
    formAction: target,
    formData,
    formMethod: method,
  });

  try {
    const data = await resolveRouteResult(actionMatch.route.action({
      context: activeConfig.context,
      formData,
      location,
      params: actionMatch.params,
      queryClient: activeConfig.queryClient,
      request: createRequest(location, {
        body: method === 'GET' ? undefined : formData,
        method,
        signal: controller.signal,
      }),
      signal: controller.signal,
    }));
    const actionData = new Map(routeState().actionData);
    actionData.set(actionMatch.id, data);
    setRouteState({ ...routeState(), actionData });
    return loadLocation(location, { commit: options.navigate !== false, reason: 'action' });
  } catch (error) {
    if (isRouteRedirect(error)) {
      return loadLocation(parseTarget(error.to, activeConfig.basename), {
        commit: true,
        replace: error.replace,
      });
    }
    const errors = new Map(routeState().errors);
    errors.set(actionMatch.id, error);
    setRouteState({ ...routeState(), errors });
    throw error;
  } finally {
    if (activeAbortController === controller) {
      activeAbortController = null;
      setNavigationState({
        state: 'idle',
        location: undefined,
        formAction: undefined,
        formData: undefined,
        formMethod: undefined,
      });
    }
  }
}

export function useNavigation() {
  return {
    state: () => navigationState().state,
    location: () => navigationState().location,
    formAction: () => navigationState().formAction,
    formData: () => navigationState().formData,
    formMethod: () => navigationState().formMethod,
  };
}

export function useSubmit() {
  return submitRoute;
}

export function getRouteState() {
  return routeState;
}

export function hydrateRouteState(state) {
  if (!state || state === lastHydratedState) return;
  lastHydratedState = state;
  setRouteState({
    actionData: new Map(state.actionData || []),
    errors: new Map(state.errors || []),
    loaderData: new Map(state.loaderData || []),
    locationKey: state.locationKey || null,
    matches: state.matches || [],
  });
}

export function dehydrateRouteState() {
  const state = routeState();
  return {
    actionData: [...state.actionData],
    errors: [...state.errors].map(([id, error]) => [
      id,
      {
        message: String(error?.message || error),
        name: String(error?.name || 'Error'),
        status: error?.status || error?.statusCode,
      },
    ]),
    loaderData: [...state.loaderData],
    locationKey: state.locationKey,
    matches: state.matches.map((match) => ({
      id: match.id,
      params: match.params,
      path: match.path,
      pathname: match.pathname,
    })),
  };
}

export function RouteHydrationBoundary(props) {
  hydrateRouteState(props.state);
  return props.children;
}
