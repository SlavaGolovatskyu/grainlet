import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { authenticatedFetch, isAuthEndpoint } from '../src/api/authenticatedFetch.js';
import { AUTH_PATHS } from '../src/api/paths/auth.js';
import { TRIP_PATHS } from '../src/api/paths/trip.js';
import { shouldRetryFailedQuery } from '../src/api/queryRetry.js';
import { registerAuthSessionHandlers } from '../src/api/sessionBridge.js';

const originalFetch = globalThis.fetch;
let unregister = () => {};

afterEach(() => {
  unregister();
  unregister = () => {};
  globalThis.fetch = originalFetch;
  delete globalThis.window;
});

test('path helpers encode segments and keep auth login', () => {
  assert.equal(AUTH_PATHS.login, '/api/auth/login');
  assert.equal(TRIP_PATHS.byId('a/b'), '/api/trips/a%2Fb');
});

test('isAuthEndpoint skips bearer auth routes and still covers logout', () => {
  assert.equal(isAuthEndpoint('/api/auth/login'), true);
  assert.equal(isAuthEndpoint('/api/trips'), false);
  assert.equal(isAuthEndpoint('/api/auth/logout'), false);
});

test('shouldRetryFailedQuery skips 401 and retries other errors once', () => {
  assert.equal(shouldRetryFailedQuery(0, { status: 401 }), false);
  assert.equal(shouldRetryFailedQuery(0, new Error('x')), true);
  assert.equal(shouldRetryFailedQuery(1, new Error('x')), false);
});

test('authenticatedFetch sends the cached bearer on API routes', async () => {
  unregister = registerAuthSessionHandlers({
    getAccessToken: () => 'tok',
    refresh: async () => null,
    signOut: async () => {},
  });

  let authorization;
  globalThis.fetch = async (_input, init) => {
    authorization = new Headers(init.headers).get('Authorization');
    return new Response(null, { status: 200 });
  };

  await authenticatedFetch('http://example.test/api/trips');
  assert.equal(authorization, 'Bearer tok');
});

test('authenticatedFetch does not send Authorization to login', async () => {
  unregister = registerAuthSessionHandlers({
    getAccessToken: () => 'tok',
    refresh: async () => null,
    signOut: async () => {},
  });

  let authorization = 'unset';
  globalThis.fetch = async (_input, init) => {
    authorization = new Headers(init.headers).get('Authorization');
    return new Response(null, { status: 200 });
  };

  await authenticatedFetch('http://example.test/api/auth/login', { method: 'POST' });
  assert.equal(authorization, null);
});

test('authenticatedFetch refreshes once and signs out on a second 401', async () => {
  globalThis.window = {};
  let token = 'tok';
  let refreshCalls = 0;
  let signOutCalls = 0;

  unregister = registerAuthSessionHandlers({
    getAccessToken: () => token,
    refresh: async () => {
      refreshCalls += 1;
      token = 'tok-2';
      return { accessToken: token };
    },
    signOut: async () => {
      signOutCalls += 1;
      token = null;
    },
  });

  const authorizations = [];
  globalThis.fetch = async (_input, init) => {
    authorizations.push(new Headers(init.headers).get('Authorization'));
    return new Response(null, { status: 401 });
  };

  const response = await authenticatedFetch('http://example.test/api/trips');
  assert.equal(response.status, 401);
  assert.deepEqual(authorizations, ['Bearer tok', 'Bearer tok-2']);
  assert.equal(refreshCalls, 1);
  assert.equal(signOutCalls, 1);
});
