import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM(
  '<!DOCTYPE html><html><body><div id="app"></div></body></html>'
);
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.HTMLElement = dom.window.HTMLElement;

const { createComponent } = await import('../core/component/component.js');
const { jsx } = await import('../core/jsx-compiler-new/jsx-runtime.js');
const { render } = await import('../core/render/render.js');
const {
  I18nProvider,
  createI18n,
  useI18n,
  useTranslation,
} = await import('../i18n/index.js');

assert.throws(
  () => useI18n(),
  /no I18nProvider found/,
  'useI18n requires a provider'
);
assert.throws(
  () => useTranslation('common'),
  /no I18nProvider found/,
  'useTranslation requires a provider'
);

const client = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  resources: {
    en: { common: { greeting: 'Hello {name}' } },
    uk: { common: { greeting: 'Привіт, {name}' } },
  },
});

const Greeting = createComponent(() => {
  const { t } = useTranslation('common');
  return jsx(
    'p',
    { 'data-testid': 'greeting' },
    () => t('greeting', { name: 'Grain' })
  );
});

const App = createComponent(() =>
  jsx(I18nProvider, {
    client,
    children: jsx(Greeting, {}),
  })
);

render(App, document.getElementById('app'));
const greeting = document.querySelector('[data-testid="greeting"]');
assert.equal(greeting.textContent, 'Hello Grain');

client.setLocale('uk');
assert.equal(greeting.textContent, 'Привіт, Grain');

console.log('i18n-provider tests passed');
