import { AUTH_PATHS } from './paths/auth.js';
import { getCachedAccessToken, recoverFromUnauthorized } from './sessionBridge.js';

/** Endpoints that must not receive a Bearer token (logout intentionally omitted). */
const AUTH_ENDPOINTS_WITHOUT_BEARER = [
  AUTH_PATHS.login,
  AUTH_PATHS.register,
  AUTH_PATHS.refresh,
  AUTH_PATHS.sync,
  AUTH_PATHS.forgotPassword,
  AUTH_PATHS.resetPassword,
  AUTH_PATHS.verify,
  AUTH_PATHS.resendVerification,
];

export function isAuthEndpoint(path) {
  return AUTH_ENDPOINTS_WITHOUT_BEARER.some((entry) => path.startsWith(entry));
}

function getRequestPath(input) {
  if (typeof input === 'string') {
    try {
      return new URL(input).pathname;
    } catch {
      return input.startsWith('/') ? input : `/${input}`;
    }
  }

  return input.pathname;
}

function applyAuthorizationHeader(headers, path, refreshFromCache = false) {
  if (isAuthEndpoint(path)) {
    return;
  }

  if (!refreshFromCache && headers.has('Authorization')) {
    return;
  }

  const cachedToken = getCachedAccessToken();
  if (cachedToken) {
    headers.set('Authorization', `Bearer ${cachedToken}`);
    return;
  }

  headers.delete('Authorization');
}

export async function authenticatedFetch(input, init = {}, isRetry = false) {
  const path = getRequestPath(input);
  const headers = new Headers(init.headers);

  applyAuthorizationHeader(headers, path, isRetry);

  const response = await fetch(input, { ...init, headers });

  const sentAuthorization = headers.has('Authorization');

  if (
    response.status === 401 &&
    !isAuthEndpoint(path) &&
    typeof window !== 'undefined' &&
    sentAuthorization
  ) {
    const action = await recoverFromUnauthorized(isRetry);
    if (action === 'retry') {
      return authenticatedFetch(input, init, true);
    }
  }

  return response;
}
