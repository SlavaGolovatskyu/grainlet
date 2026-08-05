const DEFAULT_STORAGE_KEY = 'grainlet.auth.session';

function clone(value) {
  if (value == null) return null;
  return JSON.parse(JSON.stringify(value));
}

export function createMemoryStorage(initialSession = null) {
  let session = clone(initialSession);

  return {
    getSession() {
      return clone(session);
    },
    setSession(nextSession) {
      session = clone(nextSession);
    },
    clearSession() {
      session = null;
    },
  };
}

export function createLocalStorageAdapter(options = {}) {
  const key = options.key ?? DEFAULT_STORAGE_KEY;
  const getStorage =
    options.getStorage ??
    (() => (typeof window === 'undefined' ? null : window.localStorage));

  return {
    getSession() {
      const storage = getStorage();
      if (!storage) return null;
      const stored = storage.getItem(key);
      if (!stored) return null;

      try {
        return JSON.parse(stored);
      } catch {
        storage.removeItem(key);
        return null;
      }
    },
    setSession(session) {
      const storage = getStorage();
      if (storage) storage.setItem(key, JSON.stringify(session));
    },
    clearSession() {
      const storage = getStorage();
      if (storage) storage.removeItem(key);
    },
  };
}
