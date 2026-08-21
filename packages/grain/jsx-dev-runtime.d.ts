import type { JSX } from './jsx-runtime.js';

export { jsx, jsxs, Fragment } from './jsx-runtime.js';

export declare function jsxDEV(
  type: string | ((props: Record<string, unknown>) => JSX.Element),
  props: Record<string, unknown> | null,
  key: string | number | undefined,
  isStaticChildren: boolean,
  source?: {
    fileName?: string;
    lineNumber?: number;
    columnNumber?: number;
  },
  self?: unknown
): JSX.Element;

export type { JSX, Ref, Accessor } from './jsx-runtime.js';
