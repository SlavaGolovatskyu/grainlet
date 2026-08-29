import { JSDOM } from 'jsdom';

const dom = new JSDOM(
  '<!DOCTYPE html><html><body><div id="app"></div></body></html>',
  { pretendToBeVisual: true }
);
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.HTMLElement = dom.window.HTMLElement;

const { createSignal, createEffect, onCleanup, render } = await import('../index.js');
const { jsx } = await import('../core/jsx-compiler-new/jsx-runtime.js');
const { template, mountTemplate, bindTemplateProp } = await import(
  '../core/jsx-compiler-new/jsx-runtime.js'
);

let unmountLogCount = 0;
let bump;

function EffectsDemo() {
  const [name] = createSignal('hello');
  const [count, setCount] = createSignal(0);
  const [logs, setLogs] = createSignal([]);

  const addLog = (message) => {
    setLogs((prev) => [...prev, message]);
    if (message === 'Component unmounting') unmountLogCount++;
  };

  createEffect(() => {
    count();
    addLog(`effect-${count()}`);
  });

  onCleanup(() => {
    addLog('Component unmounting');
  });

  bump = () => setCount((c) => c + 1);

  const _tmpl = template('<input type="text"></input>');

  return jsx('div', null, [
    mountTemplate(_tmpl, (el) => {
      bindTemplateProp(el, 'value', () => name());
    }),
    jsx('div', { 'data-logs': true }, logs().length),
  ]);
}

render(EffectsDemo, document.getElementById('app'));

const input = document.querySelector('input');
bump();
bump();
await new Promise((r) => setTimeout(r, 30));

if (unmountLogCount !== 0) {
  throw new Error(`expected 0 fake unmount logs, got ${unmountLogCount}`);
}
if (input?.value !== 'hello') {
  throw new Error(`expected input "hello", got "${input?.value?.slice(0, 40)}"`);
}

console.log('onCleanup-in-render: PASS');
