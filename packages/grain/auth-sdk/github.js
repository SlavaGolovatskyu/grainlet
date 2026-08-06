import { AuthSdkError } from './errors.js';
import {
  createOAuthState,
  openCenteredPopup,
  waitForPopupMessage,
} from './popup.js';

export const GITHUB_CALLBACK_MESSAGE = 'grainlet:github-oauth';
const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';

export async function getGitHubAuthorization(config = {}, input = {}) {
  if (!config.clientId || !config.redirectUri) {
    throw new AuthSdkError(
      'GitHub clientId and redirectUri are required.',
      { code: 'GitHubConfigError' }
    );
  }
  if (typeof window === 'undefined') {
    throw new AuthSdkError('GitHub popup sign-in requires a browser.', {
      code: 'BrowserUnavailable',
    });
  }

  const state = input.state ?? createOAuthState();
  const redirectUrl = new URL(config.redirectUri, window.location.href);
  const authorizeUrl = new URL(
    config.authorizeUrl ?? GITHUB_AUTHORIZE_URL
  );
  authorizeUrl.searchParams.set('client_id', config.clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUrl.href);
  authorizeUrl.searchParams.set(
    'scope',
    input.scope ?? config.scope ?? 'read:user user:email'
  );
  authorizeUrl.searchParams.set('state', state);
  if (config.allowSignup === false) {
    authorizeUrl.searchParams.set('allow_signup', 'false');
  }
  if (input.login) authorizeUrl.searchParams.set('login', input.login);

  const popup = openCenteredPopup(authorizeUrl.href, {
    name: config.popupName ?? 'grainlet-github-oauth',
    width: config.popupWidth,
    height: config.popupHeight,
  });
  const message = await waitForPopupMessage({
    popup,
    state,
    origin: redirectUrl.origin,
    type: GITHUB_CALLBACK_MESSAGE,
    timeoutMs: input.timeoutMs ?? config.timeoutMs,
  });

  return { code: message.code, state, redirectUri: redirectUrl.href };
}

export function completeGitHubSignIn(options = {}) {
  if (typeof window === 'undefined') {
    throw new AuthSdkError('GitHub callback handling requires a browser.', {
      code: 'BrowserUnavailable',
    });
  }

  const params = new URLSearchParams(window.location.search);
  const message = {
    type: GITHUB_CALLBACK_MESSAGE,
    code: params.get('code') ?? undefined,
    state: params.get('state') ?? undefined,
    error: params.get('error') ?? undefined,
    errorDescription: params.get('error_description') ?? undefined,
  };

  if (!window.opener) {
    throw new AuthSdkError('The GitHub sign-in window has no opener.', {
      code: 'PopupOpenerMissing',
    });
  }

  window.opener.postMessage(
    message,
    options.targetOrigin ?? window.location.origin
  );
  if (options.close !== false) window.close();
  return message;
}

export function GitHubSignIn(sdk, options = {}) {
  if (!sdk?.exchange) {
    throw new TypeError('GitHubSignIn: createAuthSdk client is required');
  }
  return {
    id: options.id ?? 'github',
    name: options.name ?? 'GitHub',
    type: 'oauth',
    async authorize(input = {}) {
      let authorization;
      if (input?.code) {
        if (!input.state) {
          throw new AuthSdkError(
            'GitHub state is required with a supplied code.',
            { code: 'OAuthStateMissing' }
          );
        }
        authorization = {
          code: input.code,
          state: input.state,
          redirectUri:
            input.redirectUri ?? sdk.config.github?.redirectUri,
        };
      } else {
        authorization = await getGitHubAuthorization(
          sdk.config.github,
          input
        );
      }
      return sdk.exchange('github', authorization);
    },
  };
}
