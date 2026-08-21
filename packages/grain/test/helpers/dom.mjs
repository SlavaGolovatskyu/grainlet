import { JSDOM } from 'jsdom';

const GLOBALS = [
  'window',
  'document',
  'Node',
  'HTMLElement',
  'Element',
  'Event',
  'MouseEvent',
  'CustomEvent',
  'MutationObserver',
  'navigator',
];

export function setupDom(
  html = '<!doctype html><html><head></head><body></body></html>',
  options = {}
) {
  const dom = new JSDOM(html, {
    pretendToBeVisual: true,
    url: 'http://localhost/',
    ...options,
  });
  const previous = new Map();
  for (const name of GLOBALS) {
    previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    if (name in dom.window) {
      Object.defineProperty(globalThis, name, {
        configurable: true,
        value: dom.window[name],
        writable: true,
      });
    }
  }
  return () => {
    dom.window.close();
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  };
}

export async function nextTick() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}
