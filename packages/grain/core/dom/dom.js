import { createBindingEffect } from '../../signals/createEffect/createEffect.js';
import {
  BOOLEAN_ATTRS,
  isFragmentType,
  isComponentType,
  isAccessor,
  toText,
  normalizeChildren,
  vnodeKey,
  isStructuredChild,
  mergeComponentProps,
} from '../shared/vnode.js';
import { createContentsHost } from './hosts.js';
import { reportHydrationMismatch } from '../dev/diagnostics.js';
import {
  isGrainTemplate,
  instantiateTemplate,
  refreshTemplate,
} from './template.js';
import {
  LISTENERS,
  PREV_PROPS,
  TEXT_DISPOSE,
  PROP_DISPOSES,
  NODE_KEY,
  REF_KEY,
} from './binding-keys.js';

function invokeRef(ref, el) {
  if (typeof ref === 'function') ref(el);
}

function applyRef(el, nextRef, prevRef) {
  if (prevRef === nextRef) return;
  invokeRef(prevRef, null);
  invokeRef(nextRef, el);
  if (nextRef != null) {
    el[REF_KEY] = nextRef;
  } else {
    delete el[REF_KEY];
  }
}

function clearRefTree(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return;
  const ref = node[REF_KEY];
  if (ref != null) {
    invokeRef(ref, null);
    delete node[REF_KEY];
  }
  const children = node.children;
  for (let i = 0; i < children.length; i++) {
    clearRefTree(children[i]);
  }
}

function eventName(key) {
  if (key === 'onClick' || key === 'onclick') return 'click';
  if (key.startsWith('on') && key.length > 2) {
    return key.slice(2).toLowerCase();
  }
  return null;
}

function disposeTextBinding(node) {
  if (node && node[TEXT_DISPOSE]) {
    node[TEXT_DISPOSE]();
    node[TEXT_DISPOSE] = null;
  }
}

function disposeNodeBindings(node) {
  disposeTextBinding(node);
  if (node?.[PROP_DISPOSES]) {
    for (const dispose of node[PROP_DISPOSES].values()) {
      dispose();
    }
    node[PROP_DISPOSES].clear();
  }
  if (node?.[LISTENERS]) {
    for (const [ev, fn] of node[LISTENERS]) {
      node.removeEventListener(ev, fn);
    }
    node[LISTENERS].clear();
  }
  clearRefTree(node);
}

function pathMatchesPrefix(key, pathPrefix) {
  return (
    key === pathPrefix ||
    key.startsWith(pathPrefix + '.') ||
    key.startsWith(pathPrefix + ':')
  );
}

function bindText(node, accessor) {
  disposeTextBinding(node);
  node[TEXT_DISPOSE] = createBindingEffect(() => {
    const next = toText(accessor());
    if (node.nodeValue !== next) {
      node.nodeValue = next;
    }
  });
  return node;
}

function createTextFromValue(value) {
  if (isAccessor(value)) {
    return bindText(document.createTextNode(''), value);
  }
  return document.createTextNode(toText(value));
}

/**
 * Babel wraps expressions like `{props.children}` as `() => props.children`.
 * Those accessors often return vnodes/arrays — render them as DOM, not text.
 * Nested wrappers (`() => () => value`) must be unwrapped before String().
 */
function unwrapAccessorValue(value) {
  let current = value;
  let depth = 0;
  while (typeof current === 'function' && depth < 8) {
    current = current();
    depth += 1;
  }
  return current;
}

function createDynamicChild(accessor, owner, path, existingHost) {
  const host = existingHost ?? createContentsHost('data-fg', 'dynamic');

  disposeTextBinding(host);
  host[TEXT_DISPOSE] = createBindingEffect(() => {
    const value = unwrapAccessorValue(accessor());
    if (isStructuredChild(value)) {
      const kids = Array.isArray(value) ? normalizeChildren(value) : [value];
      patchChildren(host, kids, owner, path);
      return;
    }
    clearChildRange(owner, path);
    const text = toText(value);
    if (
      host.childNodes.length === 1 &&
      host.firstChild.nodeType === Node.TEXT_NODE
    ) {
      disposeTextBinding(host.firstChild);
      if (host.firstChild.nodeValue !== text) {
        host.firstChild.nodeValue = text;
      }
      return;
    }
    while (host.firstChild) {
      removeNode(host, host.firstChild, owner, path);
    }
    host.appendChild(document.createTextNode(text));
  });

  return host;
}

/**
 * Primitive accessor children bind a text node (no wrapper span).
 * Structured accessor results still use a display:contents host.
 */
function createAccessorChild(accessor, owner, path) {
  let node = null;

  const dispose = createBindingEffect(() => {
    const value = unwrapAccessorValue(accessor());
    if (isStructuredChild(value)) {
      if (!isDynamicHost(node)) {
        node = createContentsHost('data-fg', 'dynamic');
      }
      const kids = Array.isArray(value) ? normalizeChildren(value) : [value];
      patchChildren(node, kids, owner, path);
      return;
    }

    clearChildRange(owner, path);
    const text = toText(value);
    if (node && node.nodeType === Node.TEXT_NODE) {
      if (node.nodeValue !== text) node.nodeValue = text;
      return;
    }
    node = document.createTextNode(text);
  });

  if (node) {
    disposeTextBinding(node);
    node[TEXT_DISPOSE] = dispose;
  }
  return node;
}

function isDynamicHost(node) {
  return (
    node &&
    node.nodeType === Node.ELEMENT_NODE &&
    node.getAttribute?.('data-fg') === 'dynamic'
  );
}

function disposePropBinding(el, key) {
  const map = el[PROP_DISPOSES];
  if (map?.has(key)) {
    map.get(key)();
    map.delete(key);
  }
}

function setStaticProp(el, key, value) {
  if (key === 'className' || key === 'class') {
    const next = value == null ? '' : String(value);
    if (typeof SVGElement !== 'undefined' && el instanceof SVGElement) {
      if (next) el.setAttribute('class', next);
      else el.removeAttribute('class');
    } else {
      el.className = next;
    }
    return;
  }

  if (key === 'id') {
    el.id = value == null || value === false ? '' : String(value);
    return;
  }

  if (key === 'style') {
    if (typeof value === 'string') {
      el.style.cssText = value;
    } else if (value && typeof value === 'object') {
      el.style.cssText = '';
      Object.assign(el.style, value);
    } else {
      el.style.cssText = '';
    }
    return;
  }

  if (key === 'value' && 'value' in el) {
    if (el.value !== String(value ?? '')) {
      el.value = value == null ? '' : value;
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

  if (value == null || value === false) {
    el.removeAttribute(key);
  } else {
    el.setAttribute(key, value === true ? '' : String(value));
  }
}

function bindProp(el, key, accessor) {
  disposePropBinding(el, key);
  if (!el[PROP_DISPOSES]) {
    el[PROP_DISPOSES] = new Map();
  }
  el[PROP_DISPOSES].set(
    key,
    createBindingEffect(() => {
      setStaticProp(el, key, accessor());
    })
  );
}

function componentProps(vdom) {
  return mergeComponentProps(vdom.props, vdom.children);
}

export function applyProps(el, props, owner) {
  const next = props || {};
  const prev = el[PREV_PROPS] || {};
  const listeners = el[LISTENERS] || (el[LISTENERS] = new Map());

  for (const key of Object.keys(prev)) {
    if (key === 'children' || key === 'key' || key === 'ref') continue;
    if (!(key in next)) {
      const ev = eventName(key);
      if (ev && listeners.has(ev)) {
        el.removeEventListener(ev, listeners.get(ev));
        listeners.delete(ev);
      } else {
        disposePropBinding(el, key);
        if (key === 'className' || key === 'class') {
          if (typeof SVGElement !== 'undefined' && el instanceof SVGElement) {
            el.removeAttribute('class');
          } else {
            el.className = '';
          }
        } else if (key === 'id') {
          el.id = '';
        } else if (BOOLEAN_ATTRS.has(key)) {
          el.removeAttribute(key);
          el[key] = false;
        } else if (key !== 'style') {
          el.removeAttribute(key);
        }
      }
    }
  }

  for (const key of Object.keys(next)) {
    if (key === 'children' || key === 'key' || key === 'ref') continue;

    let value = next[key];
    const ev = eventName(key);

    if (ev) {
      disposePropBinding(el, key);
      if (typeof value === 'function') {
        const prevFn = listeners.get(ev);
        if (prevFn) el.removeEventListener(ev, prevFn);
        el.addEventListener(ev, value);
        listeners.set(ev, value);
      }
      continue;
    }

    if (isAccessor(value)) {
      bindProp(el, key, value);
      continue;
    }

    disposePropBinding(el, key);
    setStaticProp(el, key, value);
  }

  applyRef(el, next.ref, prev.ref);
  el[PREV_PROPS] = next;
}

function clearChildRange(owner, pathPrefix) {
  if (!owner?._children) return;
  for (const key of [...owner._children.keys()]) {
    if (pathMatchesPrefix(key, pathPrefix)) {
      const entry = owner._children.get(key);
      if (entry?.instance) {
        entry.instance.unmount();
      }
      owner._children.delete(key);
    }
  }
}

/** Unmount child components under `path` and remove `node` from `parentEl`. */
export function unmountOwnedNode(parentEl, node, owner, path) {
  clearChildRange(owner, path);
  disposeTreeBindings(node);
  if (node && node.parentNode === parentEl) {
    parentEl.removeChild(node);
  }
}

function disposeTreeBindings(node) {
  if (!node) return;
  disposeNodeBindings(node);
  let child = node.firstChild;
  while (child) {
    const next = child.nextSibling;
    disposeTreeBindings(child);
    child = next;
  }
}

/** Prefer stable keyed owner paths so list reorder does not remount. */
function childOwnerPath(path, index, vdom) {
  const key = vnodeKey(vdom);
  return key != null ? `${path}:${key}` : `${path}.${index}`;
}

function removeNode(parentEl, node, owner, path) {
  unmountOwnedNode(parentEl, node, owner, path);
}

function setNodeKey(node, key) {
  if (node && key != null) {
    node[NODE_KEY] = key;
    if (node.nodeType === Node.ELEMENT_NODE) {
      node.setAttribute('data-key', String(key));
    }
  }
}

function getNodeKey(node) {
  if (!node) return undefined;
  if (node[NODE_KEY] != null) return node[NODE_KEY];
  if (node.nodeType === Node.ELEMENT_NODE && node.hasAttribute('data-key')) {
    return node.getAttribute('data-key');
  }
  return undefined;
}

function appendVdomChildren(parent, children, owner, path) {
  normalizeChildren(children).forEach((child, i) => {
    const childNode = createDom(child, owner, childOwnerPath(path, i, child));
    setNodeKey(childNode, vnodeKey(child));
    parent.appendChild(childNode);
  });
}

export function createDom(vdom, owner, path = '0') {
  if (vdom == null || vdom === false || vdom === true) {
    return document.createTextNode('');
  }

  if (typeof vdom === 'string' || typeof vdom === 'number') {
    return document.createTextNode(String(vdom));
  }

  if (isAccessor(vdom)) {
    return createAccessorChild(vdom, owner, path);
  }

  if (isGrainTemplate(vdom)) {
    return instantiateTemplate(vdom);
  }

  if (Array.isArray(vdom)) {
    const host = createContentsHost('data-fg', 'fragment');
    appendVdomChildren(host, vdom, owner, path);
    return host;
  }

  if (typeof vdom !== 'object') {
    return document.createTextNode(String(vdom));
  }

  const { type } = vdom;

  if (isFragmentType(type)) {
    const host = createContentsHost('data-fg', 'fragment');
    setNodeKey(host, vnodeKey(vdom));
    appendVdomChildren(host, vdom.children, owner, path);
    return host;
  }

  if (isComponentType(type)) {
    const host = owner._mountChild(path, type, componentProps(vdom), {
      source: vdom.__source,
    });
    setNodeKey(host, vnodeKey(vdom));
    return host;
  }

  const el = document.createElement(type);
  applyProps(el, vdom.props, owner);
  setNodeKey(el, vnodeKey(vdom));
  appendVdomChildren(el, vdom.children, owner, path);
  return el;
}

function replaceNode(parent, oldDom, newDom) {
  if (oldDom === newDom) return newDom;
  if (oldDom) {
    disposeNodeBindings(oldDom);
  }
  if (oldDom && oldDom.parentNode === parent) {
    parent.replaceChild(newDom, oldDom);
  } else if (parent) {
    parent.appendChild(newDom);
  }
  return newDom;
}

function sameHostType(oldDom, vdom) {
  if (isAccessor(vdom) || typeof vdom === 'string' || typeof vdom === 'number') {
    return oldDom.nodeType === Node.TEXT_NODE;
  }
  if (vdom == null || typeof vdom !== 'object' || Array.isArray(vdom)) {
    return false;
  }
  if (isFragmentType(vdom.type) || Array.isArray(vdom)) {
    return (
      oldDom.nodeType === Node.ELEMENT_NODE &&
      oldDom.style?.display === 'contents' &&
      !oldDom.hasAttribute('data-component')
    );
  }
  if (isComponentType(vdom.type)) {
    return oldDom.nodeType === Node.ELEMENT_NODE && oldDom.hasAttribute('data-component');
  }
  return (
    oldDom.nodeType === Node.ELEMENT_NODE &&
    oldDom.tagName === String(vdom.type).toUpperCase() &&
    !oldDom.hasAttribute('data-component')
  );
}

export function patchDom(parent, oldDom, newVdom, owner, path = '0') {
  if (newVdom == null || newVdom === false || newVdom === true) {
    clearChildRange(owner, path);
    disposeTextBinding(oldDom);
    const empty = document.createTextNode('');
    return replaceNode(parent, oldDom, empty);
  }

  if (isGrainTemplate(newVdom)) {
    if (oldDom && oldDom.nodeType === Node.ELEMENT_NODE) {
      return refreshTemplate(oldDom, newVdom);
    }
    clearChildRange(owner, path);
    return replaceNode(parent, oldDom, instantiateTemplate(newVdom));
  }

  if (isAccessor(newVdom)) {
    if (
      isDynamicHost(oldDom) ||
      (oldDom && oldDom.nodeType === Node.TEXT_NODE && oldDom[TEXT_DISPOSE])
    ) {
      disposeTextBinding(oldDom);
      // Re-bind: primitives stay text nodes; structured values get a host.
      return replaceNode(
        parent,
        oldDom,
        createAccessorChild(newVdom, owner, path)
      );
    }
    clearChildRange(owner, path);
    return replaceNode(
      parent,
      oldDom,
      createAccessorChild(newVdom, owner, path)
    );
  }

  if (typeof newVdom === 'string' || typeof newVdom === 'number') {
    clearChildRange(owner, path);
    const text = String(newVdom);
    if (oldDom && oldDom.nodeType === Node.TEXT_NODE) {
      disposeTextBinding(oldDom);
      if (oldDom.nodeValue !== text) oldDom.nodeValue = text;
      return oldDom;
    }
    return replaceNode(parent, oldDom, document.createTextNode(text));
  }

  if (Array.isArray(newVdom)) {
    const kids = normalizeChildren(newVdom);
    if (
      oldDom &&
      oldDom.nodeType === Node.ELEMENT_NODE &&
      oldDom.style?.display === 'contents' &&
      !oldDom.hasAttribute('data-component')
    ) {
      patchChildren(oldDom, kids, owner, path);
      return oldDom;
    }
    clearChildRange(owner, path);
    return replaceNode(parent, oldDom, createDom(kids, owner, path));
  }

  if (isFragmentType(newVdom.type)) {
    const kids = normalizeChildren(newVdom.children);
    if (
      oldDom &&
      oldDom.nodeType === Node.ELEMENT_NODE &&
      oldDom.style?.display === 'contents' &&
      !oldDom.hasAttribute('data-component')
    ) {
      patchChildren(oldDom, kids, owner, path);
      return oldDom;
    }
    clearChildRange(owner, path);
    return replaceNode(parent, oldDom, createDom(newVdom, owner, path));
  }

  if (isComponentType(newVdom.type)) {
    const props = componentProps(newVdom);
    if (oldDom && oldDom.hasAttribute?.('data-component') && owner._children?.has(path)) {
      const entry = owner._children.get(path);
      const expectedFactory = newVdom.type.$$component
        ? newVdom.type
        : newVdom.type.$$wrapped;
      if (entry.factory === newVdom.type || entry.factory === expectedFactory) {
        if (entry.instance._props !== props) {
          entry.instance.update(props);
        }
        return entry.host;
      }
      clearChildRange(owner, path);
      const host = owner._mountChild(path, newVdom.type, props, {
        source: newVdom.__source,
      });
      return replaceNode(parent, oldDom, host);
    }
    clearChildRange(owner, path);
    const host = owner._mountChild(path, newVdom.type, props, {
      source: newVdom.__source,
    });
    return replaceNode(parent, oldDom, host);
  }

  if (!sameHostType(oldDom, newVdom)) {
    clearChildRange(owner, path);
    return replaceNode(parent, oldDom, createDom(newVdom, owner, path));
  }

  applyProps(oldDom, newVdom.props, owner);
  patchChildren(oldDom, normalizeChildren(newVdom.children), owner, path);
  return oldDom;
}

function patchChildren(parentEl, newChildren, owner, path) {
  const oldNodes = [...parentEl.childNodes];
  const keyed = newChildren.some((child) => vnodeKey(child) != null);

  if (!keyed) {
    const max = Math.max(oldNodes.length, newChildren.length);
    for (let i = 0; i < max; i++) {
      const oldNode = oldNodes[i];
      const newChild = newChildren[i];
      const childPath = newChild
        ? childOwnerPath(path, i, newChild)
        : `${path}.${i}`;

      if (newChild === undefined) {
        if (oldNode) removeNode(parentEl, oldNode, owner, childPath);
        continue;
      }

      if (!oldNode) {
        const node = createDom(newChild, owner, childPath);
        setNodeKey(node, vnodeKey(newChild));
        parentEl.appendChild(node);
        continue;
      }

      const next = patchDom(parentEl, oldNode, newChild, owner, childPath);
      setNodeKey(next, vnodeKey(newChild));
    }
    return;
  }

  // Keyed reconciliation
  const oldByKey = new Map();
  const oldUnkeyed = [];
  for (const node of oldNodes) {
    const k = getNodeKey(node);
    if (k != null && !oldByKey.has(k)) oldByKey.set(k, node);
    else oldUnkeyed.push(node);
  }

  const used = new Set();
  let unkeyedIdx = 0;

  for (let i = 0; i < newChildren.length; i++) {
    const newChild = newChildren[i];
    const key = vnodeKey(newChild);
    const childPath = childOwnerPath(path, i, newChild);
    let oldNode;

    if (key != null && oldByKey.has(key)) {
      oldNode = oldByKey.get(key);
      oldByKey.delete(key);
    } else if (unkeyedIdx < oldUnkeyed.length) {
      oldNode = oldUnkeyed[unkeyedIdx++];
    }

    if (oldNode) used.add(oldNode);

    let next;
    if (!oldNode) {
      next = createDom(newChild, owner, childPath);
    } else {
      next = patchDom(parentEl, oldNode, newChild, owner, childPath);
    }
    setNodeKey(next, key);

    const ref = parentEl.childNodes[i] || null;
    if (next !== ref) {
      parentEl.insertBefore(next, ref);
    }
  }

  for (const node of oldNodes) {
    if (!used.has(node) && node.parentNode === parentEl) {
      const staleKey = getNodeKey(node);
      const stalePath =
        staleKey != null
          ? `${path}:${staleKey}`
          : ownerPathForHost(owner, node) ?? `${path}.#x`;
      // Unkeyed nodes in a keyed patch used to use a fake `.#x` path, which
      // skipped owner._children cleanup and left effects/timers running.
      if (staleKey == null) {
        clearOwnedHostsUnder(owner, path, node);
      }
      removeNode(parentEl, node, owner, stalePath);
    }
  }
}

/** Resolve the owner._children path for a direct component host node. */
function ownerPathForHost(owner, host) {
  if (!owner?._children || !host) return null;
  for (const [childPath, entry] of owner._children) {
    if (entry.host === host) return childPath;
  }
  return null;
}

/**
 * Unmount component hosts nested under a DOM node when the node's own owner
 * path is unknown (unkeyed sibling in a keyed patch).
 */
function clearOwnedHostsUnder(owner, pathPrefix, node) {
  if (!owner?._children || !node || node.nodeType !== Node.ELEMENT_NODE) {
    return;
  }
  for (const [childPath, entry] of [...owner._children.entries()]) {
    if (entry.host === node) continue;
    if (!pathMatchesPrefix(childPath, pathPrefix)) {
      continue;
    }
    if (entry.host && node.contains(entry.host)) {
      entry.instance?.unmount();
      owner._children.delete(childPath);
    }
  }
}

function isFragmentHost(node) {
  return (
    node &&
    node.nodeType === Node.ELEMENT_NODE &&
    (node.getAttribute?.('data-fg') === 'fragment' ||
      (node.style?.display === 'contents' && !node.hasAttribute('data-component')))
  );
}

function isComponentHost(node) {
  return node && node.nodeType === Node.ELEMENT_NODE && node.hasAttribute('data-component');
}

function hydrationMismatch(existingNode, vdom, owner, path, reason) {
  reportHydrationMismatch({ existingNode, owner, path, reason, vdom });
  const fresh = createDom(vdom, owner, path);
  if (existingNode?.parentNode) {
    existingNode.parentNode.replaceChild(fresh, existingNode);
  }
  return fresh;
}

/**
 * Adopt an existing DOM node for `vdom` and attach bindings / listeners.
 * On mismatch, warn and replace with a client-created subtree.
 */
export function adoptDom(existingNode, vdom, owner, path = '0') {
  if (vdom == null || vdom === false || vdom === true) {
    if (existingNode && existingNode.nodeType === Node.TEXT_NODE) {
      existingNode.nodeValue = '';
      return existingNode;
    }
    return hydrationMismatch(existingNode, vdom, owner, path, 'expected empty text');
  }

  if (typeof vdom === 'string' || typeof vdom === 'number') {
    const text = String(vdom);
    if (existingNode && existingNode.nodeType === Node.TEXT_NODE) {
      disposeTextBinding(existingNode);
      existingNode.nodeValue = text;
      return existingNode;
    }
    return hydrationMismatch(existingNode, vdom, owner, path, 'expected text node');
  }

  if (isAccessor(vdom)) {
    if (isDynamicHost(existingNode) || isFragmentHost(existingNode)) {
      disposeTextBinding(existingNode);
      existingNode.setAttribute('data-fg', 'dynamic');
      return createDynamicChild(vdom, owner, path, existingNode);
    }
    return hydrationMismatch(existingNode, vdom, owner, path, 'expected dynamic host for accessor');
  }

  if (Array.isArray(vdom)) {
    const kids = normalizeChildren(vdom);
    if (isFragmentHost(existingNode)) {
      adoptChildren(existingNode, kids, owner, path);
      return existingNode;
    }
    return hydrationMismatch(existingNode, kids, owner, path, 'expected fragment host');
  }

  if (typeof vdom !== 'object') {
    return hydrationMismatch(existingNode, vdom, owner, path, 'unexpected vnode');
  }

  if (isFragmentType(vdom.type)) {
    const kids = normalizeChildren(vdom.children);
    if (isFragmentHost(existingNode)) {
      adoptChildren(existingNode, kids, owner, path);
      return existingNode;
    }
    return hydrationMismatch(existingNode, vdom, owner, path, 'expected fragment host');
  }

  if (isComponentType(vdom.type)) {
    if (!isComponentHost(existingNode)) {
      return hydrationMismatch(existingNode, vdom, owner, path, 'expected data-component host');
    }
    return owner._mountChild(path, vdom.type, componentProps(vdom), {
      hydrate: true,
      host: existingNode,
      source: vdom.__source,
    });
  }

  if (
    !existingNode ||
    existingNode.nodeType !== Node.ELEMENT_NODE ||
    existingNode.tagName !== String(vdom.type).toUpperCase() ||
    existingNode.hasAttribute('data-component')
  ) {
    return hydrationMismatch(existingNode, vdom, owner, path, 'expected host element');
  }

  applyProps(existingNode, vdom.props, owner);
  adoptChildren(existingNode, normalizeChildren(vdom.children), owner, path);
  return existingNode;
}

function adoptChildren(parentEl, newChildren, owner, path) {
  const oldNodes = [...parentEl.childNodes];
  const max = Math.max(oldNodes.length, newChildren.length);

  for (let i = 0; i < max; i++) {
    const oldNode = oldNodes[i];
    const newChild = newChildren[i];
    const childPath = newChild
      ? childOwnerPath(path, i, newChild)
      : `${path}.${i}`;

    if (newChild === undefined) {
      if (oldNode) removeNode(parentEl, oldNode, owner, childPath);
      continue;
    }

    if (!oldNode) {
      parentEl.appendChild(createDom(newChild, owner, childPath));
      continue;
    }

    adoptDom(oldNode, newChild, owner, childPath);
  }
}

export function unmountDomTree(owner) {
  if (owner?._bindings) {
    owner._bindings.forEach((dispose) => {
      try {
        dispose();
      } catch (error) {
        console.error('Error disposing binding:', error);
      }
    });
    owner._bindings = [];
  }
  if (!owner?._children) return;
  for (const entry of owner._children.values()) {
    entry.instance?.unmount();
  }
  owner._children.clear();
}
