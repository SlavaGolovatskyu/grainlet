import { AuthSdkError, toAuthSdkError } from './errors.js';
import { loadScript } from './loadScript.js';

const APPLE_SCRIPT =
  'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';

export async function getAppleCredential(config = {}, input = {}) {
  if (!config.clientId || !config.redirectURI) {
    throw new AuthSdkError(
      'Apple clientId and redirectURI are required.',
      { code: 'AppleConfigError' }
    );
  }

  if (!globalThis.AppleID?.auth) {
    await loadScript(config.scriptUrl ?? APPLE_SCRIPT, {
      id: 'grainlet-apple-auth',
      timeoutMs: config.timeoutMs,
    });
  }

  const appleAuth = globalThis.AppleID?.auth;
  if (!appleAuth) {
    throw new AuthSdkError('Sign in with Apple did not initialize.', {
      code: 'AppleUnavailable',
    });
  }

  try {
    appleAuth.init({
      clientId: config.clientId,
      scope: config.scope ?? 'name email',
      redirectURI: config.redirectURI,
      state: input.state ?? config.state,
      nonce: input.nonce ?? config.nonce,
      usePopup: true,
    });
    const result = await appleAuth.signIn();
    const idToken =
      result?.authorization?.id_token ??
      result?.authorization?.idToken ??
      result?.id_token;
    if (!idToken) {
      throw new AuthSdkError('Apple did not return an ID token.', {
        code: 'AppleCredentialMissing',
      });
    }
    return { idToken, user: result.user };
  } catch (error) {
    throw toAuthSdkError(
      error,
      'Sign in with Apple failed.',
      'AppleSignInError'
    );
  }
}

export function AppleSignIn(sdk, options = {}) {
  if (!sdk?.exchange) {
    throw new TypeError('AppleSignIn: createAuthSdk client is required');
  }
  return {
    id: options.id ?? 'apple',
    name: options.name ?? 'Apple',
    type: 'oauth',
    async authorize(input = {}) {
      const supplied =
        typeof input === 'string'
          ? { idToken: input }
          : input?.idToken
            ? { idToken: input.idToken, user: input.user }
            : null;
      const credential =
        supplied ?? (await getAppleCredential(sdk.config.apple, input));
      return sdk.exchange('apple', credential);
    },
  };
}
