export const THEME_STORAGE_KEY = 'zenwayro-theme';

export const THEME_OPTIONS = [
  { value: 'light', labelKey: 'theme.light', icon: '☀️' },
  { value: 'dark', labelKey: 'theme.dark', icon: '🌙' },
  { value: 'system', labelKey: 'theme.system', icon: '💻' },
];

const THEME_VALUES = new Set(THEME_OPTIONS.map((option) => option.value));

export function normalizeTheme(value) {
  return THEME_VALUES.has(value) ? value : 'light';
}

export function readStoredTheme(storage) {
  if (!storage || typeof storage.getItem !== 'function') return 'light';
  try {
    return normalizeTheme(storage.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'light';
  }
}

/** True when `documentElement` should carry the `dark` class. */
export function shouldUseDarkClass(theme, prefersDark) {
  const normalized = normalizeTheme(theme);
  if (normalized === 'dark') return true;
  if (normalized === 'system') return Boolean(prefersDark);
  return false;
}

export function applyDarkClass(root, theme, prefersDark) {
  if (!root || !root.classList) return false;
  const dark = shouldUseDarkClass(theme, prefersDark);
  root.classList.toggle('dark', dark);
  return dark;
}

export function themeButtonClass(active) {
  const base =
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer';
  if (active) return `${base} bg-indigo-600 text-white shadow-sm`;
  return `${base} text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700`;
}
