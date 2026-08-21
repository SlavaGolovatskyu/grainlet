import { createComponent } from '../../core/component/component.js';
import { jsx } from '../../core/jsx-compiler-new/jsx-runtime.js';
import { asArray } from '../../core/flow/resolve.js';
import { ensureHistoryListener, getLocationSignal } from '../location/location.js';
import { matchRouteBranch, matchRoutes } from '../match/match.js';
import {
  RouteContext,
  setCurrentRouteMatch,
} from '../context/context.js';
import { publishParams } from '../useParams/useParams.js';
import { Route } from '../Route/Route.js';
import {
  setNavigateBasename,
  stripBasename,
  normalizeBasename,
} from '../navigate/navigate.js';
import { configureNavigation } from '../navigation/navigation.js';
import { hydrateRouteState } from '../navigation/navigation.js';
import { getSSRContext, isServer } from '../../ssr/context.js';

/**
 * Turn Router children / routes prop into { path, component, children }[].
 */
export function routesFromChildren(children) {
  const nodes = asArray(children);
  const routes = [];

  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue;

    const type = node.type;
    const isRouteType =
      type === Route || type?.$$route === true || type?.name === 'Route';

    if (!isRouteType) continue;

    const props = node.props || {};
    const nested = [
      ...asArray(props.children),
      ...asArray(node.children),
    ];

    routes.push({
      ...props,
      path: props.index ? undefined : (props.path ?? '/'),
      children: routesFromChildren(nested),
    });
  }

  return routes;
}

function renderRouteElement(route, routeProps, outlet) {
  const element = route.element ?? route.component;
  if (typeof element === 'function') return jsx(element, routeProps);
  if (element && typeof element === 'object') return element;
  return outlet;
}

export function renderNestedBranch(matches, options = {}) {
  let outlet = null;
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const match = matches[index];
    const routeProps = {
      ...(options.pageProps || {}),
      params: match.params,
      location: options.location,
      data: options.loaderData?.get?.(match.id),
      error: options.errors?.get?.(match.id),
      matches,
    };
    const content = renderRouteElement(match.route, routeProps, outlet);
    const value = {
      ...options.context,
      index,
      actionData: options.actionData,
      errors: options.errors,
      loaderData: options.loaderData,
      match,
      matches,
      outlet,
    };
    outlet = jsx(RouteContext.Provider, { value }, content);
  }
  return outlet;
}

/**
 * Matches location against Route children (or `routes` array) and renders the page.
 *
 * @param {{ basename?: string, routes?: array, children?: any, pageProps?: object }} props
 */
export const Router = createComponent((props) => {
  ensureHistoryListener();
  const basename = normalizeBasename(props.basename ?? '');
  setNavigateBasename(basename);

  const location = getLocationSignal();

  const routes =
    props.routes ??
    routesFromChildren(props.children);

  const pathname = stripBasename(location().pathname, basename);
  if (props.mode === 'nested') {
    const serverRouteState = isServer() ? getSSRContext()?.routeState : null;
    if (!isServer() && props.hydrationState) {
      hydrateRouteState(props.hydrationState);
    }
    const controller = isServer()
      ? null
      : configureNavigation({
        basename,
        context: props.context,
        queryClient: props.queryClient,
        routes,
        scrollRestoration: props.scrollRestoration,
      });
    const rawRouteState = serverRouteState ?? controller?.routeState() ?? {};
    const currentRouteState = {
      actionData: rawRouteState.actionData instanceof Map
        ? rawRouteState.actionData
        : new Map(rawRouteState.actionData || []),
      errors: rawRouteState.errors instanceof Map
        ? rawRouteState.errors
        : new Map(),
      loaderData: rawRouteState.loaderData instanceof Map
        ? rawRouteState.loaderData
        : new Map(rawRouteState.loaderData || []),
    };
    const currentNavigation = controller?.navigation() ?? { state: 'idle' };
    const matches = matchRouteBranch(routes, pathname);
    const leaf = matches?.[matches.length - 1] ?? null;
    if (!isServer()) {
      setCurrentRouteMatch(leaf);
      publishParams(leaf?.params ?? {});
    }
    if (!matches?.length) {
      return props.fallback
        ?? jsx('div', { 'data-router': 'empty' }, 'No route matched');
    }
    if (currentNavigation.state !== 'idle' && props.fallback != null) {
      return typeof props.fallback === 'function'
        ? props.fallback(currentNavigation)
        : props.fallback;
    }
    let renderMatches = matches;
    let renderErrors = currentRouteState.errors;
    const errorEntry = [...currentRouteState.errors.entries()].at(-1);
    if (errorEntry) {
      const errorIndex = matches.findIndex((match) => match.id === errorEntry[0]);
      let boundaryIndex = errorIndex;
      while (boundaryIndex >= 0
        && !matches[boundaryIndex].route.errorElement) {
        boundaryIndex -= 1;
      }
      if (boundaryIndex >= 0) {
        const boundary = matches[boundaryIndex];
        renderMatches = matches.slice(0, boundaryIndex + 1);
        renderMatches[boundaryIndex] = {
          ...boundary,
          route: {
            ...boundary.route,
            element: boundary.route.errorElement,
          },
        };
        renderErrors = new Map(currentRouteState.errors);
        renderErrors.set(boundary.id, errorEntry[1]);
      } else if (props.errorElement) {
        return jsx(props.errorElement, { error: errorEntry[1] });
      }
    }
    return jsx(
      'div',
      {
        'data-router': 'nested',
        'data-path': leaf.path,
        'data-basename': basename || undefined,
      },
      renderNestedBranch(renderMatches, {
        context: props.context,
        errors: renderErrors,
        loaderData: props.loaderData ?? currentRouteState.loaderData,
        location: location(),
        pageProps: props.pageProps,
      })
    );
  }

  const matched = matchRoutes(routes, pathname);

  setCurrentRouteMatch(matched);
  publishParams(matched?.params ?? {});

  const Page = matched?.component;
  if (!Page) {
    return jsx('div', { 'data-router': 'empty' }, 'No route matched');
  }

  const pageProps = {
    ...(props.pageProps || {}),
    params: matched.params,
    location: location(),
  };

  return jsx(
    'div',
    {
      'data-router': 'outlet',
      'data-path': matched.path,
      'data-basename': basename || undefined,
    },
    jsx(Page, pageProps)
  );
});
