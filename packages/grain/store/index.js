import { currentComponent } from '../signals/reactive-context/reactive-context.js';
import { createSignalInstance } from '../signals/createSignal/createSignal.js';
import { batch } from '../signals/scheduler.js';
import { deepClone, replaceEqualDeep } from '../utils/object.js';

export const STORE_RAW = Symbol.for('grainlet.store.raw');
const ITERATE = Symbol('iterate');
const proxyCache = new WeakMap();
const storeRegistry = new WeakMap();

function nodeFor(meta, target, property) {
  let nodes = meta.nodes.get(target);
  if (!nodes) {
    nodes = new Map();
    meta.nodes.set(target, nodes);
  }
  if (!nodes.has(property)) {
    const [read, write] = createSignalInstance(
      property === ITERATE ? 0 : Reflect.get(target, property)
    );
    nodes.set(property, { read, write });
  }
  return nodes.get(property);
}

function notify(meta, target, property, value) {
  const nodes = meta.nodes.get(target);
  nodes?.get(property)?.write(value);
  const iterate = nodes?.get(ITERATE);
  if (iterate) iterate.write((count) => count + 1);
}

function wrap(target, meta) {
  if (target == null || typeof target !== 'object') return target;
  let byMeta = proxyCache.get(target);
  if (!byMeta) {
    byMeta = new WeakMap();
    proxyCache.set(target, byMeta);
  }
  if (byMeta.has(meta)) return byMeta.get(meta);
  const proxy = new Proxy(target, {
    get(object, property, receiver) {
      if (property === STORE_RAW) return object;
      const value = nodeFor(meta, object, property).read();
      return wrap(value, meta);
    },
    set(object, property, value) {
      const previous = Reflect.get(object, property);
      const next = typeof value === 'function' ? value(previous) : value;
      if (Object.is(previous, next)) return true;
      Reflect.set(object, property, next);
      notify(meta, object, property, next);
      if (Array.isArray(object) && property !== 'length') {
        notify(meta, object, 'length', object.length);
      }
      return true;
    },
    deleteProperty(object, property) {
      if (!Reflect.has(object, property)) return true;
      Reflect.deleteProperty(object, property);
      notify(meta, object, property, undefined);
      return true;
    },
    ownKeys(object) {
      nodeFor(meta, object, ITERATE).read();
      return Reflect.ownKeys(object);
    },
    getOwnPropertyDescriptor(object, property) {
      return Reflect.getOwnPropertyDescriptor(object, property);
    },
  });
  byMeta.set(meta, proxy);
  return proxy;
}

function updatePath(meta, path, value) {
  if (path.length === 0) {
    const next = typeof value === 'function' ? value(meta.root) : value;
    const shared = replaceEqualDeep(meta.root, next);
    for (const key of Reflect.ownKeys(meta.root)) {
      if (!Reflect.has(shared, key)) delete meta.proxy[key];
    }
    for (const key of Reflect.ownKeys(shared)) meta.proxy[key] = shared[key];
    return;
  }
  let target = meta.proxy;
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index];
    if (target[key] == null || typeof target[key] !== 'object') {
      target[key] = typeof path[index + 1] === 'number' ? [] : {};
    }
    target = target[key];
  }
  target[path.at(-1)] = value;
}

function createStoreRuntime(initialValue) {
  const root = deepClone(initialValue ?? {});
  const meta = { nodes: new WeakMap(), root, proxy: null };
  meta.proxy = wrap(root, meta);
  const setStore = (...args) => batch(() => {
    if (args.length === 1) {
      const update = args[0];
      if (typeof update === 'function') {
        updatePath(meta, [], update);
      } else {
        for (const [key, value] of Object.entries(update || {})) {
          updatePath(meta, [key], value);
        }
      }
      return;
    }
    updatePath(meta, args.slice(0, -1), args.at(-1));
  });
  return [meta.proxy, setStore];
}

export function createStore(initialValue) {
  if (!currentComponent) return createStoreRuntime(initialValue);
  let registry = storeRegistry.get(currentComponent);
  if (!registry) {
    registry = {
      index: 0,
      renderCount: currentComponent._renderCount,
      stores: [],
    };
    storeRegistry.set(currentComponent, registry);
  }
  if (registry.renderCount !== currentComponent._renderCount) {
    registry.index = 0;
    registry.renderCount = currentComponent._renderCount;
  }
  const index = registry.index++;
  if (!registry.stores[index]) {
    registry.stores[index] = createStoreRuntime(initialValue);
  }
  return registry.stores[index];
}

export function produce(mutator) {
  return (state) => {
    const draft = deepClone(state);
    mutator(draft);
    return draft;
  };
}

export function reconcile(value) {
  return (state) => replaceEqualDeep(state, value);
}
