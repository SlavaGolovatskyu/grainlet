/**
 * JSX Dev Runtime - Development version of JSX runtime
 * 
 * Vite uses this in development mode for better error messages.
 * In production, it uses jsx-runtime.js
 * 
 * jsxDEV signature: jsxDEV(type, props, key, isStaticChildren, source, self)
 * - type: element type (string or component)
 * - props: element props (children are in props.children)
 * - key: React key (we ignore this)
 * - isStaticChildren: whether children are static
 * - source: source location info (for dev tools)
 * - self: React self reference (we ignore this)
 */

import { jsx as jsxFn, Fragment, jsxs } from './jsx-runtime.js';

// jsxDEV is the development version - same as jsx but with potential dev-only features
export function jsxDEV(type, props, key, isStaticChildren, source, self) {
  // In automatic JSX transform, children are passed as props.children
  // Extract children from props
  const children = props?.children !== undefined 
    ? (Array.isArray(props.children) ? props.children : [props.children])
    : [];
  
  // Create new props without children (children are passed separately to jsx)
  const { children: _, ...restProps } = props || {};
  
  // Call the regular jsx function with children as separate arguments
  const vnode = jsxFn(type, restProps, ...children);
  if (vnode && typeof vnode === 'object') {
    vnode.key = key;
    vnode.__source = source;
    vnode.__self = self;
    vnode.__staticChildren = !!isStaticChildren;
  }
  return vnode;
}

// jsxsDEV for static children in dev mode (optimized version)
export function jsxsDEV(type, props, key, source, self) {
  return jsxDEV(type, props, key, true, source, self);
}

// Also export the regular functions for compatibility
export { jsxFn as jsx, Fragment, jsxs };
