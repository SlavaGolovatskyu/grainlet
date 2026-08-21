import assert from 'node:assert/strict';
import {
  configureHydration,
  createSignal,
  hydrate,
} from 'grainlet';
import { jsx } from 'grainlet/jsx-runtime';
import { jsxDEV } from 'grainlet/jsx-dev-runtime';
import { renderToString } from 'grainlet/ssr';
import {
  cleanup,
  fireEvent,
  render as renderForTest,
  screen,
  waitFor,
} from 'grainlet/testing';
import { setupDom } from './helpers/dom.mjs';

function Counter() {
  const [count, setCount] = createSignal(0);
  return jsx(
    'button',
    {
      'data-testid': 'counter',
      onclick: () => setCount((value) => value + 1),
    },
    count
  );
}

{
  const html = renderToString(Counter);
  const teardown = setupDom(`<!doctype html><div id="app">${html}</div>`);
  const button = document.querySelector('button');
  const mismatches = [];
  const reset = configureHydration({
    onMismatch: (detail) => mismatches.push(detail),
  });
  const instance = hydrate(Counter, document.getElementById('app'));
  assert.equal(document.querySelector('button'), button, 'hydration adopts host DOM');
  assert.equal(mismatches.length, 0);
  fireEvent.click(button);
  assert.equal(button.textContent, '1');
  instance.unmount();
  reset();
  teardown();
}

{
  const teardown = setupDom(
    '<!doctype html><div id="app"><div>server</div></div>'
  );
  let detail;
  const reset = configureHydration({
    onMismatch: (value) => { detail = value; },
  });
  const originalWarn = console.warn;
  console.warn = () => {};
  const instance = hydrate(
    () => jsxDEV(
      'button',
      { children: 'client' },
      undefined,
      false,
      { fileName: 'Mismatch.jsx', lineNumber: 4, columnNumber: 2 }
    ),
    document.getElementById('app')
  );
  console.warn = originalWarn;
  assert.equal(detail.expected, '<button>');
  assert.equal(detail.actual, '<div>');
  assert.equal(detail.source.fileName, 'Mismatch.jsx');
  assert.equal(document.querySelector('button').textContent, 'client');
  instance.unmount();
  reset();
  teardown();
}

{
  const teardown = setupDom(
    '<!doctype html><div id="app"><span>server text</span></div>'
  );
  const reasons = [];
  const reset = configureHydration({
    onMismatch: (detail) => reasons.push(detail.reason),
  });
  const originalWarn = console.warn;
  console.warn = () => {};
  hydrate(
    () => 'client text',
    document.getElementById('app')
  );
  console.warn = originalWarn;
  assert.ok(reasons.includes('expected text node'));
  reset();
  teardown();
}

{
  const teardown = setupDom(
    '<!doctype html><div id="app"><div>not a fragment</div></div>'
  );
  const reasons = [];
  const reset = configureHydration({
    onMismatch: (detail) => reasons.push(detail.reason),
  });
  const originalWarn = console.warn;
  console.warn = () => {};
  hydrate(
    () => ['a', 'b'],
    document.getElementById('app')
  );
  console.warn = originalWarn;
  assert.ok(reasons.includes('expected fragment host'));
  reset();
  teardown();
}

{
  const teardown = setupDom();
  renderForTest(Counter);
  fireEvent.click(screen.getByTestId('counter'));
  await waitFor(() => assert.equal(screen.getByText('1').textContent, '1'));
  cleanup();
  teardown();
}

console.log('hydration diagnostics and testing utilities tests passed');
