export const THEME_STORAGE_KEY = 'zenwayro-theme';

export const THEME_OPTIONS = [
  { value: 'light', labelKey: 'theme.light', icon: '☀️' },
  { value: 'dark', labelKey: 'theme.dark', icon: '🌙' },
  { value: 'system', labelKey: 'theme.system', icon: '💻' },
];

export const THEME_SWITCHER_CLASS =
  'flex gap-1 bg-gray-200 dark:bg-gray-800/90 p-1 rounded-lg shadow-md max-w-max mx-auto';

export function isThemeValue(value) {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function readStoredTheme(storage) {
  if (!storage || typeof storage.getItem !== 'function') return 'light';
  try {
    const stored = storage.getItem(THEME_STORAGE_KEY);
    return isThemeValue(stored) ? stored : 'light';
  } catch {
    return 'light';
  }
}

export function resolveAppliedTheme(theme, prefersDark) {
  if (theme === 'dark') return 'dark';
  if (theme === 'system') return prefersDark ? 'dark' : 'light';
  return 'light';
}

export function applyDocumentTheme(root, resolved) {
  if (!root?.classList) return;
  if (resolved === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

export function themeOptionClass(active) {
  const base =
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer';
  if (active) return `${base} bg-indigo-600 text-white shadow-sm`;
  return `${base} text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700`;
}
