import assert from 'node:assert/strict';
import {
  AuthSdkError,
  createAuthSdk,
} from '../auth-sdk/index.js';

const requests = [];
const sdk = createAuthSdk({
  baseUrl: '/custom/auth/',
  endpoints: { google: '/oauth/google', refresh: '/token/refresh' },
  credentials: 'include',
  headers: { 'X-App': 'grainlet' },
  fetch: async (url, options) => {
    requests.push({ url, options });
    return {
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          user: { id: 'user-1', email: 'user@example.com' },
          accessToken: 'access',
        }),
    };
  },
});

const session = await sdk.exchange('google', { idToken: 'google-token' });
assert.equal(session.user.id, 'user-1');
assert.equal(requests[0].url, '/custom/auth/oauth/google');
assert.equal(requests[0].options.credentials, 'include');
assert.equal(requests[0].options.headers['X-App'], 'grainlet');
assert.deepEqual(JSON.parse(requests[0].options.body), {
  idToken: 'google-token',
});

await sdk.refresh({ userId: 'user-1', refreshToken: 'refresh' });
assert.equal(requests[1].url, '/custom/auth/token/refresh');
assert.deepEqual(JSON.parse(requests[1].options.body), {
  userId: 'user-1',
  refreshToken: 'refresh',
});

const authCalls = [];
const auth = {
  signIn(provider, input) {
    authCalls.push({ provider, input });
    return Promise.resolve(session);
  },
};
await sdk.signInGoogle(auth, { loginHint: 'user@example.com' });
await sdk.signInApple(auth);
await sdk.signInGitHub(auth, { login: 'grainlet' });
assert.deepEqual(
  authCalls.map(({ provider }) => provider),
  ['google', 'apple', 'github']
);

const failingSdk = createAuthSdk({
  fetch: async () => ({
    ok: false,
    status: 401,
    text: async () =>
      JSON.stringify({ code: 'InvalidToken', message: 'Token rejected' }),
  }),
});
await assert.rejects(
  () => failingSdk.exchange('apple', { idToken: 'bad' }),
  (error) =>
    error instanceof AuthSdkError &&
    error.code === 'InvalidToken' &&
    error.status === 401 &&
    error.message === 'Token rejected'
);

const offlineSdk = createAuthSdk({
  fetch: async () => {
    throw new Error('offline');
  },
});
await assert.rejects(
  () => offlineSdk.exchange('github', { code: 'code' }),
  (error) => error instanceof AuthSdkError && error.code === 'NetworkError'
);

console.log('auth-sdk-core tests passed');
