import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  PAGE_SIZE,
  coverPhotoSrc,
  filterTrips,
  formatDashboardTripDates,
  pageNumbers,
  prepareTripList,
  showAddTripCta,
  showPendingInvitations,
  sortTrips,
  toTripCard,
  tripDashboardStatus,
  tripListQueryKey,
  tripStatus,
  tripsEmptyState,
  tripsListParams,
  tripsListPath,
} from '../src/pages/trips/helpers.js';

const TODAY = '2026-07-03';

function trip(overrides) {
  return {
    id: 't-1',
    city: 'Paris',
    durationDays: 3,
    startDate: null,
    endDate: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

test('trip list request matches mine and shared endpoints', () => {
  assert.equal(tripsListPath('mine'), '/api/trips');
  assert.equal(tripsListPath('shared'), '/api/trips/shared-with-me');
  assert.deepEqual(tripsListParams(2, 'upcoming'), {
    page: '2',
    limit: String(PAGE_SIZE),
    status: 'upcoming',
  });
  assert.deepEqual(tripListQueryKey('shared', 3, 'past'), [
    '/api/trips/shared-with-me',
    'shared',
    3,
    'past',
  ]);
});

test('tripStatus classifies missing, future, ongoing, and past dates', () => {
  assert.equal(tripStatus(trip({}), TODAY), null);
  assert.equal(
    tripStatus(trip({ startDate: '2026-08-01', endDate: '2026-08-05' }), TODAY),
    'future'
  );
  assert.equal(
    tripStatus(trip({ startDate: '2026-06-01', endDate: '2026-06-05' }), TODAY),
    'past'
  );
  assert.equal(
    tripStatus(trip({ startDate: '2026-07-01', endDate: '2026-07-10' }), TODAY),
    'ongoing'
  );
});

test('filterTrips keeps dashboard statuses and sorts newest first', () => {
  const trips = [
    trip({ id: 'plan', createdAt: '2026-03-01T00:00:00.000Z' }),
    trip({
      id: 'future',
      startDate: '2026-08-01',
      endDate: '2026-08-05',
      createdAt: '2026-02-01T00:00:00.000Z',
    }),
    trip({
      id: 'ongoing',
      startDate: '2026-07-01',
      endDate: '2026-07-10',
      createdAt: '2026-05-01T00:00:00.000Z',
    }),
    trip({
      id: 'past',
      startDate: '2026-06-01',
      endDate: '2026-06-05',
      createdAt: '2026-04-01T00:00:00.000Z',
    }),
  ];

  assert.equal(tripDashboardStatus(trips[0], TODAY), 'planning');
  assert.equal(tripDashboardStatus(trips[3], TODAY), 'past');
  assert.equal(tripDashboardStatus(trips[1], TODAY), 'upcoming');
  assert.equal(tripDashboardStatus(trips[2], TODAY), 'upcoming');

  assert.deepEqual(
    filterTrips(trips, 'all', TODAY).map((item) => item.id),
    ['plan', 'future', 'ongoing', 'past']
  );
  assert.deepEqual(
    filterTrips(trips, 'planning', TODAY).map((item) => item.id),
    ['plan']
  );
  assert.deepEqual(
    filterTrips(trips, 'upcoming', TODAY).map((item) => item.id),
    ['future', 'ongoing']
  );
  assert.deepEqual(filterTrips(trips, 'past', TODAY).map((item) => item.id), ['past']);
  assert.equal(
    filterTrips([trip({ startDate: '2026-08-01', endDate: '2026-08-05' })], 'planning', TODAY)
      .length,
    0
  );

  assert.deepEqual(
    sortTrips(trips).map((item) => item.id),
    ['ongoing', 'past', 'plan', 'future']
  );
  assert.deepEqual(
    prepareTripList(
      [
        {
          id: 'older',
          city: 'rome',
          durationDays: 2,
          startDate: null,
          endDate: null,
          notes: null,
          coverPhoto: null,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'newer',
          city: 'lisbon',
          durationDays: 4,
          startDate: null,
          endDate: null,
          notes: '  ',
          coverPhoto: 'https://cdn.example/200w/photo.jpg',
          createdAt: '2026-06-01T00:00:00.000Z',
        },
      ],
      'planning',
      TODAY
    ).map((item) => item.id),
    ['newer', 'older']
  );
});

test('sortTrips keeps original order when timestamps tie or are missing', () => {
  const tied = [
    trip({ id: 'a', createdAt: '2026-01-01T00:00:00.000Z' }),
    trip({ id: 'b', createdAt: '2026-01-01T00:00:00.000Z' }),
    trip({ id: 'c', createdAt: null }),
  ];
  assert.deepEqual(
    sortTrips(tied).map((item) => item.id),
    ['a', 'b', 'c']
  );
});

test('tripsEmptyState and list actions follow scope, loading, and error', () => {
  assert.deepEqual(tripsEmptyState({ scope: 'mine', count: 0, isLoading: false, hasError: false }), {
    visible: true,
    titleKey: 'trips.noTripsTitle',
    subtitleKey: 'trips.noTripsSubtitle',
    showAction: true,
    actionKey: 'trips.emptyAction',
  });
  assert.deepEqual(
    tripsEmptyState({ scope: 'shared', count: 0, isLoading: false, hasError: false }),
    {
      visible: true,
      titleKey: 'trips.emptyShared',
      subtitleKey: null,
      showAction: false,
      actionKey: 'trips.emptyAction',
    }
  );
  assert.equal(
    tripsEmptyState({ scope: 'mine', count: 0, isLoading: true, hasError: false }).visible,
    false
  );
  assert.equal(
    tripsEmptyState({ scope: 'mine', count: 0, isLoading: false, hasError: true }).visible,
    false
  );
  assert.equal(
    tripsEmptyState({ scope: 'mine', count: 2, isLoading: false, hasError: false }).visible,
    false
  );
  assert.equal(
    showAddTripCta({ scope: 'mine', count: 1, isLoading: false, hasError: false }),
    true
  );
  assert.equal(
    showAddTripCta({ scope: 'shared', count: 1, isLoading: false, hasError: false }),
    false
  );
  assert.equal(
    showAddTripCta({ scope: 'mine', count: 0, isLoading: false, hasError: false }),
    false
  );
  assert.equal(
    showPendingInvitations({ scope: 'shared', count: 1, isLoading: false, hasError: false }),
    true
  );
  assert.equal(
    showPendingInvitations({ scope: 'mine', count: 1, isLoading: false, hasError: false }),
    false
  );
  assert.equal(
    showPendingInvitations({ scope: 'shared', count: 1, isLoading: true, hasError: false }),
    false
  );
});

test('pageNumbers inserts ellipsis and keeps the ends', () => {
  assert.deepEqual(pageNumbers(1, 5), [1, 2, 3, 4, 5]);
  assert.deepEqual(pageNumbers(5, 20), [1, 2, null, 4, 5, 6, null, 19, 20]);
  const pages = pageNumbers(10, 30);
  assert.equal(pages[0], 1);
  assert.equal(pages[pages.length - 1], 30);
});

test('formatDashboardTripDates matches the dashboard date copy', () => {
  assert.equal(formatDashboardTripDates(null, null), '');
  assert.equal(formatDashboardTripDates('2026-07-03', null), 'Jul 2026');
  assert.equal(formatDashboardTripDates('2026-07-03', '2026-07-10'), '3–10 Jul 2026');
  assert.equal(formatDashboardTripDates('2026-07-03', '2026-08-10'), '3 Jul – 10 Aug 2026');
  assert.equal(
    formatDashboardTripDates('2025-12-28', '2026-01-02'),
    '28 Dec 2025 – 2 Jan 2026'
  );
  assert.equal(formatDashboardTripDates('nope', null), 'nope');
  assert.equal(formatDashboardTripDates('nope', 'also'), 'nope — also');
});

test('toTripCard normalizes summary fields and cover width', () => {
  assert.deepEqual(
    toTripCard({
      id: 't-1',
      city: 'Paris',
      cityId: null,
      durationDays: 4,
      startDate: '2026-07-03T00:00:00.000Z',
      endDate: null,
      notes: null,
      coverPhoto: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      sharedBy: { name: 'Ada', email: 'ada@example.com' },
    }),
    {
      id: 't-1',
      city: 'Paris',
      durationDays: 4,
      startDate: '2026-07-03',
      endDate: null,
      notes: null,
      coverPhoto: null,
      sharedBy: { name: 'Ada', email: 'ada@example.com' },
      createdAt: '2026-01-01T00:00:00.000Z',
    }
  );
  assert.equal(coverPhotoSrc(null), null);
  assert.equal(
    coverPhotoSrc('https://cdn.example/200w/photo.jpg'),
    'https://cdn.example/480w/photo.jpg'
  );
});
