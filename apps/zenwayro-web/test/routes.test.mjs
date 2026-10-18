import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  isPublicPathname,
  routeExploreWithCity,
  routePlanById,
} from '../src/routes.js';

test('public pathnames', () => {
  assert.equal(isPublicPathname('/'), true);
  assert.equal(isPublicPathname('/explore'), true);
  assert.equal(isPublicPathname('/plan/new'), true);
  assert.equal(isPublicPathname('/plan/abc'), true);
  assert.equal(isPublicPathname('/plan/shared/rome'), true);
  assert.equal(isPublicPathname('/popular-trips/browse'), true);
  assert.equal(isPublicPathname('/auth/signin'), true);
});

test('protected pathnames', () => {
  assert.equal(isPublicPathname('/trips'), false);
  assert.equal(isPublicPathname('/settings'), false);
  assert.equal(isPublicPathname('/admin/users'), false);
});

test('route helpers', () => {
  assert.equal(routePlanById('abc'), '/plan/abc');
  const explore = routeExploreWithCity('Rome', '1');
  assert.ok(explore.includes('Rome'));
  assert.ok(explore.includes('cityId'));
});
