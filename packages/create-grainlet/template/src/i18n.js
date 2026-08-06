import { createI18n } from 'grainlet/i18n';
import enCommon from './locales/en/common.json';
import ukCommon from './locales/uk/common.json';

export const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  resources: {
    en: { common: enCommon },
    uk: { common: ukCommon },
  },
});
