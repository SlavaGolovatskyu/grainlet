import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  canEditTrip,
  formatPlanDayHeading,
  getPlaceSummary,
  parseSharedPlanSlug,
  sharedRedirectPath,
  toTripPlan,
} from '../src/pages/plan/planModel.js';

test('formatPlanDayHeading builds weekday, month, and ordinal', () => {
  const start = '2026-03-01T12:00:00';
  assert.equal(formatPlanDayHeading(1, start), 'Sunday, March 1st');
  assert.equal(formatPlanDayHeading(2, start), 'Monday, March 2nd');
  assert.equal(formatPlanDayHeading(3, start), 'Tuesday, March 3rd');
  assert.equal(formatPlanDayHeading(4, start), 'Wednesday, March 4th');
  assert.equal(formatPlanDayHeading(11, start), 'Wednesday, March 11th');
  assert.equal(formatPlanDayHeading(21, start), 'Saturday, March 21st');
  assert.equal(formatPlanDayHeading(22, start), 'Sunday, March 22nd');
  assert.equal(formatPlanDayHeading(23, start), 'Monday, March 23rd');
  assert.equal(formatPlanDayHeading(31, start), 'Tuesday, March 31st');
  assert.equal(formatPlanDayHeading(1, start, true), 'Sun, March 1st');
});

test('formatPlanDayHeading is empty without a start date', () => {
  assert.equal(formatPlanDayHeading(1, undefined), '');
  assert.equal(formatPlanDayHeading(2, ''), '');
  assert.equal(formatPlanDayHeading(1, 'not-a-date'), '');
});

test('getPlaceSummary joins place names with a bullet', () => {
  assert.equal(getPlaceSummary([]), '');
  assert.equal(getPlaceSummary([{ name: 'Louvre' }]), 'Louvre');
  assert.equal(
    getPlaceSummary([{ name: 'Louvre' }, { name: 'Seine' }, { name: 'Orsay' }]),
    'Louvre \u2022 Seine \u2022 Orsay'
  );
  assert.equal(getPlaceSummary(null), '');
});

test('parseSharedPlanSlug reads canonical and legacy share paths', () => {
  assert.deepEqual(parseSharedPlanSlug('france/paris/weekend-in-paris'), {
    kind: 'canonical',
    key: 'weekend-in-paris',
    countrySlug: 'france',
    citySlug: 'paris',
    tripSlug: 'weekend-in-paris',
  });
  assert.equal(parseSharedPlanSlug('/france/paris/weekend-in-paris/').key, 'weekend-in-paris');
  assert.equal(parseSharedPlanSlug('france/paris/week%20end').tripSlug, 'week end');
  assert.deepEqual(parseSharedPlanSlug('abc123def456'), {
    kind: 'legacy',
    key: 'abc123def456',
  });
  assert.equal(parseSharedPlanSlug('ABC123DEF456').kind, 'legacy');
  assert.equal(parseSharedPlanSlug('not-a-legacy-slug'), null);
  assert.equal(parseSharedPlanSlug('france/paris'), null);
  assert.equal(parseSharedPlanSlug('a/b/c/d'), null);
  assert.equal(parseSharedPlanSlug(''), null);
  assert.equal(parseSharedPlanSlug(null), null);
  assert.equal(
    parseSharedPlanSlug('550e8400-e29b-41d4-a716-446655440000'),
    null
  );
  assert.equal(sharedRedirectPath('/plan/shared/france/paris/weekend'), '/plan/shared/france/paris/weekend');
  assert.equal(
    sharedRedirectPath('https://zenwayro.com/plan/shared/france/paris/weekend'),
    '/plan/shared/france/paris/weekend'
  );
  assert.equal(sharedRedirectPath(''), '');
});

test('toTripPlan maps wire dayNumber onto itinerary days', () => {
  const plan = toTripPlan({
    id: 'trip-1',
    city: 'Paris',
    cityId: 'city-1',
    durationDays: 2,
    startDate: '2026-06-01',
    isPublic: true,
    canEdit: true,
    days: [
      {
        dayNumber: 2,
        places: [{ id: 'b', name: 'Orsay', lat: 1, lng: 2 }],
        routeCosting: 'auto',
        routeOptimizeOrder: true,
      },
      {
        dayNumber: 1,
        places: [{ id: 'a', name: 'Louvre', lat: 3, lng: 4 }],
        routeCosting: 'bicycle',
      },
    ],
  });
  assert.equal(plan.cityId, 'city-1');
  assert.equal(plan.canEdit, true);
  assert.deepEqual(
    plan.days.map((day) => day.day),
    [1, 2]
  );
  assert.equal(plan.days[0].places[0].name, 'Louvre');
  assert.equal(plan.days[0].routeCosting, undefined);
  assert.equal(plan.days[1].routeCosting, 'auto');
  assert.equal(plan.days[1].routeOptimizeOrder, true);
  assert.equal(toTripPlan(null), null);
  assert.equal(toTripPlan({ id: 'x', canEdit: 'yes', days: [{ day: 1 }] }).days.length, 0);
});

test('canEditTrip requires the owner flag and an authenticated session', () => {
  assert.equal(canEditTrip({ canEdit: true }, 'authenticated'), true);
  assert.equal(canEditTrip({ canEdit: true }, 'unauthenticated'), false);
  assert.equal(canEditTrip({ canEdit: true }, 'loading'), false);
  assert.equal(canEditTrip({ canEdit: false }, 'authenticated'), false);
  assert.equal(canEditTrip(null, 'authenticated'), false);
});
