import { createBindingEffect } from '../../signals/createEffect/createEffect.js';
import {
  eventName,
  isSafeAttributeName,
  isUrlAttribute,
  sanitizeStyleValue,
  sanitizeUrl,
} from '../shared/security.js';
import { BOOLEAN_ATTRS, toText } from '../shared/vnode.js';
import {
  TEXT_DISPOSE,
  PROP_DISPOSES,
  LISTENERS,
} from './binding-keys.js';

export const GRAIN_TEMPLATE = Symbol('grainTemplate');

/**
 * Parse HTML once into a prototype node for cloneNode(true).
 * Mirrors Solid's template() helper.
 */
export function template(html) {
  const t = document.createElement('template');
  t.innerHTML = html;
  const node = t.content.firstChild;
  if (!node) {
    throw new Error('grainlet template(): empty HTML');
  }
  return node;
}

/** Descriptor consumed by createDom / patchDom. */
export function mountTemplate(proto, setup) {
  return {
    [GRAIN_TEMPLATE]: true,
    $$grainTemplate: true,
    proto,
    setup,
  };
}

export function isGrainTemplate(vdom) {
  return vdom != null && typeof vdom === 'object' && vdom.$$grainTemplate === true;
}

function disposeText(node) {
  if (node?.[TEXT_DISPOSE]) {
    node[TEXT_DISPOSE]();
    node[TEXT_DISPOSE] = null;
  }
}

function disposeProp(el, key) {
  const map = el?.[PROP_DISPOSES];
  if (!map?.has(key)) return;
  map.get(key)();
  map.delete(key);
}

function setAttr(el, key, value) {
  if (key === 'className' || key === 'class') {
    const next = value == null ? '' : String(value);
    // SVGElement.className is an SVGAnimatedString (getter-only); use attribute.
    if (typeof SVGElement !== 'undefined' && el instanceof SVGElement) {
      if (next) el.setAttribute('class', next);
      else el.removeAttribute('class');
    } else {
      el.className = next;
    }
    return;
  }
  if (key === 'style') {
    if (typeof value === 'string') {
      el.style.cssText = sanitizeStyleValue(value);
      return;
    }
    if (value && typeof value === 'object') {
      const safe = {};
      for (const [name, item] of Object.entries(value)) {
        safe[name] = sanitizeStyleValue(item);
      }
      Object.assign(el.style, safe);
    }
    return;
  }
  if (BOOLEAN_ATTRS.has(key)) {
    const on = Boolean(value);
    el[key] = on;
    if (on) el.setAttribute(key, '');
    else el.removeAttribute(key);
    return;
  }
  if (key.toLowerCase() === 'srcdoc' || !isSafeAttributeName(key)) {
    el.removeAttribute(key);
    return;
  }

  if (isUrlAttribute(key)) {
    const safe = sanitizeUrl(value, key, el.tagName);
    if (safe == null) {
      el.removeAttribute(key);
      return;
    }
    el.setAttribute(key, String(safe));
    return;
  }

  if (value == null || value === false) {
    el.removeAttribute(key);
  } else {
    el.setAttribute(key, value === true ? '' : String(value));
  }
}

/** Bind a reactive text hole (placeholder text node). */
export function bindTemplateText(node, accessor) {
  disposeText(node);
  node[TEXT_DISPOSE] = createBindingEffect(() => {
    const next = toText(accessor());
    if (node.nodeValue !== next) node.nodeValue = next;
  });
}

/** Bind a reactive attribute / className on an element. */
export function bindTemplateProp(el, key, accessor) {
  disposeProp(el, key);
  if (!el[PROP_DISPOSES]) el[PROP_DISPOSES] = new Map();
  el[PROP_DISPOSES].set(
    key,
    createBindingEffect(() => {
      setAttr(el, key, accessor());
    })
  );
}

/** Attach (or replace) an event listener. */
export function bindTemplateEvent(el, key, handler) {
  const ev = eventName(key);
  if (!ev || typeof handler !== 'function') return;
  if (!el[LISTENERS]) el[LISTENERS] = new Map();
  const prev = el[LISTENERS].get(ev);
  if (prev) el.removeEventListener(ev, prev);
  el.addEventListener(ev, handler);
  el[LISTENERS].set(ev, handler);
}

/**
 * Walk `path` where each entry is a child index from the root element.
 * e.g. [1, 0] → el.children path via firstChild/nextSibling among element+text nodes.
 */
export function walkPath(root, path) {
  let node = root;
  for (let i = 0; i < path.length; i++) {
    let child = node.firstChild;
    let idx = path[i];
    while (idx > 0 && child) {
      child = child.nextSibling;
      idx--;
    }
    node = child;
    if (!node) return null;
  }
  return node;
}

/** Clone prototype and run setup to wire holes. */
export function instantiateTemplate(vdom) {
  const el = vdom.proto.cloneNode(true);
  if (typeof vdom.setup === 'function') {
    vdom.setup(el);
  }
  return el;
}

/**
 * Re-run setup on an existing cloned element (item update path).
 * Disposes prior template bindings first.
 */
export function refreshTemplate(el, vdom) {
  disposeTemplateBindings(el);
  if (typeof vdom.setup === 'function') {
    vdom.setup(el);
  }
  return el;
}

function disposeTemplateBindings(node) {
  if (!node) return;
  disposeText(node);
  if (node[PROP_DISPOSES]) {
    for (const d of node[PROP_DISPOSES].values()) d();
    node[PROP_DISPOSES].clear();
  }
  if (node[LISTENERS]) {
    for (const [ev, fn] of node[LISTENERS]) {
      node.removeEventListener(ev, fn);
    }
    node[LISTENERS].clear();
  }
  let child = node.firstChild;
  while (child) {
    const next = child.nextSibling;
    disposeTemplateBindings(child);
    child = next;
  }
}
