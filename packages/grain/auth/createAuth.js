import { createSignal } from '../signals/index.js';
import { AuthError, toAuthError } from './errors.js';
import { getAccessTokenExpiry } from './jwt.js';
import { createMemoryStorage } from './storage.js';

const DEFAULT_RETRY_REFRESH_MS = 30 * 1000;
const DEFAULT_MAX_REFRESH_ERRORS = 3;

function defaultIsNonRecoverable(error) {
  return (
    error?.recoverable === false ||
    error?.status === 401 ||
    error?.status === 403
  );
}

function toUser(result) {
  if (result.user && typeof result.user === 'object') return result.user;
  if (result.userId || result.email) {
    return {
      id: result.userId,
      email: result.email,
      name: result.name ?? null,
    };
  }
  return null;
}

function normalizeSession(result, provider, expiryOptions) {
  if (!result || typeof result !== 'object') {
    throw new AuthError('Provider returned an invalid session', {
      code: 'InvalidSession',
    });
  }

  const user = toUser(result);
  if (!user) {
    throw new AuthError('Provider session must include a user', {
      code: 'InvalidSession',
    });
  }

  const session = {
    ...result,
    user,
    provider: result.provider ?? provider,
  };

  if (
    session.accessToken &&
    typeof session.expiresAt !== 'number'
  ) {
    session.expiresAt = getAccessTokenExpiry(
      session.accessToken,
      expiryOptions
    );
  }

  return session;
}

function refreshKey(session) {
  return `${session.user?.id ?? ''}:${session.refreshToken ?? ''}`;
}

export function createAuth(config = {}) {
  const providers = new Map();
  for (const provider of config.providers ?? []) {
    if (!provider?.id || typeof provider.authorize !== 'function') {
      throw new TypeError('createAuth: every provider needs an id and authorize');
    }
    if (providers.has(provider.id)) {
      throw new TypeError(`createAuth: duplicate provider "${provider.id}"`);
    }
    providers.set(provider.id, provider);
  }

  const storage = config.storage ?? createMemoryStorage();
  const now = config.now ?? Date.now;
  const expiryOptions = {
    now,
    fallbackMs: config.accessTokenExpiryFallbackMs,
    safetyBufferMs: config.accessTokenExpirySafetyBufferMs,
  };
  const retryRefreshAfterMs =
    config.retryRefreshAfterMs ?? DEFAULT_RETRY_REFRESH_MS;
  const maxRefreshErrors =
    config.maxRefreshErrors ?? DEFAULT_MAX_REFRESH_ERRORS;
  const isNonRecoverable =
    config.isRefreshErrorNonRecoverable ?? defaultIsNonRecoverable;

  const [data, setData] = createSignal(null);
  const [status, setStatus] = createSignal('loading');
  const [error, setError] = createSignal(null);
  const refreshInFlight = new Map();

  let initializePromise;
  let refreshErrorCount = 0;
  let nextRefreshAt = 0;
  let refreshTimer;
  let sessionRevision = 0;

  function clearRefreshTimer() {
    if (refreshTimer != null) {
      clearTimeout(refreshTimer);
      refreshTimer = undefined;
    }
  }

  function scheduleRefresh(session) {
    clearRefreshTimer();
    if (
      config.autoRefresh === false ||
      !config.refresh ||
      !session?.refreshToken ||
      typeof session.expiresAt !== 'number'
    ) {
      return;
    }

    const delay = Math.max(
      0,
      Math.max(session.expiresAt, nextRefreshAt) - now()
    );
    refreshTimer = setTimeout(() => {
      refresh({ force: true }).catch(() => {});
    }, Math.min(delay, 2_147_483_647));
    refreshTimer?.unref?.();
  }

  async function persist(session) {
    if (session) {
      await storage.setSession(session);
    } else {
      await storage.clearSession();
    }
  }

  function commitSession(session) {
    setData(session);
    setStatus(session ? 'authenticated' : 'unauthenticated');
    scheduleRefresh(session);
  }

  async function clearSession() {
    clearRefreshTimer();
    await persist(null);
    setData(null);
    setStatus('unauthenticated');
  }

  async function failRefresh(cause) {
    const authError = toAuthError(cause, 'RefreshAccessTokenError');
    refreshErrorCount += 1;
    const terminal =
      isNonRecoverable(authError) ||
      refreshErrorCount >= maxRefreshErrors;

    setError(authError);
    config.onError?.(authError);

    if (terminal) {
      await clearSession();
      return null;
    }

    nextRefreshAt = now() + retryRefreshAfterMs;
    scheduleRefresh(data());
    return data();
  }

  async function performRefresh(session) {
    if (!config.refresh || !session?.refreshToken) {
      const authError = new AuthError('The session cannot be refreshed', {
        code: 'RefreshUnavailable',
        recoverable: false,
      });
      return failRefresh(authError);
    }

    const key = refreshKey(session);
    const existing = refreshInFlight.get(key);
    if (existing) return existing;
    const revision = sessionRevision;

    const promise = (async () => {
      try {
        const result = await config.refresh({
          session,
          refreshToken: session.refreshToken,
          userId: session.user?.id,
        });
        if (revision !== sessionRevision) return data();
        if (!result || typeof result !== 'object') {
          throw new AuthError('Refresh returned an invalid session', {
            code: 'InvalidSession',
            recoverable: false,
          });
        }
        const refreshedInput = {
          ...session,
          ...result,
          user: result?.user ?? session.user,
        };
        if (
          Object.prototype.hasOwnProperty.call(result, 'accessToken') &&
          result.expiresAt == null
        ) {
          delete refreshedInput.expiresAt;
        }
        const refreshed = normalizeSession(
          refreshedInput,
          result?.provider ?? session.provider,
          expiryOptions
        );
        await persist(refreshed);
        refreshErrorCount = 0;
        nextRefreshAt = 0;
        setError(null);
        commitSession(refreshed);
        return refreshed;
      } catch (cause) {
        if (revision !== sessionRevision) return data();
        return failRefresh(cause);
      } finally {
        refreshInFlight.delete(key);
      }
    })();

    refreshInFlight.set(key, promise);
    return promise;
  }

  async function initialize() {
    if (initializePromise) return initializePromise;

    initializePromise = (async () => {
      try {
        const stored = await storage.getSession();
        if (!stored) {
          commitSession(null);
          return null;
        }

        const session = normalizeSession(
          stored,
          stored.provider,
          expiryOptions
        );
        commitSession(session);

        if (
          session.accessToken &&
          typeof session.expiresAt === 'number' &&
          now() >= session.expiresAt
        ) {
          return performRefresh(session);
        }
        return session;
      } catch (cause) {
        const authError = toAuthError(cause, 'SessionHydrationError');
        setError(authError);
        config.onError?.(authError);
        await clearSession();
        return null;
      }
    })();

    return initializePromise;
  }

  async function signIn(providerId, input) {
    await initialize();
    const provider = providers.get(providerId);
    if (!provider) {
      throw new AuthError(`Unknown auth provider "${providerId}"`, {
        code: 'ProviderNotFound',
      });
    }

    sessionRevision += 1;
    setStatus('loading');
    setError(null);
    try {
      const result = await provider.authorize(input, {
        auth,
        provider,
      });
      if (!result) {
        throw new AuthError('Sign in was not authorized', {
          code:
            provider.type === 'credentials'
              ? 'CredentialsSignin'
              : 'OAuthSignin',
        });
      }

      const session = normalizeSession(result, provider.id, expiryOptions);
      await persist(session);
      refreshErrorCount = 0;
      nextRefreshAt = 0;
      commitSession(session);
      config.onSession?.(session);
      return session;
    } catch (cause) {
      const authError = toAuthError(cause, 'SignInError');
      setError(authError);
      setStatus(data() ? 'authenticated' : 'unauthenticated');
      config.onError?.(authError);
      throw authError;
    }
  }

  async function signOut() {
    await initialize();
    sessionRevision += 1;
    const session = data();
    let callbackError;
    try {
      await config.onSignOut?.(session);
    } catch (cause) {
      callbackError = toAuthError(cause, 'SignOutError');
    } finally {
      await clearSession();
    }

    setError(callbackError ?? null);
    if (callbackError) {
      config.onError?.(callbackError);
      throw callbackError;
    }
  }

  async function refresh(options = {}) {
    await initialize();
    const session = data();
    if (!session) return null;

    const validUntil = Math.max(session.expiresAt ?? 0, nextRefreshAt);
    if (
      !options.force &&
      (!session.accessToken || now() < validUntil)
    ) {
      return session;
    }
    return performRefresh(session);
  }

  async function getSession(options = {}) {
    await initialize();
    return refresh({ force: options.forceRefresh === true });
  }

  async function update(patch) {
    await initialize();
    const current = data();
    if (!current) return null;

    sessionRevision += 1;
    const changes =
      typeof patch === 'function' ? await patch(current) : patch;
    const session = normalizeSession(
      { ...current, ...(changes ?? {}) },
      changes?.provider ?? current.provider,
      expiryOptions
    );
    await persist(session);
    setError(null);
    commitSession(session);
    config.onSession?.(session);
    return session;
  }

  function dispose() {
    clearRefreshTimer();
  }

  const auth = {
    data,
    status,
    error,
    providers: () => [...providers.values()],
    initialize,
    getSession,
    signIn,
    signOut,
    refresh,
    update,
    dispose,
  };

  return auth;
}
