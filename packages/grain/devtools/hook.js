const HOOK_KEY = '__GRAINLET_DEVTOOLS_HOOK__';

export function installDevtoolsHook(target = globalThis) {
  if (target[HOOK_KEY]) return target[HOOK_KEY];
  let nextId = 1;
  const ids = new WeakMap();
  const records = new Map();
  const listeners = new Set();
  const identify = (value, prefix) => {
    if (!value || (typeof value !== 'object' && typeof value !== 'function')) {
      return `${prefix}:unknown`;
    }
    if (!ids.has(value)) ids.set(value, `${prefix}:${nextId++}`);
    return ids.get(value);
  };
  const hook = {
    emit(type, payload = {}) {
      const subject = payload.signal || payload.effect || payload.owner;
      const prefix = type.split(':')[0];
      const id = identify(subject, prefix);
      const previous = records.get(id) || { id, type: prefix };
      const record = {
        ...previous,
        ...payload,
        id,
        lastEvent: type,
        timestamp: Date.now(),
      };
      delete record.signal;
      delete record.effect;
      delete record.owner;
      records.set(id, record);
      for (const listener of listeners) listener(type, record);
    },
    getSnapshot() {
      return [...records.values()];
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  Object.defineProperty(target, HOOK_KEY, {
    configurable: true,
    value: hook,
  });
  return hook;
}

export function emitDevtools(type, payload) {
  globalThis[HOOK_KEY]?.emit(type, payload);
}

export function getDevtoolsHook() {
  return globalThis[HOOK_KEY] ?? null;
}
