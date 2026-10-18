import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  HOME_HERO_IMAGE,
  HOME_LANDING_FEATURES,
  HOME_PLAN_STYLE_TAG_KEYS,
  HOME_QUIZ_STYLE_TAG_KEYS,
  HOME_SOCIAL_STATS,
  buildHomePopularTripCard,
  cityTitle,
  homeFeatureIconName,
  homeMessageKeys,
  homePlanCard,
  homePopularTripsPhase,
  homePopularTripsQueryKey,
  homePopularTripsQueryParams,
  homePopularTripsQueryPath,
  homePrimaryCta,
  isHomeSessionAuthenticated,
  readPopularTripItems,
  routePopularTrip,
} from '../src/pages/home/homeContent.js';

const en = JSON.parse(
  readFileSync(new URL('../src/locales/en.json', import.meta.url), 'utf8')
);

function messageAt(key) {
  const dot = key.indexOf('.');
  const namespace = key.slice(0, dot);
  const rest = key.slice(dot + 1).split('.');
  let node = en[namespace];
  for (const part of rest) node = node?.[part];
  return node;
}

test('guest and authenticated primary CTAs use confirmed en.json keys', () => {
  const guest = homePrimaryCta(false);
  const member = homePrimaryCta(true);

  assert.equal(guest.href, '/quiz');
  assert.equal(guest.labelKey, 'common.takeTheQuiz');
  assert.equal(messageAt(guest.labelKey), 'Take the Quiz');

  assert.equal(member.href, '/plan/new');
  assert.equal(member.labelKey, 'nav.planTrip');
  assert.equal(messageAt(member.labelKey), 'Plan a Trip');
});

test('session status and user data decide the plan CTA', () => {
  assert.equal(isHomeSessionAuthenticated('authenticated', null), true);
  assert.equal(isHomeSessionAuthenticated('loading', { user: { id: 'u1' } }), true);
  assert.equal(isHomeSessionAuthenticated('unauthenticated', { user: { id: 'u1' } }), true);
  assert.equal(isHomeSessionAuthenticated('loading', null), false);
  assert.equal(isHomeSessionAuthenticated('unauthenticated', null), false);
  assert.equal(isHomeSessionAuthenticated('unauthenticated', {}), false);
  assert.equal(isHomeSessionAuthenticated('unauthenticated', { user: null }), false);
});

test('plan card copy switches with the same auth flag as the CTA', () => {
  const guest = homePlanCard(false);
  const member = homePlanCard(true);
  assert.equal(guest.titleKey, 'home.quizCardTitle');
  assert.equal(guest.subtitleKey, 'home.quizCardSubtitle');
  assert.deepEqual(guest.tagKeys, HOME_QUIZ_STYLE_TAG_KEYS);
  assert.equal(member.titleKey, 'home.planCardTitle');
  assert.equal(member.subtitleKey, 'home.planCardSubtitle');
  assert.deepEqual(member.tagKeys, HOME_PLAN_STYLE_TAG_KEYS);
});

test('popular trips preview query matches sort=likes, page=1, limit=10', () => {
  assert.deepEqual(homePopularTripsQueryParams(), {
    sort: 'likes',
    page: '1',
    limit: '10',
  });
  assert.equal(
    homePopularTripsQueryPath(),
    '/api/popular-trips?sort=likes&page=1&limit=10'
  );
  assert.deepEqual(homePopularTripsQueryKey(), [
    'popular-trips',
    '/api/popular-trips',
    'likes',
    '1',
    '10',
  ]);
});

test('trip cards prefer canonicalPath and otherwise use the slug path', () => {
  assert.equal(
    routePopularTrip({
      canonicalPath: '/popular-trips/france/paris/weekend-walk',
      countrySlug: 'france',
      citySlug: 'paris',
      tripSlug: 'other',
    }),
    '/popular-trips/france/paris/weekend-walk'
  );
  assert.equal(
    routePopularTrip({
      countrySlug: 'italy',
      citySlug: 'rome',
      tripSlug: 'centro',
    }),
    '/popular-trips/italy/rome/centro'
  );
  assert.equal(routePopularTrip(null), '/popular-trips');
});

test('trip cards title, image, and day label follow the source card builder', () => {
  const card = buildHomePopularTripCard({
    id: 'trip-1',
    city: 'paris',
    countrySlug: 'france',
    citySlug: 'paris',
    tripSlug: 'weekend',
    durationDays: 3,
    cityImageCdnUrl: ' https://cdn.example/paris.jpg ',
  });
  assert.equal(card.id, 'trip-1');
  assert.equal(card.title, 'Paris');
  assert.equal(card.href, '/popular-trips/france/paris/weekend');
  assert.equal(card.heroUrl, 'https://cdn.example/paris.jpg');
  assert.deepEqual(card.days, {
    key: 'popularTrips.daysTag',
    variables: { count: '3' },
  });

  const oneDay = buildHomePopularTripCard({
    id: 'trip-2',
    city: 'Lyon',
    durationDays: 1,
    cityImageCdnUrl: '   ',
  });
  assert.equal(oneDay.title, 'Lyon');
  assert.equal(oneDay.heroUrl, undefined);
  assert.deepEqual(oneDay.days, { key: 'popularTrips.daysSingular' });
  assert.equal(cityTitle(''), '');
});

test('popular trip preview shows loading, error, empty, and ready', () => {
  assert.equal(
    homePopularTripsPhase({ isPending: true, isError: false, itemCount: 0 }),
    'loading'
  );
  assert.equal(
    homePopularTripsPhase({ isPending: false, isError: true, itemCount: 0 }),
    'error'
  );
  assert.equal(
    homePopularTripsPhase({ isPending: false, isError: false, itemCount: 0 }),
    'empty'
  );
  assert.equal(
    homePopularTripsPhase({ isPending: false, isError: false, itemCount: 2 }),
    'ready'
  );
  assert.equal(
    homePopularTripsPhase({ isPending: true, isError: false, itemCount: 2 }),
    'ready'
  );
});

test('list payload reader returns items only', () => {
  assert.deepEqual(readPopularTripItems(null), []);
  assert.deepEqual(readPopularTripItems({}), []);
  assert.deepEqual(readPopularTripItems({ items: null }), []);
  assert.deepEqual(readPopularTripItems({ items: [{ id: 'a' }] }), [{ id: 'a' }]);
});

test('home copy keys exist in en.json', () => {
  assert.equal(HOME_HERO_IMAGE, '/images/home_bg.webp');
  assert.equal(messageAt('hero.title'), 'Your personal travel guide for Europe');
  assert.equal(HOME_LANDING_FEATURES.length, 3);
  assert.deepEqual(
    HOME_LANDING_FEATURES.map((feature) => homeFeatureIconName(feature.iconKey)),
    ['map', 'star', 'share']
  );
  assert.deepEqual(
    HOME_SOCIAL_STATS.map((stat) => stat.value),
    ['50K+', '200+', '4.9★']
  );
  for (const key of homeMessageKeys()) {
    const value = messageAt(key);
    assert.equal(typeof value, 'string', key);
    assert.ok(value.length > 0, key);
  }
  assert.match(messageAt('popularTrips.daysTag'), /\{+\s*count\s*\}+/);
});
