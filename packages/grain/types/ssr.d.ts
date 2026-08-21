import type { Component, ComponentInstance } from './component.js';
import type { QueryClient } from './query.js';
import type { RouteDescriptor } from './route.js';

export interface SSRContext {
  url?: string | null;
  location?: {
    pathname: string;
    search: string;
    hash: string;
    state: unknown;
  };
  pending?: Set<Promise<unknown>>;
  resourceCache?: Map<string, { status: string; value?: unknown; error?: unknown }>;
  routeState?: unknown;
  queryState?: unknown;
  head?: Map<string, HeadEntry>;
  [key: string]: unknown;
}

export interface HeadEntry {
  key: string;
  tag: string;
  props: Record<string, unknown>;
}

export declare function renderToString(
  Component: Component,
  props?: Record<string, unknown>,
  options?: { url?: string }
): string;

/**
 * Await Suspense-tracked promises (`lazy`, `createResource`), then return HTML
 * with resolved content (not the fallback).
 */
export declare function renderToStringAsync(
  Component: Component,
  props?: Record<string, unknown>,
  options?: { url?: string; maxPasses?: number }
): Promise<string>;

export declare function wrapHtmlDocument(
  body: string,
  options?: DocumentOptions
): string;

export interface DocumentOptions {
  title?: string | false;
  /** Escaped text inserted into head. Use unsafeHead only for trusted markup. */
  head?: string;
  unsafeHead?: string;
  managedHead?: string;
  scripts?: Array<string | Record<string, unknown>>;
  state?: unknown;
  stateId?: string;
  context?: SSRContext;
  nonce?: string;
}

export declare function serializeDocumentState(value: unknown): string;
export declare function renderDocument(
  body: string,
  options?: DocumentOptions
): string;

export declare function hydrate(
  Component: Component,
  container: Element,
  props?: Record<string, unknown>
): ComponentInstance;

export declare function runWithSSR<T>(
  fn: () => T | Promise<T>,
  context?: SSRContext
): T | Promise<T>;

export declare function getSSRContext(): SSRContext | null;
export declare function createSSRContext(context?: SSRContext): SSRContext;
export declare function setSSRContextStorage(storage: {
  getStore(): SSRContext | undefined;
  run<T>(context: SSRContext, fn: () => T): T;
}): void;

export declare function isServer(): boolean;

export declare function escapeHtml(value: unknown): string;

export declare function serializeVnode(
  vdom: unknown,
  renderComponent: (type: Component, props: Record<string, unknown>) => unknown
): string;

export interface HeadProps {
  children?: unknown;
  key?: string;
  [key: string]: unknown;
}

export declare function Head(props: HeadProps): unknown;
export declare function Title(props: HeadProps): null;
export declare function Meta(props: HeadProps): null;
export declare function HeadLink(props: HeadProps): null;
export declare function Canonical(props: HeadProps): null;
export declare function JsonLd(props: HeadProps & { value?: unknown }): null;
export declare function OpenGraph(props: Record<string, unknown>): unknown;
export declare function applyRouteHeadEntries(
  metadata: Record<string, unknown>[]
): void;
export declare function registerHeadEntry(
  tag: string,
  props?: HeadProps
): string;
export declare function renderHead(context?: SSRContext | null): string;

export type GrainletReadableStream = ReadableStream<Uint8Array> & {
  shellReady: Promise<void>;
  allReady: Promise<void>;
};

export interface StreamRenderOptions {
  context?: SSRContext;
  document?: DocumentOptions;
  nonce?: string;
  onAllReady?: () => void;
  onError?: (error: unknown) => void;
  onShellReady?: () => void;
  queryState?: unknown;
  request?: Request;
  routeState?: unknown;
  signal?: AbortSignal;
  state?: unknown | (() => unknown);
  stateId?: string;
  url?: string;
}

export declare function renderToReadableStream(
  Component: Component,
  props?: Record<string, unknown>,
  options?: StreamRenderOptions
): GrainletReadableStream;

export interface RequestHandlerOptions {
  App: Component<Record<string, unknown>>;
  routes?: RouteDescriptor[];
  basename?: string;
  createQueryClient?: (args: {
    request: Request;
    platformContext: unknown;
  }) => QueryClient;
  document?: DocumentOptions;
  errorDocument?: (error: unknown) => string;
  nonce?: (args: { request: Request; platformContext: unknown }) => string;
  onError?: (error: unknown, request: Request) => void;
  props?: Record<string, unknown>;
  streaming?: boolean;
}

export declare function createRequestHandler(
  options: RequestHandlerOptions
): (request: Request, platformContext?: unknown) => Promise<Response>;

export declare function createNodeHandler(
  options: RequestHandlerOptions
): (
  request: {
    method?: string;
    url?: string;
    headers: Record<string, string | string[] | undefined>;
    socket?: { encrypted?: boolean };
    once(event: string, listener: () => void): void;
    [Symbol.asyncIterator](): AsyncIterator<Uint8Array>;
  },
  response: {
    statusCode: number;
    destroyed?: boolean;
    setHeader(name: string, value: string): void;
    write(chunk: Uint8Array): boolean;
    end(): void;
    destroy(error?: unknown): void;
    once(event: string, listener: () => void): void;
  },
  platformContext?: unknown
) => Promise<void>;

export interface PrerenderResult {
  body: string;
  headers: Record<string, string>;
  status: number;
}

export interface PrerenderOptions extends RequestHandlerOptions {
  origin?: string;
  paths?: string[] | (() => string[] | Promise<string[]>);
}

export declare function prerenderPaths(
  options: PrerenderOptions
): Promise<Map<string, PrerenderResult>>;
export declare function writePrerendered(
  options: PrerenderOptions & { outDir: string }
): Promise<{
  manifest: Record<string, PrerenderResult & { file: string }>;
  manifestPath: string;
}>;
