import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  CONTACT_FAQ_ITEMS,
  CONTACT_PRIMARY_EMAIL,
  CONTACT_QUICK_INFO_ITEMS,
  CONTACT_SECONDARY_EMAIL,
  CONTACT_SOCIAL_PLATFORM_IDS,
  SOCIAL_LINKS,
  contactMailtoLinks,
  linksForPlatforms,
} from '../src/pages/legal/contactContent.js';
import { COOKIES_SECTIONS } from '../src/pages/legal/cookiesContent.js';
import { PRIVACY_SECTIONS } from '../src/pages/legal/privacyContent.js';
import { TERMS_INTRO_PARAGRAPHS, TERMS_SECTIONS } from '../src/pages/legal/termsContent.js';
import {
  COOKIES_POLICY_URL,
  LEGAL_LAST_UPDATED,
  PRIVACY_POLICY_URL,
  mailtoHref,
  numberedTocItems,
  sectionHref,
  splitTextByLinks,
  titledTocItems,
} from '../src/pages/legal/legalShared.js';

const en = JSON.parse(
  readFileSync(new URL('../src/locales/en.json', import.meta.url), 'utf8')
);

function message(key) {
  const [namespace, ...rest] = key.split('.');
  let value = en[namespace];
  for (const part of rest) value = value?.[part];
  return value;
}

test('section anchors keep the page path and hash', () => {
  assert.equal(sectionHref('/terms', 'section-1'), '/terms#section-1');
  assert.equal(sectionHref('/privacy', 'section-18'), '/privacy#section-18');
  assert.equal(sectionHref('/cookies', 'what-are-cookies'), '/cookies#what-are-cookies');
});

test('in-app policy URLs split into cross-links', () => {
  const privacy = splitTextByLinks(
    `Please review our Privacy Policy: ${PRIVACY_POLICY_URL}.`
  );
  assert.deepEqual(
    privacy.map((part) => part.type),
    ['text', 'link', 'text']
  );
  assert.equal(privacy[1].href, '/privacy');
  assert.equal(privacy[1].text, 'https://zenwayro.com/privacy');

  const cookies = splitTextByLinks(`Cookie Policy: ${COOKIES_POLICY_URL}.`);
  assert.equal(cookies[1].href, '/cookies');
  assert.equal(cookies[1].text, COOKIES_POLICY_URL);

  assert.deepEqual(splitTextByLinks('No links here.'), [
    { type: 'text', text: 'No links here.' },
  ]);
});

test('terms table of contents matches every section', () => {
  const items = numberedTocItems(TERMS_SECTIONS);
  assert.equal(items.length, 25);
  assert.equal(items[0].title, 'OUR SERVICES');
  assert.equal(items[24].id, 'section-25');
  assert.equal(items[24].title, 'CONTACT US');
  assert.equal(LEGAL_LAST_UPDATED, 'April 08, 2026');
  assert.equal(TERMS_INTRO_PARAGRAPHS.length, 8);
  for (const item of items) {
    assert.equal(sectionHref('/terms', item.id), `/terms#${item.id}`);
    assert.ok(TERMS_SECTIONS.some((section) => section.id === item.id));
  }
  const prohibited = TERMS_SECTIONS.find((section) => section.id === 'section-6');
  const list = prohibited.blocks.find((block) => block.type === 'list');
  assert.equal(list.items.length, 24);
  const privacySection = TERMS_SECTIONS.find((section) => section.id === 'section-11');
  assert.match(privacySection.blocks[0].text, /https:\/\/zenwayro\.com\/privacy/);
});

test('privacy and cookie sections keep tables and anchors', () => {
  const privacyToc = numberedTocItems(PRIVACY_SECTIONS);
  assert.equal(privacyToc.length, 19);
  assert.equal(privacyToc[0].title, 'WHAT INFORMATION DO WE COLLECT?');
  assert.equal(privacyToc[17].title, 'HOW CAN YOU CONTACT US ABOUT THIS NOTICE?');
  const categories = PRIVACY_SECTIONS.find((section) => section.id === 'section-11');
  const table = categories.blocks.find((block) => block.type === 'table');
  assert.deepEqual(table.headers, ['Category', 'Examples', 'Collected']);
  assert.equal(table.rows.length, 12);
  const cookieMention = PRIVACY_SECTIONS.find((section) => section.id === 'section-5');
  assert.match(cookieMention.blocks.at(-1).text, /https:\/\/zenwayro\.com\/cookies/);

  const cookieToc = titledTocItems(COOKIES_SECTIONS);
  assert.deepEqual(
    cookieToc.map((item) => item.id),
    [
      'what-are-cookies',
      'why-we-use',
      'how-to-control',
      'browser-controls',
      'other-tracking',
      'flash-cookies',
      'targeted-advertising',
      'updates',
      'contact',
    ]
  );
  const inventory = COOKIES_SECTIONS.find((section) => section.id === 'how-to-control');
  const cookieTable = inventory.blocks.find((block) => block.type === 'table');
  assert.deepEqual(cookieTable.headers, ['Name', 'Provider', 'Purpose', 'Type', 'Duration']);
  assert.equal(cookieTable.rows[0][0], 'next-auth.session-token (or equivalent)');
});

test('contact helpers preserve mailto, social order, and FAQ copy', () => {
  assert.equal(mailtoHref(CONTACT_PRIMARY_EMAIL), 'mailto:zenwayro@gmail.com');
  assert.deepEqual(contactMailtoLinks(CONTACT_PRIMARY_EMAIL, CONTACT_SECONDARY_EMAIL), [
    { email: 'zenwayro@gmail.com', href: 'mailto:zenwayro@gmail.com' },
    {
      email: 'slavik.golovatskyu@gmail.com',
      href: 'mailto:slavik.golovatskyu@gmail.com',
    },
  ]);

  const social = linksForPlatforms(SOCIAL_LINKS, CONTACT_SOCIAL_PLATFORM_IDS);
  assert.deepEqual(
    social.map((link) => link.id),
    ['tiktok', 'instagram']
  );
  assert.equal(social[0].href, 'https://www.tiktok.com/@zenwayro');
  assert.equal(social[1].href, 'https://www.instagram.com/zenwayro');

  assert.deepEqual(
    CONTACT_QUICK_INFO_ITEMS.map((item) => item.labelKey),
    ['contact.quickInfoResponse', 'contact.quickInfoLocation', 'contact.quickInfoLanguages']
  );
  assert.equal(CONTACT_FAQ_ITEMS.length, 4);
  for (const item of [...CONTACT_FAQ_ITEMS, ...CONTACT_QUICK_INFO_ITEMS]) {
    const keys = item.questionKey ? [item.questionKey, item.answerKey] : [item.labelKey];
    for (const key of keys) {
      const value = message(key);
      assert.equal(typeof value, 'string');
      assert.ok(value.length > 0);
    }
  }
  assert.match(message('contact.faqRefundsAnswer'), /non-refundable/i);
  assert.equal(message('contact.faqTitle'), 'Common Questions');
  assert.equal(message('common.getStartedFree'), 'Get Started Free');
  assert.equal(message('footer.tiktok'), 'TikTok');
  assert.equal(message('footer.instagram'), 'Instagram');
});
