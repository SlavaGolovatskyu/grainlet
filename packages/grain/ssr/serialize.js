import { popSuspenseContext } from '../core/flow/context.js';
import {
  isJsonScriptType,
  isSafeAttributeName,
  isSafeTagName,
  isScriptTag,
  isUrlAttribute,
  sanitizeStyleValue,
  sanitizeUrl,
} from '../core/shared/security.js';
import {
  BOOLEAN_ATTRS,
  isFragmentType,
  isComponentType,
  isAccessor,
  toText,
  normalizeChildren,
  isEventProp,
  isStructuredChild,
  mergeComponentProps,
} from '../core/shared/vnode.js';

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function resolvePropValue(value) {
  if (isAccessor(value)) {
    try {
      return value();
    } catch {
      return '';
    }
  }
  return value;
}

export function scriptTextFromChildren(children) {
  const list = normalizeChildren(children);
  if (list.length === 0) return '';
  if (list.length === 1 && !isStructuredChild(list[0]) && !isAccessor(list[0])) {
    return list[0];
  }
  return list
    .map((child) => (isAccessor(child) ? resolvePropValue(child) : child))
    .filter((child) => child != null && !isStructuredChild(child))
    .map((child) => toText(child))
    .join('');
}

export function escapeScriptData(value) {
  if (value != null && typeof value === 'object') {
    return escapeScriptData(JSON.stringify(value));
  }
  return String(value ?? '')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function serializeAttrs(props, tagName) {
  if (!props) return '';
  const parts = [];

  for (const key of Object.keys(props)) {
    if (key === 'children' || key === 'key' || key === 'ref' || key === 'json') {
      continue;
    }
    if (isEventProp(key)) continue;

    let attrName = key;
    if (key === 'className') attrName = 'class';
    if (attrName.toLowerCase() === 'srcdoc') continue;
    if (!isSafeAttributeName(attrName)) continue;

    let raw = resolvePropValue(props[key]);

    if (BOOLEAN_ATTRS.has(key) || BOOLEAN_ATTRS.has(attrName)) {
      if (raw) parts.push(attrName);
      continue;
    }

    if (raw == null || raw === false) continue;

    if (key === 'style' || attrName === 'style') {
      const css = sanitizeStyleValue(
        typeof raw === 'string'
          ? raw
          : raw && typeof raw === 'object'
            ? Object.entries(raw)
                .map(([k, v]) => `${k}:${v}`)
                .join(';')
            : ''
      );
      if (css) parts.push(`style="${escapeHtml(css)}"`);
      continue;
    }

    if (isUrlAttribute(attrName)) {
      raw = sanitizeUrl(raw, attrName, tagName);
      if (raw == null) continue;
    }

    parts.push(`${attrName}="${escapeHtml(raw === true ? '' : raw)}"`);
  }

  return parts.length ? ` ${parts.join(' ')}` : '';
}

export function serializeHostElement(tag, props, key, inner) {
  if (!isSafeTagName(tag)) return '';
  const keyAttr = key != null ? ` data-key="${escapeHtml(key)}"` : '';
  const attrs = serializeAttrs(props, tag);
  if (VOID_TAGS.has(tag)) {
    return `<${tag}${attrs}${keyAttr} />`;
  }
  if (isScriptTag(tag)) {
    const scriptType = resolvePropValue(props?.type);
    if (isJsonScriptType(scriptType)) {
      return `<${tag}${attrs}${keyAttr}>${escapeScriptData(inner)}</${tag}>`;
    }
    return `<${tag}${attrs}${keyAttr}></${tag}>`;
  }
  return `<${tag}${attrs}${keyAttr}>${inner}</${tag}>`;
}

export const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

function wrapContents(inner, marker) {
  return `<span ${marker} style="display:contents">${inner}</span>`;
}

/**
 * Serialize a vnode (or text/accessor) to an HTML string.
 * `renderComponent` resolves function components → vnode.
 */
export function serializeVnode(vdom, renderComponent) {
  if (vdom == null || vdom === false || vdom === true) {
    return '';
  }

  if (typeof vdom === 'string' || typeof vdom === 'number') {
    return escapeHtml(vdom);
  }

  if (isAccessor(vdom)) {
    const resolved = resolvePropValue(vdom);
    let inner;
    if (isStructuredChild(resolved)) {
      if (Array.isArray(resolved)) {
        inner = normalizeChildren(resolved)
          .map((child) => serializeVnode(child, renderComponent))
          .join('');
      } else {
        inner = serializeVnode(resolved, renderComponent);
      }
    } else {
      inner = escapeHtml(toText(resolved));
    }
    return wrapContents(inner, 'data-fg="dynamic"');
  }

  if (Array.isArray(vdom)) {
    const inner = normalizeChildren(vdom)
      .map((child) => serializeVnode(child, renderComponent))
      .join('');
    return wrapContents(inner, 'data-fg="fragment"');
  }

  if (typeof vdom !== 'object') {
    return escapeHtml(String(vdom));
  }

  const { type, props, children } = vdom;

  if (isFragmentType(type)) {
    const inner = normalizeChildren(children)
      .map((child) => serializeVnode(child, renderComponent))
      .join('');
    return wrapContents(inner, 'data-fg="fragment"');
  }

  if (isComponentType(type)) {
    const childProps = mergeComponentProps(props, children);
    const result = renderComponent(type, childProps);
    const inner = serializeVnode(result, renderComponent);
    // SuspenseBoundary pushes context for its subtree; pop after children serialize.
    if (type.$$ssrPopSuspense) {
      popSuspenseContext();
    }
    return wrapContents(inner, 'data-component=""');
  }

  const tag = String(type);
  const inner = isScriptTag(tag)
    ? scriptTextFromChildren(children)
    : normalizeChildren(children)
        .map((child) => serializeVnode(child, renderComponent))
        .join('');
  return serializeHostElement(tag, props, vdom.key ?? props?.key, inner);
}
