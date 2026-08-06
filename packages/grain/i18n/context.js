import { createContext, useContext } from '../index.js';

export const I18nContext = createContext(null);

export function useI18n() {
  const i18n = useContext(I18nContext);
  if (!i18n) {
    throw new Error(
      'useI18n: no I18nProvider found. Wrap your tree in <I18nProvider>.'
    );
  }
  return i18n;
}

export function useTranslation(namespace) {
  if (!namespace || typeof namespace !== 'string') {
    throw new TypeError('useTranslation requires a namespace.');
  }

  const i18n = useI18n();
  return {
    t: (key, variables) => i18n.t(namespace, key, variables),
    locale: i18n.locale,
    setLocale: i18n.setLocale,
    changeLanguage: i18n.changeLanguage,
    i18n,
  };
}
