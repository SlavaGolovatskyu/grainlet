import assert from 'node:assert/strict';
import {
  AuthError,
  Credentials,
  Google,
  createAuth,
  createLocalStorageAdapter,
  createMemoryStorage,
  decodeJwtPayload,
} from '../auth/index.js';

function token(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `header.${encoded}.signature`;
}

const now = 1_800_000_000_000;
const initialAccessToken = token({ exp: now / 1000 + 120 });
const refreshedAccessToken = token({ exp: now / 1000 + 300 });
let refreshCalls = 0;

const storage = createMemoryStorage();
const credentials = Credentials({
  credentials: {
    email: { type: 'email' },
    password: { type: 'password' },
  },
  async authorize(input) {
    assert.equal(input.email, 'user@example.com');
    return {
      userId: 'user-1',
      email: input.email,
      accessToken: initialAccessToken,
      refreshToken: 'refresh-1',
    };
  },
});

const auth = createAuth({
  providers: [credentials],
  storage,
  now: () => now,
  autoRefresh: false,
  async refresh({ userId, refreshToken }) {
    refreshCalls += 1;
    assert.equal(userId, 'user-1');
    assert.equal(refreshToken, 'refresh-1');
    await new Promise((resolve) => setTimeout(resolve, 10));
    return {
      accessToken: refreshedAccessToken,
      refreshToken: 'refresh-2',
    };
  },
});

assert.equal(await auth.initialize(), null);
assert.equal(auth.status(), 'unauthenticated');

const signedIn = await auth.signIn('credentials', {
  email: 'user@example.com',
  password: 'secret',
});
assert.equal(signedIn.user.id, 'user-1');
assert.equal(signedIn.provider, 'credentials');
assert.equal(auth.status(), 'authenticated');
assert.equal(decodeJwtPayload(initialAccessToken).exp, now / 1000 + 120);

const [refreshedA, refreshedB] = await Promise.all([
  auth.refresh({ force: true }),
  auth.refresh({ force: true }),
]);
assert.equal(refreshCalls, 1, 'concurrent refreshes are deduplicated');
assert.equal(refreshedA.accessToken, refreshedAccessToken);
assert.equal(refreshedB.refreshToken, 'refresh-2');
assert.equal(refreshedA.expiresAt, now + 240_000);

const hydrated = createAuth({
  storage,
  now: () => now,
  autoRefresh: false,
});
await hydrated.initialize();
assert.equal(hydrated.data().user.email, 'user@example.com');

await auth.signOut();
assert.equal(auth.data(), null);
assert.equal(await storage.getSession(), null);

let googleInput;
const google = Google({
  getIdToken: async () => 'google-token',
  authorize(input) {
    googleInput = input;
    return {
      user: { id: 'google-user' },
      accessToken: 'opaque',
      refreshToken: 'google-refresh',
    };
  },
});
const googleAuth = createAuth({
  providers: [google],
  now: () => now,
  autoRefresh: false,
});
await googleAuth.signIn('google', { prompt: 'select_account' });
assert.equal(googleInput.idToken, 'google-token');
assert.equal(googleInput.prompt, 'select_account');

let transientAttempts = 0;
const retrying = createAuth({
  storage: createMemoryStorage({
    user: { id: 'retry-user' },
    accessToken: initialAccessToken,
    refreshToken: 'retry-token',
    expiresAt: now - 1,
  }),
  now: () => now,
  autoRefresh: false,
  maxRefreshErrors: 2,
  async refresh() {
    transientAttempts += 1;
    throw new AuthError('temporarily unavailable', {
      code: 'RefreshFailed',
      status: 503,
      recoverable: true,
    });
  },
});
await retrying.initialize();
assert.equal(retrying.status(), 'authenticated');
assert.equal(retrying.error().code, 'RefreshFailed');
await retrying.refresh({ force: true });
assert.equal(transientAttempts, 2);
assert.equal(retrying.status(), 'unauthenticated');
assert.equal(retrying.data(), null);

const backing = new Map();
const localStorage = {
  getItem(key) {
    return backing.get(key) ?? null;
  },
  setItem(key, value) {
    backing.set(key, value);
  },
  removeItem(key) {
    backing.delete(key);
  },
};
const local = createLocalStorageAdapter({
  key: 'test.auth',
  getStorage: () => localStorage,
});
await local.setSession({ user: { id: 'stored' } });
assert.equal((await local.getSession()).user.id, 'stored');
await local.clearSession();
assert.equal(await local.getSession(), null);

let finishLateRefresh;
const raceAuth = createAuth({
  storage: createMemoryStorage({
    user: { id: 'race-user' },
    accessToken: initialAccessToken,
    refreshToken: 'race-refresh',
    expiresAt: now + 60_000,
  }),
  now: () => now,
  autoRefresh: false,
  refresh: () =>
    new Promise((resolve) => {
      finishLateRefresh = resolve;
    }),
});
await raceAuth.initialize();
const lateRefresh = raceAuth.refresh({ force: true });
await Promise.resolve();
await raceAuth.signOut();
finishLateRefresh({
  accessToken: refreshedAccessToken,
  refreshToken: 'too-late',
});
await lateRefresh;
assert.equal(
  raceAuth.data(),
  null,
  'a late refresh cannot restore a signed-out session'
);

await assert.rejects(
  () => googleAuth.signIn('missing'),
  (error) => error.code === 'ProviderNotFound'
);

console.log('auth-core tests passed');
