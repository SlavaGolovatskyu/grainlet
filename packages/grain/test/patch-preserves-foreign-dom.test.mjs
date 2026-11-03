import { JSDOM } from 'jsdom';
import assert from 'node:assert/strict';

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.HTMLElement = dom.window.HTMLElement;

const { createSignal, render } = await import('../index.js');

function MapHost() {
  const [tick, setTick] = createSignal(0);
  globalThis.__bump = () => setTick((n) => n + 1);

  return {
    type: 'div',
    props: {
      className: 'map-host',
      ref: (node) => {
        if (!node || node.querySelector('canvas')) return;
        const canvas = document.createElement('canvas');
        canvas.className = 'foreign-canvas';
        node.appendChild(canvas);
      },
    },
    // Empty children after first paint — MapLibre-style foreign DOM must remain.
    children: tick() >= 0 ? [] : [],
    isComponent: false,
  };
}

function Label() {
  const [tick, setTick] = createSignal(0);
  globalThis.__bumpLabel = () => setTick((n) => n + 1);
  return {
    type: 'a',
    props: { className: 'nav-link', href: '/' },
    children: ['Home', tick() >= 0 ? null : null],
    isComponent: false,
  };
}

function App() {
  return {
    type: 'div',
    props: {},
    children: [
      { type: MapHost, props: {}, children: [], isComponent: true },
      { type: Label, props: {}, children: [], isComponent: true },
    ],
    isComponent: false,
  };
}

render(App, document.getElementById('app'));

const host = document.querySelector('.map-host');
assert.ok(host, 'host mounted');
assert.equal(host.querySelectorAll('canvas.foreign-canvas').length, 1, 'foreign canvas present');

globalThis.__bump();
await new Promise((r) => setTimeout(r, 0));

assert.equal(
  host.querySelectorAll('canvas.foreign-canvas').length,
  1,
  'foreign canvas must survive empty-children patch'
);

const link = document.querySelector('.nav-link');
assert.equal(link.textContent, 'Home');
globalThis.__bumpLabel();
await new Promise((r) => setTimeout(r, 0));
globalThis.__bumpLabel();
await new Promise((r) => setTimeout(r, 0));
assert.equal(link.textContent, 'Home', 'owned text must not duplicate on re-render');

console.log('patch-preserves-foreign-dom: PASS');
