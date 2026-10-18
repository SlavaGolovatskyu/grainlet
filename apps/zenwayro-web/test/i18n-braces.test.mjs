import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createI18n } from 'grainlet/i18n';
import { normalizeMessageBraces, translateApp } from '../src/i18n.js';

test('rewrites double braces to single braces', () => {
  assert.equal(normalizeMessageBraces('Hello {{name}}'), 'Hello {name}');
});

test('copies nested objects without mutating the input', () => {
  const input = { nav: { planTrip: 'Hello {{name}}' } };
  const output = normalizeMessageBraces(input);
  assert.equal(output.nav.planTrip, 'Hello {name}');
  assert.equal(input.nav.planTrip, 'Hello {{name}}');
  assert.notEqual(output, input);
  assert.notEqual(output.nav, input.nav);
});

test('translateApp splits on the first dot', () => {
  const i18n = createI18n({
    locale: 'en',
    fallbackLocale: 'en',
    resources: { en: { nav: { planTrip: 'Plan' } } },
  });
  assert.equal(translateApp(i18n, 'nav.planTrip'), 'Plan');
});
