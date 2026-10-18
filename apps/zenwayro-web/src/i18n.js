import { createI18n } from 'grainlet/i18n';
import en from './locales/en.json' with { type: 'json' };

const BRACE = /\{\{\s*([\w.]+)\s*\}\}/g;

export function normalizeMessageBraces(value) {
  if (typeof value === 'string') {
    return value.replace(BRACE, '{$1}');
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeMessageBraces(item));
  }
  if (value && typeof value === 'object') {
    const copy = {};
    for (const key of Object.keys(value)) {
      copy[key] = normalizeMessageBraces(value[key]);
    }
    return copy;
  }
  return value;
}

export function translateApp(i18n, key, variables) {
  if (typeof key !== 'string') return key;
  const dot = key.indexOf('.');
  if (dot <= 0 || dot === key.length - 1) return key;
  const namespace = key.slice(0, dot);
  const rest = key.slice(dot + 1);
  if (!namespace || !rest) return key;
  return i18n.t(namespace, rest, variables);
}

function readLocale() {
  if (typeof window === 'undefined') return 'en';
  try {
    return window.localStorage.getItem('zenwayro-locale') || 'en';
  } catch {
    return 'en';
  }
}

export const i18n = createI18n({
  locale: readLocale(),
  fallbackLocale: 'en',
  resources: {
    en: normalizeMessageBraces(en),
  },
});
