import {
  hydrate as grainHydrate,
  render as grainRender,
} from '../core/render/render.js';

const mounted = new Set();

function ensureDocument() {
  if (typeof document === 'undefined') {
    throw new Error('grainlet/testing requires a DOM-like test environment');
  }
}

function mountWith(method, Component, options = {}) {
  ensureDocument();
  const container = options.container ?? document.createElement('div');
  if (!container.parentNode) document.body.appendChild(container);
  if (options.html != null) container.innerHTML = options.html;
  const instance = method(Component, container, options.props || {});
  const result = {
    container,
    instance,
    rerender(props = {}) {
      instance.update(props);
      return result;
    },
    unmount() {
      instance.unmount();
      container.remove();
      mounted.delete(result);
    },
  };
  mounted.add(result);
  return result;
}

export function render(Component, options) {
  return mountWith(grainRender, Component, options);
}

export function hydrate(Component, options) {
  return mountWith(grainHydrate, Component, options);
}

export function renderHook(callback, options = {}) {
  let value;
  function HookHarness(props) {
    value = callback(props);
    return null;
  }
  const mountedHook = render(HookHarness, {
    ...options,
    props: options.initialProps,
  });
  return {
    ...mountedHook,
    result: () => value,
    rerender(props) {
      mountedHook.rerender(props);
    },
  };
}

function byText(root, text) {
  const matcher = typeof text === 'string'
    ? (value) => value === text
    : (value) => text.test(value);
  return [...root.querySelectorAll('*')]
    .find((node) => matcher(node.textContent?.trim() || ''));
}

export const screen = {
  getByTestId(id) {
    const node = [...document.querySelectorAll('[data-testid]')]
      .find((candidate) => candidate.getAttribute('data-testid') === id);
    if (!node) throw new Error(`Unable to find data-testid=${id}`);
    return node;
  },
  getByText(text) {
    const node = byText(document.body, text);
    if (!node) throw new Error(`Unable to find text ${String(text)}`);
    return node;
  },
  queryByText(text) {
    return byText(document.body, text) ?? null;
  },
  getByRole(role, options = {}) {
    const nodes = [...document.querySelectorAll('[role],button,a,input,select,textarea')]
      .filter((candidate) =>
        candidate.getAttribute('role') === role
        || candidate.tagName.toLowerCase() === role
      );
    const node = options.name == null
      ? nodes[0]
      : nodes.find((candidate) => {
        const name = candidate.getAttribute('aria-label')
          || candidate.textContent?.trim();
        return typeof options.name === 'string'
          ? name === options.name
          : options.name.test(name || '');
      });
    if (!node) throw new Error(`Unable to find role ${role}`);
    return node;
  },
};

export function fireEvent(node, event) {
  node.dispatchEvent(event);
  return event;
}

for (const [name, EventType] of [
  ['click', 'MouseEvent'],
  ['input', 'Event'],
  ['change', 'Event'],
  ['submit', 'Event'],
]) {
  fireEvent[name] = (node, init = {}) => {
    const Constructor = globalThis[EventType];
    return fireEvent(node, new Constructor(name, {
      bubbles: true,
      cancelable: true,
      ...init,
    }));
  };
}

export async function waitFor(assertion, options = {}) {
  const timeout = options.timeout ?? 1000;
  const interval = options.interval ?? 10;
  const started = Date.now();
  let lastError;
  while (Date.now() - started <= timeout) {
    try {
      return await assertion();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }
  throw lastError ?? new Error(`waitFor timed out after ${timeout}ms`);
}

export function cleanup() {
  for (const result of [...mounted]) result.unmount();
}
