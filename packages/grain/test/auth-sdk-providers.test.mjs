import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
  url: 'https://app.test/',
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;

let googleInitialize;
globalThis.google = {
  accounts: {
    id: {
      initialize(options) {
        googleInitialize = options;
      },
      prompt() {
        googleInitialize.callback({ credential: 'google-id-token' });
      },
    },
  },
};

let appleInit;
globalThis.AppleID = {
  auth: {
    init(options) {
      appleInit = options;
      assert.equal(options.clientId, 'apple-client');
      assert.equal(options.usePopup, true);
    },
    async signIn() {
      return {
        authorization: { id_token: 'apple-id-token' },
        user: { name: { firstName: 'Grain' } },
      };
    },
  },
};

const posts = [];
const {
  AppleSignIn,
  GITHUB_CALLBACK_MESSAGE,
  GitHubSignIn,
  GoogleSignIn,
  createAuthSdk,
  getGitHubAuthorization,
} = await import('../auth-sdk/index.js');
const { createAuth } = await import('../auth/index.js');

const sdk = createAuthSdk({
  google: { clientId: 'google-client' },
  apple: {
    clientId: 'apple-client',
    redirectURI: 'https://app.test/auth/apple/callback',
  },
  github: {
    clientId: 'github-client',
    redirectUri: 'https://app.test/auth/github/callback',
  },
  fetch: async (url, options) => {
    const body = JSON.parse(options.body);
    posts.push({ url, body });
    return {
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          user: { id: `${url.split('/').pop()}-user` },
          accessToken: 'opaque-access-token',
        }),
    };
  },
});

const auth = createAuth({
  providers: [
    GoogleSignIn(sdk),
    AppleSignIn(sdk),
    GitHubSignIn(sdk),
  ],
  refresh: sdk.refresh,
  autoRefresh: false,
});
await auth.initialize();

assert.equal((await auth.signIn('google')).user.id, 'google-user');
assert.deepEqual(posts[0].body, { idToken: 'google-id-token' });

assert.equal((await auth.signIn('apple')).user.id, 'apple-user');
assert.equal(appleInit.state.length, 48);
assert.equal(appleInit.nonce.length, 48);
assert.match(appleInit.state, /^[0-9a-f]+$/);
assert.match(appleInit.nonce, /^[0-9a-f]+$/);
assert.notEqual(appleInit.state, appleInit.nonce);
assert.deepEqual(posts[1].body, {
  idToken: 'apple-id-token',
  user: { name: { firstName: 'Grain' } },
});

assert.equal(
  (
    await auth.signIn('github', {
      code: 'github-code',
      state: 'github-state',
    })
  ).user.id,
  'github-user'
);
assert.deepEqual(posts[2].body, {
  code: 'github-code',
  state: 'github-state',
  redirectUri: 'https://app.test/auth/github/callback',
});

dom.window.focus = () => {};
dom.window.close = () => {};
dom.window.open = (url) => {
  const state = new URL(url).searchParams.get('state');
  setTimeout(() => {
    dom.window.dispatchEvent(
      new dom.window.MessageEvent('message', {
        origin: 'https://app.test',
        source: dom.window,
        data: {
          type: GITHUB_CALLBACK_MESSAGE,
          code: 'popup-code',
          state,
        },
      })
    );
  }, 0);
  return dom.window;
};

const popupAuthorization = await getGitHubAuthorization(sdk.config.github);
assert.equal(popupAuthorization.code, 'popup-code');
assert.equal(
  popupAuthorization.redirectUri,
  'https://app.test/auth/github/callback'
);
assert.equal(popupAuthorization.state.length, 48);

console.log('auth-sdk-providers tests passed');
