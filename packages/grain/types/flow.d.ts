import type { Accessor } from './signals.js';
import type { Component } from './component.js';
import type { JSX, Ref } from '../jsx-runtime.js';

type Child = JSX.Element;
type WhenValue = unknown;

export interface ShowProps<T = WhenValue> {
  when: T | Accessor<T>;
  keyed?: boolean;
  fallback?: Child;
  children?: Child | ((item: NonNullable<T>) => Child);
}

export declare function Show<T = WhenValue>(props: ShowProps<T>): Child;

export interface ForProps<T> {
  each: T[] | Accessor<T[] | undefined | null | false>;
  fallback?: Child;
  children: (item: T, index: Accessor<number>) => Child;
}

export declare function For<T>(props: ForProps<T>): Child;

export interface VirtualListScrollOptions {
  /** Item alignment within the viewport. Default `"start"`. */
  align?: 'start' | 'center' | 'end' | 'auto';
  /** Native scroll behavior. Default `"auto"`. */
  behavior?: ScrollBehavior;
}

export interface VirtualListOffsetOptions {
  /** Native scroll behavior. Default `"auto"`. */
  behavior?: ScrollBehavior;
}

export type VirtualListScrollEvent = Event & {
  readonly currentTarget: HTMLDivElement;
  readonly target: HTMLDivElement;
};

export interface VirtualListApi<T> {
  /** Scroll to an item index. Out-of-range indices are clamped. */
  scrollToIndex: (index: number, options?: VirtualListScrollOptions) => boolean;
  /** Scroll to the current array item by identity. Returns false when absent. */
  scrollToItem: (item: T, options?: VirtualListScrollOptions) => boolean;
  /** Scroll to a main-axis pixel offset. Out-of-range offsets are clamped. */
  scrollToOffset: (offset: number, options?: VirtualListOffsetOptions) => boolean;
  /** Read the current half-open rendered range. */
  getVisibleRange: () => { start: number; end: number };
  /** Read the outer scroller element after mount. */
  getElement: () => HTMLDivElement | null;
}

export interface VirtualListProps<T> {
  /** Additional outer `<div>` attributes and event handlers are forwarded. */
  [key: string]: unknown;
  each: T[] | Accessor<T[] | undefined | null | false>;
  /** Scroll axis. Default `"vertical"`. */
  orientation?: 'vertical' | 'horizontal' | Accessor<'vertical' | 'horizontal'>;
  /** Fixed row height in px (vertical). Also accepted as main-axis fallback for horizontal. */
  itemHeight?: number | Accessor<number>;
  /** Fixed item width in px (horizontal). Also accepted as main-axis fallback for vertical. */
  itemWidth?: number | Accessor<number>;
  /** Vertical viewport height in px (and optional cross-axis size when horizontal). */
  height?: number | string | Accessor<number | string | undefined>;
  /** Horizontal viewport width in px (and optional cross-axis size when vertical). */
  width?: number | string | Accessor<number | string | undefined>;
  /** Extra items before/after the viewport. Default 5. */
  overscan?: number | Accessor<number>;
  /**
   * Min ms between scroll-driven window updates (leading + trailing).
   * `0` (default) applies on every scroll event that changes the index window.
   */
  debounceTime?: number | Accessor<number>;
  /** Called once when scroll crosses near the trailing edge (infinite scroll). */
  onEndReached?: () => void;
  /**
   * Fraction of viewport size from the end that triggers `onEndReached`.
   * Default `0.2`.
   */
  endReachedThreshold?: number | Accessor<number>;
  /** When true, `onEndReached` will not fire (block while a fetch is in flight). */
  endReachedLoading?: boolean | Accessor<boolean>;
  keyed?: boolean | ((item: T, index: number) => string | number);
  fallback?: Child;
  class?: string;
  className?: string;
  style?: string | Record<string, string | number>;
  /** Receives the outer scroller element and `null` when it unmounts. */
  ref?: Ref<HTMLDivElement>;
  /** Receives a stable imperative API and `null` when the scroller unmounts. */
  apiRef?: (api: VirtualListApi<T> | null) => void;
  onScroll?: (event: VirtualListScrollEvent) => void;
  onscroll?: (event: VirtualListScrollEvent) => void;
  children: (item: T, index: number) => Child;
}

export declare function VirtualList<T>(props: VirtualListProps<T>): Child;

export interface SwitchProps {
  fallback?: Child;
  children?: Child;
}

export declare function Switch(props: SwitchProps): Child;

export interface MatchProps<T = WhenValue> {
  when: T | Accessor<T>;
  children?: Child | ((item: NonNullable<T>) => Child);
}

export declare function Match<T = WhenValue>(props: MatchProps<T>): Child;

export interface SuspenseProps {
  fallback?: Child;
  children?: Child;
}

export declare function Suspense(props: SuspenseProps): Child;

export interface ErrorBoundaryProps {
  fallback?: Child | ((error: Error, reset: () => void) => Child);
  children?: Child;
}

export declare function ErrorBoundary(props: ErrorBoundaryProps): Child;

export interface PortalProps {
  mount?: Node | Accessor<Node | null | undefined>;
  isSVG?: boolean | Accessor<boolean>;
  children?: Child;
}

export declare function Portal(props: PortalProps): Child;

export interface Context<T> {
  id: symbol;
  defaultValue: T;
  Provider: Component<{ value: T; children?: Child }>;
}

export declare function createContext<T>(): Context<T | undefined>;
export declare function createContext<T>(defaultValue: T): Context<T>;

export declare function useContext<T>(context: Context<T>): T;

export type ResourceState = 'pending' | 'ready' | 'refreshing' | 'errored';

export interface Resource<T> extends Accessor<T | undefined> {
  state: Accessor<ResourceState>;
  error: Accessor<unknown>;
  loading: Accessor<boolean>;
  latest: Accessor<T | undefined>;
  promise: () => Promise<unknown> | null;
  refetch: () => void;
}

export declare function createResource<T, S = true>(
  fetcher: (
    source: S,
    info: { value: T | undefined; refetching: boolean }
  ) => T | Promise<T>
): [Resource<T>];

export declare function createResource<T, S>(
  source: S | Accessor<S | false | null | undefined>,
  fetcher: (
    source: S,
    info: { value: T | undefined; refetching: boolean }
  ) => T | Promise<T>
): [Resource<T>];

/**
 * Lazy-load a component. Wrap in `<Suspense>`. Works with `renderToStringAsync`.
 */
export declare function lazy<T extends Component = Component>(
  loader: () => Promise<{ default: T } | T>
): T;
