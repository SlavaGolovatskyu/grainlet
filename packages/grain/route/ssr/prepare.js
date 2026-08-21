import { dehydrate, hydrate as hydrateQuery } from '../../query/core.js';
import { getSSRContext, runWithSSR } from '../../ssr/context.js';
import { renderDocument } from '../../ssr/document.js';
import { registerHeadEntry, renderHead } from '../../ssr/head.js';
import { renderToStringAsync } from '../../ssr/render-to-string.js';
import { renderToReadableStream } from '../../ssr/stream.js';
import { matchRouteBranch } from '../match/match.js';
import { stripBasename } from '../navigate/navigate.js';
import {
  hydrateRouteState,
  isRouteRedirect,
} from '../navigation/navigation.js';

function parseUrl(url) {
  const parsed = new URL(url, 'http://localhost');
  return {
    hash: parsed.hash,
    pathname: parsed.pathname || '/',
    search: parsed.search,
    state: null,
  };
}

function serializableMatches(matches) {
  return matches.map(({ id, params, path, pathname }) => ({
    id,
    params,
    path,
    pathname,
  }));
}

function serializeRouteError(error) {
  if (typeof Response === 'function' && error instanceof Response) {
    return {
      message: error.statusText || `HTTP ${error.status}`,
      name: 'ResponseError',
      status: error.status,
    };
  }
  return {
    message: String(error?.message || error),
    name: String(error?.name || 'Error'),
    status: error?.status || error?.statusCode,
  };
}

export async function prepareRoutes(routes, url, options = {}) {
  const location = parseUrl(url);
  const matches = matchRouteBranch(
    routes,
    stripBasename(location.pathname, options.basename || '')
  ) || [];
  const loaderData = new Map();
  const errors = new Map();
  const controller = new AbortController();
  let redirect = null;
  let status = matches.length ? 200 : 404;
  const headers = new Headers();
  const request = typeof Request === 'function'
    ? new Request(new URL(url, 'http://localhost'), {
      method: 'GET',
      signal: controller.signal,
    })
    : { method: 'GET', signal: controller.signal, url };

  for (const match of matches) {
    if (typeof match.route.loader !== 'function') continue;
    try {
      let data = await match.route.loader({
        context: options.context,
        location,
        params: match.params,
        queryClient: options.queryClient,
        request,
        signal: controller.signal,
      });
      if (typeof Response === 'function' && data instanceof Response) {
        data.headers.forEach((value, key) => headers.set(key, value));
        const locationHeader = data.headers.get('location');
        if (locationHeader && data.status >= 300 && data.status < 400) {
          redirect = locationHeader;
          status = data.status;
          break;
        }
        status = data.status;
        if (!data.ok) throw data;
        data = data.status === 204
          ? undefined
          : data.headers.get('content-type')?.includes('application/json')
            ? await data.json()
            : await data.text();
      }
      loaderData.set(match.id, data);
    } catch (error) {
      if (isRouteRedirect(error)) {
        redirect = error.to;
        status = error.status;
      } else {
        errors.set(match.id, error);
        status = error?.status || error?.statusCode || 500;
      }
      break;
    }
  }

  const routeState = {
    actionData: [],
    errors: [...errors].map(([id, error]) => [id, serializeRouteError(error)]),
    loaderData: [...loaderData],
    locationKey: `${location.pathname}${location.search}${location.hash}`,
    matches: serializableMatches(matches),
  };
  const queryState = options.queryClient
    ? dehydrate(options.queryClient)
    : undefined;
  const metadata = [];
  for (const match of matches) {
    const meta = typeof match.route.meta === 'function'
      ? match.route.meta({
        data: loaderData.get(match.id),
        location,
        params: match.params,
      })
      : match.route.meta;
    if (meta) metadata.push(...(Array.isArray(meta) ? meta : [meta]));
  }
  for (const entry of metadata) {
    if (!entry || typeof entry !== 'object') continue;
    if (entry.title != null) {
      registerHeadEntry('title', { children: entry.title, key: entry.key });
    } else {
      const tag = entry.tag
        || (entry.rel ? 'link' : 'meta');
      const { tag: _tag, ...props } = entry;
      registerHeadEntry(tag, props);
    }
  }

  const context = getSSRContext();
  if (context) {
    context.queryState = queryState;
    context.routeState = { ...routeState, errors };
  }
  return {
    errors,
    headers,
    location,
    matches,
    metadata,
    queryState,
    redirect,
    routeState,
    status,
  };
}

export async function renderRoute(Component, props = {}, options = {}) {
  return runWithSSR(async () => {
    const prepared = await prepareRoutes(options.routes || [], options.url || '/', options);
    if (prepared.redirect) return { ...prepared, html: '' };
    const html = await renderToStringAsync(Component, props, {
      maxPasses: options.maxPasses,
      url: options.url,
    });
    return {
      ...prepared,
      head: renderHead(),
      html,
      state: {
        query: prepared.queryState,
        route: prepared.routeState,
      },
    };
  }, {
    request: options.request,
    url: options.url || '/',
  });
}

export async function renderRouteDocument(Component, props = {}, options = {}) {
  const result = await renderRoute(Component, props, options);
  if (result.redirect) return result;
  return {
    ...result,
    document: renderDocument(result.html, {
      ...options.document,
      managedHead: result.head,
      state: result.state,
    }),
  };
}

export async function renderRouteToReadableStream(
  Component,
  props = {},
  options = {}
) {
  const prepared = await runWithSSR(
    () => prepareRoutes(options.routes || [], options.url || '/', options),
    { request: options.request, url: options.url || '/' }
  );
  if (prepared.redirect) return prepared;
  const managedHead = runWithSSR(() => {
    for (const entry of prepared.metadata) {
      if (entry?.title != null) {
        registerHeadEntry('title', { children: entry.title, key: entry.key });
      } else if (entry && typeof entry === 'object') {
        const tag = entry.tag || (entry.rel ? 'link' : 'meta');
        const { tag: _tag, ...headProps } = entry;
        registerHeadEntry(tag, headProps);
      }
    }
    return renderHead();
  }, { url: options.url || '/' });
  const stream = renderToReadableStream(Component, props, {
    ...options,
    document: {
      ...options.document,
      managedHead,
    },
    queryState: prepared.queryState,
    routeState: { ...prepared.routeState, errors: prepared.errors },
    state: () => ({
      query: options.queryClient
        ? dehydrate(options.queryClient)
        : prepared.queryState,
      route: prepared.routeState,
    }),
  });
  return { ...prepared, stream };
}

export function hydrateRouterState(state, queryClient) {
  if (!state) return;
  hydrateRouteState(state.route);
  if (queryClient && state.query) hydrateQuery(queryClient, state.query);
}
