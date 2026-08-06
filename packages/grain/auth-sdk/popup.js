import { AuthSdkError } from './errors.js';

export function createOAuthState() {
  if (!globalThis.crypto?.getRandomValues) {
    throw new AuthSdkError(
      'Secure random values are unavailable in this environment.',
      { code: 'CryptoUnavailable' }
    );
  }
  const bytes = new Uint8Array(24);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  );
}

export function openCenteredPopup(url, options = {}) {
  if (typeof window === 'undefined') {
    throw new AuthSdkError('OAuth popups require a browser.', {
      code: 'BrowserUnavailable',
    });
  }

  const width = options.width ?? 520;
  const height = options.height ?? 680;
  const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
  const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);
  const features = [
    'popup=yes',
    `width=${width}`,
    `height=${height}`,
    `left=${Math.round(left)}`,
    `top=${Math.round(top)}`,
  ].join(',');
  const popup = window.open(url, options.name ?? 'grainlet-oauth', features);

  if (!popup) {
    throw new AuthSdkError(
      'The OAuth popup was blocked. Allow popups and try again.',
      { code: 'PopupBlocked' }
    );
  }
  popup.focus?.();
  return popup;
}

export function waitForPopupMessage(options) {
  const {
    popup,
    state,
    origin,
    type,
    timeoutMs = 120_000,
  } = options;

  return new Promise((resolve, reject) => {
    let settled = false;

    function finish(error, value) {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      clearInterval(closeInterval);
      window.removeEventListener('message', handleMessage);
      try {
        popup.close();
      } catch {
        // Cross-origin popups can reject close checks in some browsers.
      }
      if (error) reject(error);
      else resolve(value);
    }

    function handleMessage(event) {
      if (event.source !== popup || event.origin !== origin) return;
      const message = event.data;
      if (!message || message.type !== type) return;
      if (message.state !== state) {
        finish(
          new AuthSdkError('OAuth state validation failed.', {
            code: 'OAuthStateMismatch',
          })
        );
        return;
      }
      if (message.error) {
        finish(
          new AuthSdkError(
            message.errorDescription ?? message.error,
            { code: 'OAuthDenied', details: message }
          )
        );
        return;
      }
      if (!message.code) {
        finish(
          new AuthSdkError('The OAuth callback did not include a code.', {
            code: 'OAuthCodeMissing',
          })
        );
        return;
      }
      finish(null, message);
    }

    window.addEventListener('message', handleMessage);
    const closeInterval = setInterval(() => {
      if (popup.closed) {
        finish(
          new AuthSdkError('The OAuth popup was closed before sign-in.', {
            code: 'PopupClosed',
          })
        );
      }
    }, 250);
    const timeoutId = setTimeout(() => {
      finish(
        new AuthSdkError('The OAuth popup timed out.', {
          code: 'PopupTimeout',
        })
      );
    }, timeoutMs);
  });
}
