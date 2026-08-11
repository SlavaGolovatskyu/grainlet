import { JSDOM } from 'jsdom';

const dom = new JSDOM(
  '<!DOCTYPE html><html><body><div id="app"></div></body></html>',
  { pretendToBeVisual: true }
);
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.ResizeObserver =
  dom.window.ResizeObserver ||
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

const { createSignal } = await import('../signals/index.js');
const { createComponent } = await import('../core/component/component.js');
const { jsx } = await import('../core/jsx-compiler-new/jsx-runtime.js');
const { render } = await import('../core/render/render.js');
const { VirtualList } = await import('../core/flow/VirtualList.js');

function flush() {
  return new Promise((r) => setTimeout(r, 0));
}

function rowHosts(root) {
  return [...root.querySelectorAll('[data-index]')];
}

function indices(root) {
  return rowHosts(root).map((el) => Number(el.getAttribute('data-index')));
}

async function testEmptyFallback() {
  const App = createComponent(() =>
    jsx(VirtualList, {
      each: [],
      itemHeight: 20,
      height: 100,
      fallback: jsx('p', { 'data-empty': '' }, 'Empty'),
      children: (item) => jsx('span', null, String(item)),
    })
  );

  const root = document.createElement('div');
  document.body.appendChild(root);
  render(App, root);

  if (!root.querySelector('[data-empty]')) {
    throw new Error('expected fallback for empty each');
  }
  if (root.querySelector('[data-grainlet-virtual-list]')) {
    throw new Error('empty list should not render scroller');
  }
  root.remove();
}

async function testWindowedMountCount() {
  const items = Array.from({ length: 1000 }, (_, i) => ({ id: i, label: `n${i}` }));
  const App = createComponent(() =>
    jsx(VirtualList, {
      each: items,
      itemHeight: 20,
      height: 100,
      overscan: 2,
      children: (item) => jsx('span', null, item.label),
    })
  );

  const root = document.createElement('div');
  document.body.appendChild(root);
  render(App, root);
  await flush();

  const hosts = rowHosts(root);
  if (hosts.length === 0) {
    throw new Error('expected some visible rows');
  }
  if (hosts.length >= 1000) {
    throw new Error(`expected windowed rows, mounted ${hosts.length}`);
  }
  // height 100 / 20 = 5 visible + overscan 2*2 = ~9
  if (hosts.length > 40) {
    throw new Error(`too many rows mounted: ${hosts.length}`);
  }

  const idxs = indices(root);
  if (idxs[0] !== 0) {
    throw new Error(`expected start at 0, got ${idxs[0]}`);
  }
  root.remove();
}

async function testScrollShiftsWindow() {
  const items = Array.from({ length: 1000 }, (_, i) => ({ id: i, label: `n${i}` }));
  const App = createComponent(() =>
    jsx(VirtualList, {
      each: items,
      itemHeight: 20,
      height: 100,
      overscan: 1,
      children: (item) => jsx('span', null, item.label),
    })
  );

  const root = document.createElement('div');
  document.body.appendChild(root);
  render(App, root);
  await flush();

  const before = indices(root);
  const scroller = root.querySelector('[data-grainlet-virtual-list]');
  if (!scroller) throw new Error('missing scroller');

  scroller.scrollTop = 400; // ~ index 20
  scroller.dispatchEvent(new dom.window.Event('scroll', { bubbles: true }));
  await flush();

  const after = indices(root);
  if (after.length === 0) {
    throw new Error('expected rows after scroll');
  }
  if (after[0] <= before[0]) {
    throw new Error(
      `expected window to move down (before=${before[0]}, after=${after[0]})`
    );
  }
  if (after[0] < 15 || after[0] > 25) {
    throw new Error(`expected start near 20, got ${after[0]}`);
  }
  root.remove();
}

async function testIntraRangeScrollDoesNotRemount() {
  let renders = 0;
  function Row(props) {
    renders += 1;
    return jsx('span', { 'data-row': props.id }, String(props.id));
  }

  const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));
  const App = createComponent(() =>
    jsx(VirtualList, {
      each: items,
      itemHeight: 20,
      height: 100,
      overscan: 2,
      children: (item) => jsx(Row, { id: item.id }),
    })
  );

  const root = document.createElement('div');
  document.body.appendChild(root);
  render(App, root);
  await flush();

  const scroller = root.querySelector('[data-grainlet-virtual-list]');
  // Move into a plateau where start stays fixed (scroll 0–59 → start 0).
  scroller.scrollTop = 25;
  scroller.dispatchEvent(new dom.window.Event('scroll', { bubbles: true }));
  await flush();

  const afterWindowMove = renders;
  if (afterWindowMove < 1) throw new Error('expected rows to mount');

  scroller.scrollTop = 50;
  scroller.dispatchEvent(new dom.window.Event('scroll', { bubbles: true }));
  await flush();

  if (renders !== afterWindowMove) {
    throw new Error(
      `intra-range scroll re-rendered rows (before=${afterWindowMove}, after=${renders})`
    );
  }

  scroller.scrollTop = 200; // crosses into a new window
  scroller.dispatchEvent(new dom.window.Event('scroll', { bubbles: true }));
  await flush();

  if (renders <= afterWindowMove) {
    throw new Error('expected new rows to mount after crossing the window');
  }
  root.remove();
}

async function testHorizontalScrollShiftsWindow() {
  const items = Array.from({ length: 1000 }, (_, i) => ({ id: i, label: `n${i}` }));
  const App = createComponent(() =>
    jsx(VirtualList, {
      orientation: 'horizontal',
      each: items,
      itemWidth: 50,
      width: 200,
      height: 80,
      overscan: 1,
      children: (item) => jsx('span', null, item.label),
    })
  );

  const root = document.createElement('div');
  document.body.appendChild(root);
  render(App, root);
  await flush();

  const before = indices(root);
  const scroller = root.querySelector('[data-grainlet-virtual-list]');
  if (!scroller) throw new Error('missing horizontal scroller');
  if (scroller.getAttribute('data-orientation') !== 'horizontal') {
    throw new Error('expected data-orientation=horizontal');
  }

  const hosts = rowHosts(root);
  if (hosts.length === 0 || hosts.length >= 1000) {
    throw new Error(`expected windowed horizontal rows, got ${hosts.length}`);
  }

  scroller.scrollLeft = 500; // ~ index 10
  scroller.dispatchEvent(new dom.window.Event('scroll', { bubbles: true }));
  await flush();

  const after = indices(root);
  if (after.length === 0) {
    throw new Error('expected rows after horizontal scroll');
  }
  if (after[0] <= before[0]) {
    throw new Error(
      `expected window to move right (before=${before[0]}, after=${after[0]})`
    );
  }
  if (after[0] < 6 || after[0] > 14) {
    throw new Error(`expected start near 10, got ${after[0]}`);
  }
  root.remove();
}

async function testDebounceTimeThrottlesWindowUpdates() {
  let renders = 0;
  function Row(props) {
    renders += 1;
    return jsx('span', null, String(props.id));
  }

  const items = Array.from({ length: 200 }, (_, i) => ({ id: i }));
  const App = createComponent(() =>
    jsx(VirtualList, {
      each: items,
      itemHeight: 20,
      height: 100,
      overscan: 1,
      debounceTime: 50,
      children: (item) => jsx(Row, { id: item.id }),
    })
  );

  const root = document.createElement('div');
  document.body.appendChild(root);
  render(App, root);
  await flush();

  const scroller = root.querySelector('[data-grainlet-virtual-list]');
  const afterMount = renders;

  // Burst of scroll events within the debounce window — should not apply all.
  for (const top of [80, 160, 240, 320]) {
    scroller.scrollTop = top;
    scroller.dispatchEvent(new dom.window.Event('scroll', { bubbles: true }));
  }
  await flush();

  const mid = renders;
  // Allow trailing timer to flush the last scroll.
  await new Promise((r) => setTimeout(r, 80));
  await flush();

  if (mid - afterMount > 20) {
    throw new Error(
      `debounceTime should throttle mid-burst updates (mount=${afterMount}, mid=${mid})`
    );
  }
  if (renders <= afterMount) {
    throw new Error('expected trailing debounce to apply at least one window update');
  }
  root.remove();
}

function mockScrollerMetrics(scroller, { clientHeight, scrollHeight, scrollTop }) {
  Object.defineProperty(scroller, 'clientHeight', {
    configurable: true,
    get: () => clientHeight,
  });
  Object.defineProperty(scroller, 'scrollHeight', {
    configurable: true,
    get: () => scrollHeight,
  });
  scroller.scrollTop = scrollTop;
}

async function testEndReachedFiresOnceNearBottom() {
  let calls = 0;
  const items = Array.from({ length: 50 }, (_, i) => ({ id: i }));
  const App = createComponent(() =>
    jsx(VirtualList, {
      each: items,
      itemHeight: 20,
      height: 100,
      overscan: 1,
      endReachedThreshold: 0.2,
      onEndReached: () => {
        calls += 1;
      },
      children: (item) => jsx('span', null, String(item.id)),
    })
  );

  const root = document.createElement('div');
  document.body.appendChild(root);
  render(App, root);
  await flush();
  await flush(); // microtask from bindScroller

  const scroller = root.querySelector('[data-grainlet-virtual-list]');
  // remaining = 1000 - 880 - 100 = 20; threshold = 0.2 * 100 = 20 → near end
  mockScrollerMetrics(scroller, {
    clientHeight: 100,
    scrollHeight: 1000,
    scrollTop: 880,
  });
  scroller.dispatchEvent(new dom.window.Event('scroll', { bubbles: true }));
  await flush();

  if (calls !== 1) {
    throw new Error(`expected onEndReached once, got ${calls}`);
  }

  scroller.scrollTop = 900;
  scroller.dispatchEvent(new dom.window.Event('scroll', { bubbles: true }));
  await flush();
  if (calls !== 1) {
    throw new Error(`expected still one call while armed=false, got ${calls}`);
  }
  root.remove();
}

async function testEndReachedBlockedWhileLoading() {
  let calls = 0;
  const items = Array.from({ length: 50 }, (_, i) => ({ id: i }));
  const App = createComponent(() =>
    jsx(VirtualList, {
      each: items,
      itemHeight: 20,
      height: 100,
      endReachedThreshold: 0.2,
      endReachedLoading: true,
      onEndReached: () => {
        calls += 1;
      },
      children: (item) => jsx('span', null, String(item.id)),
    })
  );

  const root = document.createElement('div');
  document.body.appendChild(root);
  render(App, root);
  await flush();
  await flush();

  const scroller = root.querySelector('[data-grainlet-virtual-list]');
  mockScrollerMetrics(scroller, {
    clientHeight: 100,
    scrollHeight: 1000,
    scrollTop: 900,
  });
  scroller.dispatchEvent(new dom.window.Event('scroll', { bubbles: true }));
  await flush();

  if (calls !== 0) {
    throw new Error(`expected no onEndReached while loading, got ${calls}`);
  }
  root.remove();
}

async function testEndReachedRearmsAfterGrow() {
  let calls = 0;
  const [items, setItems] = createSignal(
    Array.from({ length: 40 }, (_, i) => ({ id: i }))
  );

  const App = createComponent(() =>
    jsx(VirtualList, {
      each: items(),
      itemHeight: 20,
      height: 100,
      endReachedThreshold: 0.2,
      onEndReached: () => {
        calls += 1;
      },
      children: (item) => jsx('span', null, String(item.id)),
    })
  );

  const root = document.createElement('div');
  document.body.appendChild(root);
  render(App, root);
  await flush();
  await flush();

  const scroller = root.querySelector('[data-grainlet-virtual-list]');
  mockScrollerMetrics(scroller, {
    clientHeight: 100,
    scrollHeight: 800,
    scrollTop: 700,
  });
  scroller.dispatchEvent(new dom.window.Event('scroll', { bubbles: true }));
  await flush();
  if (calls !== 1) {
    throw new Error(`expected first onEndReached, got ${calls}`);
  }

  setItems((list) => [
    ...list,
    ...Array.from({ length: 20 }, (_, i) => ({ id: list.length + i })),
  ]);
  await flush();

  mockScrollerMetrics(scroller, {
    clientHeight: 100,
    scrollHeight: 1200,
    scrollTop: 1100,
  });
  scroller.dispatchEvent(new dom.window.Event('scroll', { bubbles: true }));
  await flush();

  if (calls !== 2) {
    throw new Error(`expected re-armed onEndReached after grow, got ${calls}`);
  }
  root.remove();
}

async function testScrollerCustomizationAndRefs() {
  const [items, setItems] = createSignal(
    Array.from({ length: 100 }, (_, i) => ({ id: i }))
  );
  const domRefs = [];
  const apiRefs = [];
  let scrollCalls = 0;
  let lowercaseScrollCalls = 0;

  const App = createComponent(() =>
    jsx(VirtualList, {
      each: items(),
      itemHeight: 20,
      height: 100,
      overscan: 1,
      id: 'custom-virtual-list',
      role: 'feed',
      tabIndex: 3,
      'aria-label': 'Custom results',
      'data-testid': 'virtual-results',
      'data-orientation': 'consumer-value',
      'data-grainlet-virtual-list': 'consumer-value',
      className: 'custom-scroller',
      style: { backgroundColor: 'rgb(1, 2, 3)' },
      ref: (el) => domRefs.push(el),
      apiRef: (api) => apiRefs.push(api),
      onScroll: () => {
        scrollCalls += 1;
      },
      onscroll: () => {
        lowercaseScrollCalls += 1;
      },
      children: (item) => jsx('span', null, String(item.id)),
    })
  );

  const root = document.createElement('div');
  document.body.appendChild(root);
  render(App, root);
  await flush();

  const scroller = root.querySelector('[data-grainlet-virtual-list]');
  if (!scroller) throw new Error('expected customizable scroller');
  if (domRefs.length !== 1 || domRefs[0] !== scroller) {
    throw new Error('forwarded ref should receive the outer scroller once');
  }
  if (apiRefs.length !== 1 || apiRefs[0]?.getElement() !== scroller) {
    throw new Error('apiRef should receive an API for the outer scroller');
  }
  if (
    scroller.id !== 'custom-virtual-list' ||
    scroller.getAttribute('role') !== 'feed' ||
    scroller.tabIndex !== 3 ||
    scroller.getAttribute('aria-label') !== 'Custom results' ||
    scroller.getAttribute('data-testid') !== 'virtual-results'
  ) {
    throw new Error('expected additional DOM attributes on outer scroller');
  }
  if (
    scroller.getAttribute('data-orientation') !== 'vertical' ||
    scroller.getAttribute('data-grainlet-virtual-list') !== ''
  ) {
    throw new Error('internal VirtualList markers must remain authoritative');
  }
  if (
    scroller.className !== 'custom-scroller' ||
    scroller.style.overflow !== 'auto' ||
    scroller.style.height !== '100px' ||
    scroller.style.backgroundColor !== 'rgb(1, 2, 3)'
  ) {
    throw new Error('expected existing class and merged style behavior');
  }

  scroller.scrollTop = 400;
  scroller.dispatchEvent(new dom.window.Event('scroll', { bubbles: true }));
  await flush();
  if (
    scrollCalls !== 1 ||
    lowercaseScrollCalls !== 1 ||
    indices(root)[0] < 15
  ) {
    throw new Error('consumer onScroll must compose with window updates');
  }
  if (domRefs.length !== 1 || apiRefs.length !== 1) {
    throw new Error('stable refs should not be re-fired during list updates');
  }

  setItems([]);
  await flush();
  if (domRefs.at(-1) !== null || apiRefs.at(-1) !== null) {
    throw new Error('DOM and API refs should clear when fallback replaces scroller');
  }
  root.remove();
}

async function testImperativeApiNavigation() {
  const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));
  let api;
  const App = createComponent(() =>
    jsx(VirtualList, {
      each: items,
      itemHeight: 20,
      height: 100,
      overscan: 1,
      apiRef: (value) => {
        api = value;
      },
      children: (item) => jsx('span', null, String(item.id)),
    })
  );

  const root = document.createElement('div');
  document.body.appendChild(root);
  render(App, root);
  await flush();

  const scroller = root.querySelector('[data-grainlet-virtual-list]');
  if (!api || api.getElement() !== scroller) {
    throw new Error('expected mounted imperative API');
  }

  if (!api.scrollToIndex(20, { align: 'center' })) {
    throw new Error('scrollToIndex should succeed');
  }
  await flush();
  if (scroller.scrollTop !== 360 || indices(root)[0] !== 17) {
    throw new Error(
      `centered index navigation failed (top=${scroller.scrollTop}, start=${indices(root)[0]})`
    );
  }

  const range = api.getVisibleRange();
  const rendered = indices(root);
  if (
    range.start !== rendered[0] ||
    range.end !== rendered[rendered.length - 1] + 1
  ) {
    throw new Error('getVisibleRange should match the rendered window');
  }

  if (!api.scrollToItem(items[10], { align: 'end' })) {
    throw new Error('scrollToItem should find a current item');
  }
  await flush();
  if (scroller.scrollTop !== 120 || indices(root)[0] !== 5) {
    throw new Error('end-aligned item navigation failed');
  }
  if (api.scrollToItem({ id: 10 }) !== false) {
    throw new Error('scrollToItem should use current array identity');
  }

  if (!api.scrollToOffset(Number.MAX_SAFE_INTEGER)) {
    throw new Error('scrollToOffset should succeed');
  }
  await flush();
  if (scroller.scrollTop !== 1900 || indices(root).at(-1) !== 99) {
    throw new Error('scrollToOffset should clamp to the maximum offset');
  }

  let smoothOptions;
  scroller.scrollTo = (options) => {
    smoothOptions = options;
  };
  api.scrollToIndex(-100, { behavior: 'smooth' });
  if (
    smoothOptions?.top !== 0 ||
    smoothOptions?.behavior !== 'smooth'
  ) {
    throw new Error('smooth index navigation should use native scrollTo');
  }
  root.remove();
}

async function testHorizontalImperativeNavigation() {
  const items = Array.from({ length: 30 }, (_, i) => ({ id: i }));
  let api;
  const App = createComponent(() =>
    jsx(VirtualList, {
      orientation: 'horizontal',
      each: items,
      itemWidth: 50,
      width: 200,
      height: 80,
      overscan: 1,
      apiRef: (value) => {
        api = value;
      },
      children: (item) => jsx('span', null, String(item.id)),
    })
  );

  const root = document.createElement('div');
  document.body.appendChild(root);
  render(App, root);
  await flush();

  const scroller = root.querySelector('[data-grainlet-virtual-list]');
  api.scrollToIndex(10);
  await flush();
  if (scroller.scrollLeft !== 500 || scroller.scrollTop !== 0) {
    throw new Error('horizontal API navigation should use scrollLeft');
  }
  if (indices(root)[0] < 8 || indices(root)[0] > 10) {
    throw new Error('horizontal API navigation should update the window');
  }
  root.remove();
}

await testEmptyFallback();
await testWindowedMountCount();
await testScrollShiftsWindow();
await testIntraRangeScrollDoesNotRemount();
await testDebounceTimeThrottlesWindowUpdates();
await testEndReachedFiresOnceNearBottom();
await testEndReachedBlockedWhileLoading();
await testEndReachedRearmsAfterGrow();
await testHorizontalScrollShiftsWindow();
await testScrollerCustomizationAndRefs();
await testImperativeApiNavigation();
await testHorizontalImperativeNavigation();
console.log('virtual-list tests passed');
process.exit(0);
