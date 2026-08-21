import type { Accessor } from './signals.js';
import type { JSX } from '../jsx-runtime.js';

export type Component<P = Record<string, unknown>> = (
  props: P
) => JSX.Element;

export type ComponentFactory<P = Record<string, unknown>> = ((
  props?: P
) => ComponentInstance) & {
  $$component?: boolean;
};

export interface ComponentInstance {
  mount(parent: Element, options?: { hydrate?: boolean }): void;
  unmount(): void;
}

export declare function createComponent<P = Record<string, unknown>>(
  fn: Component<P>
): ComponentFactory<P>;

export declare function render(
  Component: Component | ComponentFactory,
  container: Element,
  props?: Record<string, unknown>
): ComponentInstance;

export declare function hydrate(
  Component: Component | ComponentFactory,
  container: Element,
  props?: Record<string, unknown>
): ComponentInstance;

export interface HydrationMismatchDetail {
  actual: string;
  componentStack: string;
  expected: string;
  existingNode: Node | null;
  path: string;
  reason: string;
  source?: { fileName?: string; lineNumber?: number; columnNumber?: number };
  vdom: unknown;
}

export declare function configureHydration(options?: {
  onMismatch?: (detail: HydrationMismatchDetail) => void;
  strict?: boolean;
}): () => void;

/** Classic / low-level JSX factory. */
export declare function jsx(
  type: string | Component,
  props?: Record<string, unknown> | null,
  ...children: unknown[]
): JSX.Element;

export type { Accessor, JSX };
