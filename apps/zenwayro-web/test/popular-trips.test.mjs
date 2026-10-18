import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CITY_HUB_PAGE_SIZE,
  POPULAR_TRIPS_DEFAULT_SORT,
  POPULAR_TRIPS_PAGE_SIZE,
  cityLabelFromSlug,
  communityQueryFilters,
  copyDatesAreValid,
  countryLabelFromSlug,
  formatPlanDuration,
  inclusiveTripDays,
  isLegacyShareSlugParam,
  isUuidParam,
  listPopularTripsParams,
  matchesPopularTripSearch,
  parsePopularTripSplat,
  popularTripHeroSrc,
  popularTripSegments,
  popularTripTitle,
  popularTripsPageNumbers,
  routePopularTrip,
  routePopularTripsCity,
  routePopularTripsCountry,
  sortForCommunityChip,
  sortedTripDays,
  uniqueCityLinks,
} from '../src/pages/popular/popular-routes.js';

const UUID = '550e8400-e29b-41d4-a716-446655440000';

test('uuid and legacy share slug detection', () => {
  assert.equal(isUuidParam(UUID), true);
  assert.equal(isUuidParam(UUID.toUpperCase()), true);
  assert.equal(isUuidParam('550e8400-e29b-61d4-a716-446655440000'), false);
  assert.equal(isUuidParam('not-a-uuid'), false);
  assert.equal(isUuidParam('abcdefabcdef'), false);
  assert.equal(isLegacyShareSlugParam('abcdefabcdef'), true);
  assert.equal(isLegacyShareSlugParam(UUID), false);
  assert.equal(isLegacyShareSlugParam('abc'), false);
});

test('splat resolves country, city, trip, uuid, and not-found', () => {
  assert.deepEqual(parsePopularTripSplat('italy'), {
    kind: 'country',
    countrySlug: 'italy',
    segments: ['italy'],
  });
  assert.equal(parsePopularTripSplat('abcdefabcdef').kind, 'country');
  assert.deepEqual(parsePopularTripSplat(UUID), {
    kind: 'uuid',
    id: UUID,
    segments: [UUID],
  });
  assert.deepEqual(parsePopularTripSplat('italy/rome'), {
    kind: 'city',
    countrySlug: 'italy',
    citySlug: 'rome',
    segments: ['italy', 'rome'],
  });
  assert.deepEqual(parsePopularTripSplat('italy/rome/top-highlights'), {
    kind: 'trip',
    countrySlug: 'italy',
    citySlug: 'rome',
    tripSlug: 'top-highlights',
    segments: ['italy', 'rome', 'top-highlights'],
  });
  assert.equal(parsePopularTripSplat('').kind, 'notFound');
  assert.equal(parsePopularTripSplat(null).kind, 'notFound');
  assert.equal(parsePopularTripSplat('a/b/c/d').kind, 'notFound');
  assert.deepEqual(popularTripSegments('/italy//rome/'), ['italy', 'rome']);
  assert.equal(parsePopularTripSplat('italy/new%20york').citySlug, 'new%20york');
});

test('route helpers prefer canonicalPath and build slug paths', () => {
  assert.equal(
    routePopularTrip({
      canonicalPath: '/popular-trips/italy/rome/top-highlights',
      countrySlug: 'xx',
      citySlug: 'yy',
      tripSlug: 'zz',
    }),
    '/popular-trips/italy/rome/top-highlights'
  );
  assert.equal(
    routePopularTrip({ countrySlug: 'italy', citySlug: 'rome', tripSlug: 'walk' }),
    '/popular-trips/italy/rome/walk'
  );
  assert.equal(routePopularTripsCountry('italy'), '/popular-trips/italy');
  assert.equal(routePopularTripsCity('italy', 'rome'), '/popular-trips/italy/rome');
  assert.equal(cityLabelFromSlug('new-york'), 'new york');
  assert.equal(popularTripTitle('rome'), 'Rome');
  assert.equal(countryLabelFromSlug('italy', []), 'italy');
  assert.equal(countryLabelFromSlug('italy', [{ city: 'rome' }]), 'Italy');
});

test('list query params, search, city links, and pagination', () => {
  assert.deepEqual(communityQueryFilters('duration', '4-5', 'top'), {
    minDurationDays: 4,
    maxDurationDays: 5,
  });
  assert.deepEqual(communityQueryFilters('duration', '2-weeks', 'top'), {
    minDurationDays: 8,
  });
  assert.deepEqual(communityQueryFilters('rating', 'all', '4.5'), { minRating: 4.5 });
  assert.deepEqual(communityQueryFilters('rating', 'all', 'new'), {});
  assert.equal(sortForCommunityChip('duration', 'top'), POPULAR_TRIPS_DEFAULT_SORT);
  assert.equal(sortForCommunityChip('rating', 'new'), 'newest');
  assert.equal(sortForCommunityChip('rating', '4.0'), 'rating');

  assert.deepEqual(
    listPopularTripsParams({
      sort: 'likes',
      page: 2,
      countrySlug: 'italy',
      citySlug: 'rome',
      ...communityQueryFilters('duration', '1-3', 'top'),
    }),
    {
      sort: 'likes',
      page: '2',
      limit: String(POPULAR_TRIPS_PAGE_SIZE),
      countrySlug: 'italy',
      citySlug: 'rome',
      minDurationDays: '1',
      maxDurationDays: '3',
    }
  );
  assert.equal(listPopularTripsParams({ limit: CITY_HUB_PAGE_SIZE }).limit, '50');

  assert.equal(matchesPopularTripSearch({ city: 'Rome', country: 'Italy' }, ' rom '), true);
  assert.equal(matchesPopularTripSearch({ city: 'Rome', country: 'Italy' }, 'spain'), false);
  assert.equal(matchesPopularTripSearch({ city: 'Rome', country: 'Italy' }, '  '), true);

  assert.deepEqual(
    uniqueCityLinks([
      { countrySlug: 'italy', citySlug: 'rome', city: 'rome' },
      { countrySlug: 'italy', citySlug: 'rome', city: 'rome' },
      { countrySlug: 'france', citySlug: 'paris', city: 'paris' },
      { city: 'orphan' },
    ]),
    [
      {
        key: 'italy/rome',
        city: 'rome',
        countrySlug: 'italy',
        citySlug: 'rome',
        href: '/popular-trips/italy/rome',
      },
      {
        key: 'france/paris',
        city: 'paris',
        countrySlug: 'france',
        citySlug: 'paris',
        href: '/popular-trips/france/paris',
      },
    ]
  );

  assert.deepEqual(
    popularTripsPageNumbers(1, 1).map((entry) => entry.page),
    []
  );
  assert.deepEqual(
    popularTripsPageNumbers(1, 3).map((entry) => entry.page),
    [1, 2, 3]
  );
  const window = popularTripsPageNumbers(5, 10);
  assert.equal(window.some((entry) => entry.gap), true);
  assert.deepEqual(
    window.filter((entry) => entry.page).map((entry) => entry.page),
    [1, 2, 4, 5, 6, 9, 10]
  );
});

test('detail day order, hero image, duration, and copy dates', () => {
  assert.deepEqual(
    sortedTripDays({
      days: [
        { dayNumber: 2, places: [] },
        { dayNumber: 1, places: [] },
      ],
    }).map((day) => day.dayNumber),
    [1, 2]
  );
  assert.deepEqual(sortedTripDays({}), []);
  assert.equal(
    popularTripHeroSrc('https://cdn.example/images/480w/rome.jpg'),
    'https://cdn.example/images/768w/rome.jpg'
  );
  assert.equal(popularTripHeroSrc('  '), '');
  assert.equal(formatPlanDuration(45), '45 min');
  assert.equal(formatPlanDuration(120), '2 hr');
  assert.equal(formatPlanDuration(90), '1 hr 30 min');
  assert.equal(inclusiveTripDays('2026-10-18', '2026-10-18'), 1);
  assert.equal(inclusiveTripDays('2026-10-18', '2026-10-31'), 14);
  assert.equal(inclusiveTripDays('2026-10-18', '2026-11-01'), 15);
  assert.equal(copyDatesAreValid('2026-10-18', '2026-10-20', 14, '2026-10-18'), true);
  assert.equal(copyDatesAreValid('2026-10-17', '2026-10-20', 14, '2026-10-18'), false);
  assert.equal(copyDatesAreValid('2026-10-18', '2026-11-01', 14, '2026-10-18'), false);
  assert.equal(copyDatesAreValid('2026-10-20', '2026-10-18', 14, '2026-10-18'), false);
});
