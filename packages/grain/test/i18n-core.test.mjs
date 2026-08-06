import assert from 'node:assert/strict';
import {
  createI18n,
  getTranslation,
  interpolate,
} from '../i18n/index.js';

assert.equal(
  getTranslation({ errors: { required: 'Required' } }, 'errors.required'),
  'Required'
);
assert.equal(getTranslation({ count: 3 }, 'count'), '3');
assert.equal(getTranslation({ errors: {} }, 'errors.missing'), undefined);
assert.equal(
  interpolate('Hello {name}, {missing}', { name: 'Grain' }),
  'Hello Grain, {missing}'
);

let lazyLoads = 0;
const i18n = createI18n({
  locale: 'uk',
  fallbackLocale: 'en',
  resources: {
    en: {
      common: {
        greeting: 'Hello {name}',
        fallbackOnly: 'English fallback',
        nested: { title: 'Nested title' },
      },
      account: () => {
        lazyLoads += 1;
        return Promise.resolve({
          default: { signIn: 'Sign in' },
        });
      },
    },
    uk: {
      common: {
        greeting: 'Привіт, {name}',
      },
    },
  },
});

assert.equal(i18n.locale(), 'uk');
assert.equal(i18n.t('common', 'greeting', { name: 'Майк' }), 'Привіт, Майк');
assert.equal(i18n.t('common', 'fallbackOnly'), 'English fallback');
assert.equal(i18n.t('common', 'nested.title'), 'Nested title');
assert.equal(i18n.t('common', 'missing'), 'missing');

i18n.changeLanguage('en');
assert.equal(i18n.locale(), 'en');
assert.equal(i18n.t('common', 'greeting', { name: 'Mike' }), 'Hello Mike');

assert.equal(i18n.t('account', 'signIn'), 'signIn');
const account = await i18n.loadNamespace('en', 'account');
assert.deepEqual(account, { signIn: 'Sign in' });
assert.equal(i18n.t('account', 'signIn'), 'Sign in');
await i18n.loadNamespace('en', 'account');
assert.equal(lazyLoads, 1, 'lazy namespace loader is cached');

assert.equal(await i18n.loadNamespace('en', 'missing'), undefined);

console.log('i18n-core tests passed');
