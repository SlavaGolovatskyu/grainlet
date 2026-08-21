import { JSDOM } from 'jsdom';

const dom = new JSDOM(
  '<!DOCTYPE html><html><body><div id="app"></div></body></html>'
);
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.HTMLElement = dom.window.HTMLElement;

const { createSignal, For } = await import('../index.js');
const { createComponent } = await import('../core/component/component.js');
const { jsx } = await import('../core/jsx-compiler-new/jsx-runtime.js');
const { render } = await import('../core/render/render.js');

function buildData(n) {
  const a = [];
  for (let i = 1; i <= n; i++) a.push({ id: i, label: 'item ' + i });
  return a;
}

globalThis.__appRenderCount = 0;

const App = createComponent(() => {
  globalThis.__appRenderCount++;
  const [data, setData] = createSignal([]);
  const [selected, setSelected] = createSignal(null);
  globalThis.__setData = setData;
  globalThis.__setSelected = setSelected;
  // For owns `each` — App must not read data() here.
  return jsx(
    'div',
    { className: 'container' },
    jsx(
      'table',
      { className: 'table test-data' },
      jsx(
        'tbody',
        null,
        jsx(For, {
          each: data,
          children: (row) =>
            jsx(
              'tr',
              {
                className: () => (selected() === row.id ? 'danger' : ''),
                'data-id': () => String(row.id),
              },
              jsx('td', { className: 'col-md-1' }, () => row.id),
              jsx(
                'td',
                { className: 'col-md-4' },
                jsx(
                  'a',
                  { onclick: () => setSelected(row.id) },
                  () => row.label
                )
              ),
              jsx(
                'td',
                { className: 'col-md-1' },
                jsx(
                  'a',
                  {
                    onclick: () =>
                      setData((d) => d.filter((r) => r.id !== row.id)),
                  },
                  'x'
                )
              )
            ),
        })
      )
    )
  );
});

const root = document.getElementById('app');
render(App, root);

function countComponentHosts() {
  return root.querySelectorAll('.test-data [data-component]').length;
}

function getAppRenderCount() {
  return globalThis.__appRenderCount;
}

try {
  const rendersBefore = getAppRenderCount();
  __setData(buildData(1000));
  const trs = root.querySelectorAll('tbody tr').length;
  if (trs !== 1000) throw new Error(`expected 1000 rows, got ${trs}`);

  // Solid-style For: only the For host itself, not one host per row.
  const hosts = countComponentHosts();
  if (hosts !== 1) {
    throw new Error(`expected 1 data-component host under table, got ${hosts}`);
  }

  if (getAppRenderCount() !== rendersBefore) {
    throw new Error(
      `App re-rendered on list set (${rendersBefore} → ${getAppRenderCount()}); For should own each`
    );
  }

  __setData((d) => d.concat(buildData(100).map((r, i) => ({ ...r, id: 1000 + i + 1 }))));
  if (root.querySelectorAll('tbody tr').length !== 1100) {
    throw new Error('append failed');
  }
  if (getAppRenderCount() !== rendersBefore) {
    throw new Error('App re-rendered on append; For should own each');
  }

  __setData((d) =>
    d.map((row, i) =>
      i % 10 === 0 ? { id: row.id, label: row.label + ' !!!' } : row
    )
  );
  if (root.querySelectorAll('tbody tr').length !== 1100) {
    throw new Error('rows lost after update');
  }

  __setSelected(5);
  if (!root.querySelector('tr.danger')) {
    throw new Error('select did not apply danger class');
  }

  __setData(buildData(1000));
  const beforeSwap = performance.now();
  __setData((d) => {
    const next = d.slice();
    const tmp = next[1];
    next[1] = next[998];
    next[998] = tmp;
    return next;
  });
  const swapMs = performance.now() - beforeSwap;
  const afterIds = [...root.querySelectorAll('tbody tr')].map((tr) =>
    tr.getAttribute('data-id')
  );
  if (afterIds[1] !== '999' || afterIds[998] !== '2') {
    throw new Error(
      `swap order wrong: [1]=${afterIds[1]} [998]=${afterIds[998]}`
    );
  }
  // Cascade/fragment was tens of ms; 2-node swap should be tiny in jsdom.
  if (swapMs > 25) {
    throw new Error(`swap too slow: ${swapMs.toFixed(1)}ms`);
  }
  console.log('swap', swapMs.toFixed(2), 'ms');

  // Fixed ids 1..1000 then 100 pairwise end-swaps — exercises LIS (not 2-node micro-opt).
  __setData(buildData(1000).map((_, i) => ({ id: i + 1, label: 'item ' + (i + 1) })));
  const beforeMany = performance.now();
  __setData((d) => {
    const next = d.slice();
    for (let i = 0; i < 100; i++) {
      const j = next.length - 1 - i;
      const tmp = next[i];
      next[i] = next[j];
      next[j] = tmp;
    }
    return next;
  });
  const manyMs = performance.now() - beforeMany;
  const manyIds = [...root.querySelectorAll('tbody tr')].map((tr) =>
    tr.getAttribute('data-id')
  );
  // After 100 end-swaps: [1000..901, 101..900, 100..1]
  if (manyIds[0] !== '1000' || manyIds[99] !== '901' || manyIds[999] !== '1') {
    throw new Error(
      `swap-many order wrong: [0]=${manyIds[0]} [99]=${manyIds[99]} [999]=${manyIds[999]}`
    );
  }
  if (!process.env.GRAINLET_COVERAGE && manyMs > 40) {
    throw new Error(`swap-many too slow: ${manyMs.toFixed(1)}ms`);
  }
  console.log('swap-many', manyMs.toFixed(2), 'ms');


  __setData((d) => d.filter((_, i) => i !== 0));
  if (root.querySelectorAll('tbody tr').length !== 999) {
    throw new Error('remove failed');
  }

  __setData([]);
  if (root.querySelectorAll('tbody tr').length !== 0) {
    throw new Error('clear failed');
  }
  if (countComponentHosts() !== 1) {
    throw new Error('For host should remain after clear');
  }

  __setData(buildData(100));
  if (root.querySelectorAll('tbody tr').length !== 100) {
    throw new Error('recreate failed');
  }

  console.log('PASS');
} catch (e) {
  console.error('FAIL', e.message);
  console.error(e.stack?.split('\n').slice(0, 20).join('\n'));
  process.exit(1);
}
