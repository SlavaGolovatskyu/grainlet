import { JSDOM } from 'jsdom';
import assert from 'node:assert/strict';

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.HTMLElement = dom.window.HTMLElement;

const { createSignal, For, render } = await import('../index.js');

const seen = [];

function App() {
  const [items] = createSignal(['a', 'b', 'c']);
  return {
    type: 'ul',
    props: {},
    children: [
      {
        type: For,
        props: {
          each: items,
          children: (item, index) => {
            assert.equal(typeof index, 'function', 'For must pass an index accessor');
            seen.push({ item, index: index() });
            return {
              type: 'li',
              props: {},
              children: [`${index()}:${item}`],
              isComponent: false,
            };
          },
        },
        children: [],
        isComponent: true,
      },
    ],
    isComponent: false,
  };
}

render(App, document.getElementById('app'));

assert.deepEqual(seen, [
  { item: 'a', index: 0 },
  { item: 'b', index: 1 },
  { item: 'c', index: 2 },
]);

const labels = [...document.querySelectorAll('li')].map((el) => el.textContent);
assert.deepEqual(labels, ['0:a', '1:b', '2:c']);

console.log('for-index-accessor: PASS');
