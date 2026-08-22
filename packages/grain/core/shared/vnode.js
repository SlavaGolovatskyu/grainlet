import { Fragment } from '../jsx-compiler-new/jsx-runtime.js';

export const BOOLEAN_ATTRS = new Set([
  'disabled',
  'checked',
  'selected',
  'readonly',
  'required',
  'multiple',
  'hidden',
  'autofocus',
  'controls',
  'loop',
  'muted',
  'open',
]);

export function isFragmentType(type) {
  return type === Fragment;
}

export function isComponentType(type) {
  return typeof type === 'function' && !isFragmentType(type);
}

export function isAccessor(value) {
  return typeof value === 'function';
}

export function toText(value) {
  if (value == null || value === false || value === true) return '';
  return String(value);
}

export function normalizeChildren(children) {
  if (children == null || children === false) return [];
  const list = Array.isArray(children) ? children.flat(Infinity) : [children];
  return list.filter(
    (child) => child !== null && child !== undefined && child !== false
  );
}

export function vnodeKey(vdom) {
  if (vdom == null || typeof vdom !== 'object') return undefined;
  if (vdom.key != null) return vdom.key;
  return vdom.props?.key;
}

/** Accessor / expression results that are vnodes or arrays (not plain text). */
export function isStructuredChild(value) {
  if (Array.isArray(value)) return true;
  if (value != null && typeof value === 'object' && value.$$grainTemplate) {
    return true;
  }
  return value != null && typeof value === 'object' && 'type' in value;
}

export { isEventProp } from './security.js';

/**
 * Merge vnode.children into props when props.children is unset.
 * Preserves props identity when there are no kids or children already set.
 */
export function mergeComponentProps(props, children) {
  const base = props || {};
  const kids = normalizeChildren(children);
  if (kids.length === 0 || base.children !== undefined) {
    return base;
  }
  return {
    ...base,
    children: kids.length === 1 ? kids[0] : kids,
  };
}
