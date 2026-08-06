import { AuthSdkError, toAuthSdkError } from './errors.js';

const DEFAULT_ENDPOINTS = {
  google: '/google',
  apple: '/apple',
  github: '/github',
  refresh: '/refresh',
};

function endpointUrl(baseUrl, endpoint) {
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  return `${baseUrl.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
}

async function readBody(response) {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function createAuthSdk(config = {}) {
  const endpoints = Object.fromEntries(
    Object.entries(DEFAULT_ENDPOINTS).map(([provider, endpoint]) => [
      provider,
      config.endpoints?.[provider] ?? endpoint,
    ])
  );
  const baseUrl = config.baseUrl ?? '/api/auth';

  async function request(endpoint, body) {
    const fetchImpl = config.fetch ?? globalThis.fetch;
    if (typeof fetchImpl !== 'function') {
      throw new AuthSdkError('Fetch is not available in this environment.', {
        code: 'FetchUnavailable',
      });
    }

    let response;
    try {
      response = await fetchImpl(endpointUrl(baseUrl, endpoint), {
        method: 'POST',
        credentials: config.credentials ?? 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...config.headers,
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw toAuthSdkError(
        error,
        'The authentication server could not be reached.',
        'NetworkError'
      );
    }

    const result = await readBody(response);
    if (!response.ok) {
      const message =
        result && typeof result === 'object'
          ? result.message ?? result.error
          : typeof result === 'string'
            ? result
            : undefined;
      throw new AuthSdkError(
        message || `Authentication request failed (${response.status}).`,
        {
          code:
            result && typeof result === 'object' && result.code
              ? result.code
              : 'AuthHttpError',
          status: response.status,
          details: result,
        }
      );
    }

    return result;
  }

  function exchange(provider, payload) {
    const endpoint = endpoints[provider];
    if (!endpoint) {
      throw new AuthSdkError(`No endpoint configured for "${provider}".`, {
        code: 'EndpointUnavailable',
      });
    }
    return request(endpoint, payload);
  }

  async function refresh({ userId, refreshToken }) {
    return request(endpoints.refresh, { userId, refreshToken });
  }

  const sdk = {
    config: {
      google: config.google,
      apple: config.apple,
      github: config.github,
    },
    endpoints,
    exchange,
    refresh,
    signInGoogle: (auth, input) => auth.signIn('google', input),
    signInApple: (auth, input) => auth.signIn('apple', input),
    signInGitHub: (auth, input) => auth.signIn('github', input),
  };

  return sdk;
}
