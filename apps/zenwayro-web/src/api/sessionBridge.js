/**
 * Auth session hooks for the HTTP layer.
 * This module must not import src/auth.js — auth registers handlers after createAuth.
 */

let handlers = null;
let refreshInFlight = null;
let signOutInFlight = null;
let tokenSuppressed = false;

export function registerAuthSessionHandlers(nextHandlers) {
  handlers = nextHandlers;
  return () => {
    if (handlers === nextHandlers) {
      handlers = null;
    }
  };
}

export function getCachedAccessToken() {
  if (tokenSuppressed) return null;
  const token = handlers?.getAccessToken?.();
  return token ?? null;
}

function refreshSession() {
  if (!handlers?.refresh) {
    return Promise.resolve(null);
  }

  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = Promise.resolve(handlers.refresh()).finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

function signOutOnAuthFailure() {
  if (signOutInFlight) {
    return signOutInFlight;
  }

  if (!handlers?.signOut) {
    return Promise.resolve();
  }

  tokenSuppressed = true;
  signOutInFlight = Promise.resolve(handlers.signOut()).finally(() => {
    signOutInFlight = null;
    tokenSuppressed = false;
  });

  return signOutInFlight;
}

export async function recoverFromUnauthorized(isRetry) {
  if (!isRetry) {
    const session = await refreshSession();
    if (session?.accessToken) {
      return 'retry';
    }
    await signOutOnAuthFailure();
    return 'fail';
  }

  await signOutOnAuthFailure();
  return 'fail';
}
