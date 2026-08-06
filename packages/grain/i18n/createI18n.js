import { createSignal } from '../signals/index.js';
import { translate } from './translate.js';

function unwrapDictionary(value) {
  const dictionary =
    value &&
    typeof value === 'object' &&
    'default' in value &&
    value.default &&
    typeof value.default === 'object'
      ? value.default
      : value;

  if (!dictionary || typeof dictionary !== 'object' || Array.isArray(dictionary)) {
    throw new TypeError('i18n namespace resources must resolve to an object.');
  }

  return dictionary;
}

export function createI18n(config = {}) {
  const resources = config.resources ?? {};
  const initialLocale =
    config.locale ?? config.fallbackLocale ?? Object.keys(resources)[0] ?? 'en';
  const fallbackLocale = config.fallbackLocale ?? initialLocale;
  const [locale, writeLocale] = createSignal(initialLocale);
  const [revision, writeRevision] = createSignal(0);
  const dictionaries = new Map();
  const pendingLoads = new Map();

  for (const [localeCode, namespaces] of Object.entries(resources)) {
    for (const [namespace, resource] of Object.entries(namespaces ?? {})) {
      if (typeof resource !== 'function') {
        dictionaries.set(
          `${localeCode}\0${namespace}`,
          unwrapDictionary(resource)
        );
      }
    }
  }

  function getResource(localeCode, namespace) {
    return dictionaries.get(`${localeCode}\0${namespace}`);
  }

  function loadNamespace(localeCode, namespace) {
    const cacheKey = `${localeCode}\0${namespace}`;
    const cached = dictionaries.get(cacheKey);
    if (cached) return Promise.resolve(cached);

    const pending = pendingLoads.get(cacheKey);
    if (pending) return pending;

    const resource = resources[localeCode]?.[namespace];
    if (resource === undefined) return Promise.resolve(undefined);

    const promise = Promise.resolve()
      .then(() => (typeof resource === 'function' ? resource() : resource))
      .then(unwrapDictionary)
      .then((dictionary) => {
        dictionaries.set(cacheKey, dictionary);
        pendingLoads.delete(cacheKey);
        writeRevision((revision) => revision + 1);
        return dictionary;
      })
      .catch((error) => {
        pendingLoads.delete(cacheKey);
        throw error;
      });

    pendingLoads.set(cacheKey, promise);
    return promise;
  }

  function ensureNamespace(localeCode, namespace) {
    if (
      !getResource(localeCode, namespace) &&
      resources[localeCode]?.[namespace] !== undefined
    ) {
      loadNamespace(localeCode, namespace).catch(() => {});
    }
  }

  function t(namespace, key, variables) {
    revision();
    const activeLocale = locale();
    ensureNamespace(activeLocale, namespace);

    const localized = translate(
      getResource(activeLocale, namespace),
      key,
      variables
    );
    if (localized !== undefined) return localized;

    if (fallbackLocale !== activeLocale) {
      ensureNamespace(fallbackLocale, namespace);
      const fallback = translate(
        getResource(fallbackLocale, namespace),
        key,
        variables
      );
      if (fallback !== undefined) return fallback;
    }

    return key;
  }

  function setLocale(nextLocale) {
    writeLocale(nextLocale);
    return nextLocale;
  }

  return {
    locale,
    setLocale,
    changeLanguage: setLocale,
    t,
    getResource,
    loadNamespace,
    dispose() {},
  };
}
