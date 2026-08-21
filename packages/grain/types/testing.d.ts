import type { Component, ComponentInstance } from './component.js';

export interface RenderOptions<P = Record<string, unknown>> {
  container?: Element;
  html?: string;
  props?: P;
}

export interface RenderResult<P = Record<string, unknown>> {
  container: Element;
  instance: ComponentInstance;
  rerender(props?: P): RenderResult<P>;
  unmount(): void;
}

export declare function render<P>(
  Component: Component<P>,
  options?: RenderOptions<P>
): RenderResult<P>;
export declare function hydrate<P>(
  Component: Component<P>,
  options?: RenderOptions<P>
): RenderResult<P>;
export declare function renderHook<P, T>(
  callback: (props: P) => T,
  options?: Omit<RenderOptions<P>, 'props'> & { initialProps?: P }
): RenderResult<P> & { result: () => T };
export declare const screen: {
  getByTestId(id: string): Element;
  getByText(text: string | RegExp): Element;
  queryByText(text: string | RegExp): Element | null;
  getByRole(role: string, options?: { name?: string | RegExp }): Element;
};
export declare const fireEvent: {
  (node: Element, event: Event): Event;
  click(node: Element, init?: EventInit): Event;
  input(node: Element, init?: EventInit): Event;
  change(node: Element, init?: EventInit): Event;
  submit(node: Element, init?: EventInit): Event;
};
export declare function waitFor<T>(
  assertion: () => T | Promise<T>,
  options?: { timeout?: number; interval?: number }
): Promise<T>;
export declare function cleanup(): void;
