import type { Accessor } from './signals.js';
import type { Component } from './component.js';
import type { QueryClient, DehydratedState } from './query.js';
import type { JSX } from '../jsx-runtime.js';

export interface Location {
  pathname: string;
  search: string;
  hash: string;
  state: unknown;
}

export interface NavigateOptions {
  replace?: boolean;
  state?: unknown;
  basename?: string;
  preventScrollReset?: boolean;
}

export declare function navigate(
  to: string,
  options?: NavigateOptions
): void | Promise<unknown>;

export declare function setNavigateBasename(basename?: string): void;

export declare function getNavigateBasename(): string;

export interface RouteProps {
  path?: string;
  component?: Component<Record<string, unknown>>;
  element?: JSX.Element | Component<Record<string, unknown>>;
  index?: boolean;
  id?: string;
  loader?: RouteLoader;
  action?: RouteAction;
  shouldRevalidate?: ShouldRevalidate;
  errorElement?: JSX.Element | Component<Record<string, unknown>>;
  handle?: unknown;
  meta?: RouteMeta;
  getStaticPaths?: () =>
    | Array<string | Record<string, string> | { params: Record<string, string> }>
    | Promise<Array<string | Record<string, string> | { params: Record<string, string> }>>;
  children?: JSX.Element;
}

export declare function Route(props: RouteProps): JSX.Element;

export interface RouterProps {
  mode?: 'flat' | 'nested';
  basename?: string;
  routes?: RouteDescriptor[];
  children?: JSX.Element;
  pageProps?: Record<string, unknown>;
  context?: unknown;
  queryClient?: QueryClient;
  hydrationState?: DehydratedRouteState;
  fallback?: JSX.Element | ((navigation: NavigationSnapshot) => JSX.Element);
  errorElement?: Component<{ error: unknown }>;
  scrollRestoration?: boolean;
}

export interface RouteLoaderArgs {
  request: Request;
  params: Record<string, string>;
  location: Location;
  signal: AbortSignal;
  queryClient?: QueryClient;
  context?: unknown;
  formData?: FormData | null;
}

export type RouteLoader = (args: RouteLoaderArgs) => unknown | Promise<unknown>;
export type RouteAction = RouteLoader;
export type ShouldRevalidate = (args: {
  currentLocation: Location;
  nextLocation: Location;
  reason: string;
}) => boolean;
export type RouteMeta =
  | Record<string, unknown>
  | Record<string, unknown>[]
  | ((args: {
      data: unknown;
      location: Location;
      params: Record<string, string>;
    }) => Record<string, unknown> | Record<string, unknown>[]);

export interface RouteDescriptor extends Omit<RouteProps, 'children'> {
  path?: string;
  children?: RouteDescriptor[];
}

export declare function Router(props: RouterProps): JSX.Element;

export interface LinkProps {
  href?: string;
  to?: string;
  class?: string;
  className?: string;
  activeClass?: string;
  replace?: boolean;
  state?: unknown;
  target?: string;
  children?: JSX.Element;
  onClick?: (e: MouseEvent) => void;
  onclick?: (e: MouseEvent) => void;
  [key: string]: unknown;
}

export declare function Link(props: LinkProps): JSX.Element;

export declare function useLocation(): Accessor<Location>;

export declare function useParams<
  T extends Record<string, string> = Record<string, string>,
>(): Accessor<T>;

export interface PathMatch {
  params: Record<string, string>;
  score: number;
}

export interface FlatRouteMatch extends PathMatch {
  route: RouteDescriptor;
  path: string;
  component?: Component;
}

export interface RouteMatch {
  id: string;
  path: string;
  pathname: string;
  params: Record<string, string>;
  route: RouteDescriptor;
  handle?: unknown;
}

export declare function matchPath(
  pattern: string,
  pathname: string
): PathMatch | null;

export declare function matchRoutes(
  routes: RouteDescriptor[],
  pathname: string
): FlatRouteMatch | null;

export declare function matchRouteBranch(
  routes: RouteDescriptor[],
  pathname: string
): RouteMatch[] | null;

export declare function Outlet(props?: { context?: unknown }): JSX.Element;
export declare function useMatches(): Accessor<RouteMatch[]>;
export declare function useOutletContext<T = unknown>(): T;
export declare function useRouteLoaderData<T = unknown>(
  routeId?: string
): Accessor<T | undefined>;
export declare function useRouteActionData<T = unknown>(
  routeId?: string
): Accessor<T | undefined>;
export declare function useRouteError<T = unknown>(
  routeId?: string
): Accessor<T | null>;

export interface NavigationSnapshot {
  state: 'idle' | 'loading' | 'submitting';
  location?: Location;
  formAction?: string;
  formData?: FormData | null;
  formMethod?: string;
}

export declare function useNavigation(): {
  state: Accessor<NavigationSnapshot['state']>;
  location: Accessor<Location | undefined>;
  formAction: Accessor<string | undefined>;
  formData: Accessor<FormData | null | undefined>;
  formMethod: Accessor<string | undefined>;
};

export interface SubmitOptions extends NavigateOptions {
  method?: string;
  formData?: FormData;
  data?: FormData;
  navigate?: boolean;
}

export declare function submitRoute(
  target: string,
  options?: SubmitOptions
): Promise<unknown>;
export declare function useSubmit(): typeof submitRoute;
export declare function redirect(
  to: string,
  options?: { replace?: boolean; status?: number }
): never;

export declare function useSearchParams(): [
  Accessor<URLSearchParams>,
  (
    value:
      | string
      | URLSearchParams
      | Record<string, unknown>
      | ((current: URLSearchParams) => URLSearchParams),
    options?: NavigateOptions
  ) => void | Promise<unknown>,
];

export declare function queryLoader(
  options:
    | Record<string, unknown>
    | ((args: RouteLoaderArgs) => Record<string, unknown>)
): RouteLoader;

export interface DehydratedRouteState {
  actionData: [string, unknown][];
  errors?: [string, { message: string; name: string; status?: number }][];
  loaderData: [string, unknown][];
  locationKey: string | null;
  matches: Omit<RouteMatch, 'route' | 'handle'>[];
}

export declare function dehydrateRouteState(): DehydratedRouteState;
export declare function hydrateRouteState(state: DehydratedRouteState): void;
export declare function RouteHydrationBoundary(props: {
  state: DehydratedRouteState;
  children?: JSX.Element;
}): JSX.Element;

export interface PreparedRoutes {
  status: number;
  redirect: string | null;
  headers: Headers;
  location: Location;
  matches: RouteMatch[];
  metadata: Record<string, unknown>[];
  routeState: DehydratedRouteState;
  queryState?: DehydratedState;
  errors: Map<string, unknown>;
}

export declare function prepareRoutes(
  routes: RouteDescriptor[],
  url: string,
  options?: {
    basename?: string;
    context?: unknown;
    queryClient?: QueryClient;
  }
): Promise<PreparedRoutes>;

export declare function renderRoute(
  Component: Component,
  props?: Record<string, unknown>,
  options?: {
    routes?: RouteDescriptor[];
    url?: string;
    basename?: string;
    context?: unknown;
    queryClient?: QueryClient;
    request?: Request;
    maxPasses?: number;
  }
): Promise<PreparedRoutes & {
  html: string;
  head: string;
  state: { route: DehydratedRouteState; query?: DehydratedState };
}>;

export declare function renderRouteDocument(
  Component: Component,
  props?: Record<string, unknown>,
  options?: Parameters<typeof renderRoute>[2] & {
    document?: Record<string, unknown>;
  }
): Promise<Awaited<ReturnType<typeof renderRoute>> & { document: string }>;

export declare function renderRouteToReadableStream(
  Component: Component,
  props?: Record<string, unknown>,
  options?: Parameters<typeof renderRoute>[2] & {
    document?: Record<string, unknown>;
    nonce?: string;
    signal?: AbortSignal;
  }
): Promise<PreparedRoutes & {
  stream: ReadableStream<Uint8Array> & {
    shellReady: Promise<void>;
    allReady: Promise<void>;
  };
}>;

export declare function hydrateRouterState(
  state: { route: DehydratedRouteState; query?: DehydratedState },
  queryClient?: QueryClient
): void;
