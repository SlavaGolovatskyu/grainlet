import { createSignal } from '../../signals/createSignal/createSignal.js';
import { createBindingEffect } from '../../signals/createEffect/createEffect.js';
import { untrack } from '../../signals/untrack/untrack.js';
import {
  currentComponent,
  setCurrentComponent,
} from '../../signals/reactive-context/reactive-context.js';
import {
  createDom,
  patchDom,
  unmountOwnedNode,
} from '../dom/dom.js';

export function defaultKeyOf(item, index) {
  if (item == null) return index;
  if (
    typeof item === 'string' ||
    typeof item === 'number' ||
    typeof item === 'boolean'
  ) {
    return item;
  }
  if (typeof item === 'object') {
    if (item.id != null) return item.id;
    if (item.key != null) return item.key;
  }
  return index;
}

export function resolveKeyed(keyedProp) {
  if (typeof keyedProp === 'function') return keyedProp;
  if (keyedProp === false) return (_item, index) => index;
  return defaultKeyOf;
}

export function normalizeEach(list) {
  return Array.isArray(list) ? list : list == null ? [] : [list];
}

function rowPath(key) {
  return `for:${key}`;
}

function isListRowNode(node) {
  return node != null && node.__grainKey != null;
}

function firstListRowNode(parentEl) {
  let node = parentEl.firstChild;
  while (node && !isListRowNode(node)) node = node.nextSibling;
  return node;
}

function nextListRowNode(node) {
  let next = node ? node.nextSibling : null;
  while (next && !isListRowNode(next)) next = next.nextSibling;
  return next;
}

/** Swap two sibling nodes — micro-opt for a pure 2-row transposition only. */
function swapDomNodes(a, b) {
  if (!a || !b || a === b) return;
  const parent = a.parentNode;
  if (!parent || b.parentNode !== parent) return;
  const markerA = document.createTextNode('');
  const markerB = document.createTextNode('');
  parent.insertBefore(markerA, a);
  parent.insertBefore(markerB, b);
  parent.insertBefore(a, markerB);
  parent.insertBefore(b, markerA);
  parent.removeChild(markerA);
  parent.removeChild(markerB);
}

/**
 * Longest increasing subsequence mask over `positions` (DOM indices).
 * Nodes in the LIS stay put; others are moved — O(n log n), ~2 moves for a swap.
 */
function lisKeepMask(positions) {
  const n = positions.length;
  const keep = new Array(n).fill(false);
  const tailsPos = [];
  const tailsAt = [];
  const pred = new Array(n).fill(-1);

  for (let i = 0; i < n; i++) {
    const v = positions[i];
    let lo = 0;
    let hi = tailsPos.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tailsPos[mid] < v) lo = mid + 1;
      else hi = mid;
    }
    if (lo > 0) pred[i] = tailsAt[lo - 1];
    if (lo === tailsPos.length) {
      tailsPos.push(v);
      tailsAt.push(i);
    } else {
      tailsPos[lo] = v;
      tailsAt[lo] = i;
    }
  }

  if (tailsAt.length === 0) return keep;
  let k = tailsAt[tailsAt.length - 1];
  while (k >= 0) {
    keep[k] = true;
    k = pred[k];
  }
  return keep;
}

/**
 * Reorder row nodes to match `ordered` with minimal moves.
 * A naive forward insertBefore cascades on distant swaps (~N moves);
 * LIS keeps the longest already-correct subsequence and moves the rest.
 */
function syncDomOrder(parentEl, ordered) {
  const nodes = [];
  for (let i = 0; i < ordered.length; i++) {
    const node = ordered[i].root;
    if (node) nodes.push(node);
  }
  const n = nodes.length;
  if (n === 0) return;

  // Already in target order?
  let el = firstListRowNode(parentEl);
  let same = true;
  for (let i = 0; i < n; i++) {
    if (nodes[i] !== el) {
      same = false;
      break;
    }
    el = nextListRowNode(el);
  }
  if (same) return;

  // Pure 2-node transposition (js-framework-benchmark swaprows)
  el = firstListRowNode(parentEl);
  const mismatch = [];
  for (let i = 0; i < n; i++) {
    if (nodes[i] !== el) mismatch.push(i);
    el = nextListRowNode(el);
  }
  if (
    mismatch.length === 2 &&
    nodes[mismatch[0]] &&
    nodes[mismatch[1]]
  ) {
    // Walk DOM again to see if the two expected nodes are simply swapped
    const a = nodes[mismatch[0]];
    const b = nodes[mismatch[1]];
    el = firstListRowNode(parentEl);
    let at0 = null;
    let at1 = null;
    for (let i = 0; i < n; i++) {
      if (i === mismatch[0]) at0 = el;
      if (i === mismatch[1]) at1 = el;
      el = nextListRowNode(el);
    }
    if (at0 === b && at1 === a) {
      swapDomNodes(a, b);
      return;
    }
  }

  // General: LIS — move only nodes not already in increasing DOM order
  const domPos = new Map();
  el = firstListRowNode(parentEl);
  for (let i = 0; el; el = nextListRowNode(el), i++) {
    domPos.set(el, i);
  }
  const positions = new Array(n);
  for (let i = 0; i < n; i++) {
    positions[i] = domPos.get(nodes[i]) ?? i;
  }
  const keep = lisKeepMask(positions);

  let prev = null;
  for (let i = 0; i < n; i++) {
    const node = nodes[i];
    if (!keep[i]) {
      if (prev == null) {
        const first = firstListRowNode(parentEl);
        if (node !== first) parentEl.insertBefore(node, first);
      } else if (node.previousSibling !== prev) {
        parentEl.insertBefore(node, prev.nextSibling);
      }
    }
    prev = node;
  }
}

/**
 * Mount a lightweight keyed row: item signal + render effect → DOM under parent.
 * No per-row component host.
 */
function mountRow(parentEl, owner, key, item, index, render, needsIndex) {
  const prevComp = currentComponent;
  setCurrentComponent(null);

  const [getItem, setItem] = createSignal(item);
  let getIndex;
  let setIndex;
  if (needsIndex) {
    [getIndex, setIndex] = createSignal(index);
  }

  const path = rowPath(key);
  const row = {
    key,
    path,
    getItem,
    setItem,
    getIndex,
    setIndex,
    render,
    needsIndex,
    root: null,
    dispose: null,
  };

  row.dispose = createBindingEffect(() => {
    const current = row.getItem();
    let vnode;
    if (typeof row.render !== 'function') {
      vnode = row.render;
    } else if (row.needsIndex) {
      // Pass the index accessor (Solid-style), not its current value.
      vnode = row.render(current, row.getIndex);
    } else {
      vnode = row.render(current);
    }

    // Keep createDom bindings on the node (not For._bindings) for per-row dispose.
    const prev = currentComponent;
    setCurrentComponent(null);
    try {
      if (!row.root) {
        row.root = createDom(vnode, owner, path);
        row.root.__grainKey = key;
        parentEl.appendChild(row.root);
      } else {
        row.root = patchDom(parentEl, row.root, vnode, owner, path);
        row.root.__grainKey = key;
      }
    } finally {
      setCurrentComponent(prev);
    }
  });

  setCurrentComponent(prevComp);
  return row;
}

function disposeRow(parentEl, owner, row, removeDom = true) {
  if (row.dispose) {
    row.dispose();
    row.dispose = null;
  }
  if (row.root) {
    if (removeDom) {
      unmountOwnedNode(parentEl, row.root, owner, row.path);
    } else {
      // Clear path: dispose bindings/child components; DOM stripped in one pass.
      unmountOwnedNode(null, row.root, owner, row.path);
    }
    row.root = null;
  }
}

/** Remove every mounted row from `parentEl` / `bag`. */
export function clearKeyedList(parentEl, bag, owner) {
  if (!bag?.rows) return;
  for (const row of bag.rows.values()) {
    disposeRow(parentEl, owner, row, false);
  }
  bag.rows.clear();
  if (!parentEl) return;
  let child = parentEl.firstChild;
  while (child) {
    const next = child.nextSibling;
    if (isListRowNode(child) || (child.nodeType === Node.ELEMENT_NODE && child.hasAttribute('data-key'))) {
      parentEl.removeChild(child);
    }
    child = next;
  }
}

/**
 * Solid-style keyed list: insert/move/remove real DOM under `parentEl`.
 *
 * @param {Element} parentEl
 * @param {{ rows: Map<unknown, object> }} bag
 * @param {unknown[]} items
 * @param {(item: unknown, index: number) => unknown} keyed
 * @param {unknown} render
 * @param {object} owner component instance (For)
 * @param {{ start?: number, end?: number }} [options]
 */
export function reconcileKeyedList(
  parentEl,
  bag,
  items,
  keyed,
  render,
  owner,
  options = {}
) {
  if (!parentEl || !owner) return;

  const start = options.start ?? 0;
  const end = options.end ?? items.length;
  const needsIndex = typeof render === 'function' && render.length > 1;
  const seen = new Set();
  const ordered = [];

  for (let index = start; index < end; index++) {
    const item = items[index];
    const key = keyed(item, index);
    seen.add(key);

    let row = bag.rows.get(key);
    if (!row) {
      row = mountRow(parentEl, owner, key, item, index, render, needsIndex);
      bag.rows.set(key, row);
    } else {
      row.render = render;
      row.needsIndex = needsIndex;
      if (!Object.is(untrack(() => row.getItem()), item)) {
        row.setItem(item);
      }
      if (needsIndex && row.setIndex) {
        if (!Object.is(untrack(() => row.getIndex()), index)) {
          row.setIndex(index);
        }
      }
    }

    ordered.push(row);
  }

  for (const key of [...bag.rows.keys()]) {
    if (!seen.has(key)) {
      const row = bag.rows.get(key);
      disposeRow(parentEl, owner, row);
      bag.rows.delete(key);
    }
  }

  syncDomOrder(parentEl, ordered);
}

/**
 * SSR / plain vnode mapping (no component hosts). Used by VirtualList window.
 */
export function mapKeyedVnodes(items, keyed, render, options = {}) {
  const start = options.start ?? 0;
  const end = options.end ?? items.length;
  const mapRow = options.mapRow;
  const out = [];

  for (let index = start; index < end; index++) {
    const item = items[index];
    const key = keyed(item, index);
    let vnode;
    if (typeof render !== 'function') {
      vnode = render;
    } else if (render.length > 1) {
      // SSR has no reactive index signal; expose a stable constant accessor.
      vnode = render(item, () => index);
    } else {
      vnode = render(item);
    }
    if (vnode != null && typeof vnode === 'object') {
      vnode.key = key;
      if (vnode.props) vnode.props.key = key;
    }
    out.push(mapRow ? mapRow(vnode, index, item, key) : vnode);
  }

  return out;
}
