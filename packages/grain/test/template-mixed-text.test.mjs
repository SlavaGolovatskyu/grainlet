import { JSDOM } from 'jsdom';

const dom = new JSDOM(
  '<!DOCTYPE html><html><body><div id="app"></div></body></html>',
  { pretendToBeVisual: true }
);
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.HTMLElement = dom.window.HTMLElement;

const { createSignal, render } = await import('../index.js');
const {
  template,
  mountTemplate,
  bindTemplateText,
  walkPath,
} = await import('../core/dom/template.js');

/** Mirrors compiled output for `<p class="count">Count: {count()}</p>`. */
function CountDisplay() {
  const [count] = createSignal(7);
  const proto = template('<p class="count">Count:<!--g--> </p>');
  return mountTemplate(proto, (el) => {
    bindTemplateText(walkPath(el, [2]), count);
  });
}

const root = document.getElementById('app');
render(CountDisplay, root);

const text = root.querySelector('.count')?.textContent;
if (text !== 'Count:7') {
  throw new Error(`expected "Count:7", got ${JSON.stringify(text)}`);
}

console.log('template-mixed-text: PASS');
