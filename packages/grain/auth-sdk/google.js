import { Google } from '../auth/providers.js';
import { AuthSdkError, toAuthSdkError } from './errors.js';
import { loadScript } from './loadScript.js';

const GOOGLE_SCRIPT = 'https://accounts.google.com/gsi/client';

export async function getGoogleIdToken(config = {}, input = {}) {
  if (!config.clientId) {
    throw new AuthSdkError('Google clientId is required.', {
      code: 'GoogleConfigError',
    });
  }

  if (!globalThis.google?.accounts?.id) {
    await loadScript(config.scriptUrl ?? GOOGLE_SCRIPT, {
      id: 'grainlet-google-identity',
      timeoutMs: config.timeoutMs,
    });
  }

  const googleIdentity = globalThis.google?.accounts?.id;
  if (!googleIdentity) {
    throw new AuthSdkError('Google Identity Services did not initialize.', {
      code: 'GoogleUnavailable',
    });
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const timeoutId = setTimeout(() => {
      fail(
        new AuthSdkError('Google sign-in timed out.', {
          code: 'GoogleTimeout',
        })
      );
    }, input.timeoutMs ?? config.timeoutMs ?? 120_000);

    function succeed(token) {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      resolve(token);
    }

    function fail(error) {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      reject(error);
    }

    try {
      googleIdentity.initialize({
        client_id: config.clientId,
        auto_select: config.autoSelect ?? false,
        cancel_on_tap_outside: config.cancelOnTapOutside ?? true,
        context: config.context ?? 'signin',
        itp_support: config.itpSupport ?? true,
        ux_mode: 'popup',
        nonce: input.nonce ?? config.nonce,
        login_hint: input.loginHint,
        hd: input.hostedDomain ?? config.hostedDomain,
        callback(response) {
          if (response?.credential) {
            succeed(response.credential);
          } else {
            fail(
              new AuthSdkError('Google did not return an ID token.', {
                code: 'GoogleCredentialMissing',
              })
            );
          }
        },
      });
      googleIdentity.prompt((notification) => {
        if (
          notification?.isNotDisplayed?.() ||
          notification?.isSkippedMoment?.() ||
          notification?.isDismissedMoment?.()
        ) {
          const reason =
            notification.getNotDisplayedReason?.() ??
            notification.getSkippedReason?.() ??
            notification.getDismissedReason?.();
          fail(
            new AuthSdkError(
              reason
                ? `Google sign-in was unavailable: ${reason}.`
                : 'Google sign-in was dismissed.',
              { code: 'GooglePromptDismissed', details: reason }
            )
          );
        }
      });
    } catch (error) {
      fail(
        toAuthSdkError(
          error,
          'Google sign-in failed.',
          'GoogleSignInError'
        )
      );
    }
  });
}

export function GoogleSignIn(sdk, options = {}) {
  if (!sdk?.exchange) {
    throw new TypeError('GoogleSignIn: createAuthSdk client is required');
  }
  return Google({
    id: options.id ?? 'google',
    name: options.name ?? 'Google',
    getIdToken: (input) =>
      getGoogleIdToken(sdk.config.google, input),
    authorize: ({ idToken }) => sdk.exchange('google', { idToken }),
  });
}
