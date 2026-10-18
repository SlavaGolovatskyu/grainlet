import { createAuth, Credentials, Google, createLocalStorageAdapter } from 'grainlet/auth';
import { AUTH_PATHS, postJson } from './api.js';
import { registerAuthSessionHandlers } from './api/sessionBridge.js';

async function googleIdToken() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('Google sign-in requires VITE_GOOGLE_CLIENT_ID');
  }
  const { getGoogleIdToken } = await import('grainlet/auth-sdk');
  return getGoogleIdToken({ clientId });
}

export const auth = createAuth({
  providers: [
    Credentials({
      authorize: ({ email, password }) =>
        postJson(AUTH_PATHS.login, { email, password }),
    }),
    Google({
      getIdToken: () => googleIdToken(),
      authorize: ({ idToken }) =>
        postJson(AUTH_PATHS.sync, { provider: 'google', idToken }),
    }),
  ],
  refresh: ({ userId, refreshToken }) =>
    postJson(AUTH_PATHS.refresh, { userId, refreshToken }),
  storage: createLocalStorageAdapter({ key: 'zenwayro.auth.session' }),
  autoRefresh: true,
});

registerAuthSessionHandlers({
  getAccessToken: () => auth.data()?.accessToken ?? null,
  refresh: () => auth.refresh({ force: true }),
  signOut: () => auth.signOut(),
});
