import { createEffect, createSignal, Match, onCleanup, Switch } from 'grainlet';
import { useI18n } from 'grainlet/i18n';
import { Link, navigate, useSearchParams } from 'grainlet/route';
import { AUTH_PATHS, apiClient } from '../../api.js';
import { translateApp } from '../../i18n.js';
import { ROUTE_AUTH_SIGNIN, ROUTE_AUTH_VERIFY_PENDING } from '../../routes.js';
import {
  buildVerifyPayload,
  isAlreadyVerifiedMessage,
  readAuthToken,
  readPendingAuthFlags,
  safeLocalStorage,
  verifyFailureMessage,
  verifyRedirectDelay,
  verifyRedirectPath,
  verifySuccessMessageKey,
} from './auth-pages.js';

export function VerifyPage() {
  const i18n = useI18n();
  const t = (key, variables) => translateApp(i18n, key, variables);
  const [search] = useSearchParams();
  const [status, setStatus] = createSignal('loading');
  const [error, setError] = createSignal('');
  const [successMessage, setSuccessMessage] = createSignal('');
  let requestSerial = 0;
  let redirectTimer = 0;

  createEffect(() => {
    const token = readAuthToken(search());
    const serial = ++requestSerial;
    if (redirectTimer) {
      clearTimeout(redirectTimer);
      redirectTimer = 0;
    }

    onCleanup(() => {
      requestSerial += 1;
      if (redirectTimer) {
        clearTimeout(redirectTimer);
        redirectTimer = 0;
      }
    });

    if (!token) {
      setStatus('error');
      setError(t('auth.invalidOrExpiredToken'));
      setSuccessMessage('');
      return;
    }

    setStatus('verifying');
    setError('');
    setSuccessMessage('');

    apiClient
      .post(AUTH_PATHS.verify, buildVerifyPayload(token))
      .then((data) => {
        if (serial !== requestSerial) return;
        finish(Boolean(data && data.alreadyVerified));
      })
      .catch((cause) => {
        if (serial !== requestSerial) return;
        const message = verifyFailureMessage(cause, t);
        if (isAlreadyVerifiedMessage(message)) {
          finish(true);
          return;
        }
        setStatus('error');
        setError(message);
      });

    function finish(alreadyVerified) {
      setSuccessMessage(t(verifySuccessMessageKey(alreadyVerified)));
      setStatus('success');
      const flags = readPendingAuthFlags(safeLocalStorage());
      redirectTimer = setTimeout(() => {
        if (serial !== requestSerial) return;
        navigate(verifyRedirectPath(flags));
      }, verifyRedirectDelay(flags));
    }
  });

  const busy = () => status() === 'loading' || status() === 'verifying';

  return (
    <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div class="flex items-center justify-center px-4 py-16">
        <div class="w-full max-w-md space-y-6 text-center">
          <Switch>
            <Match when={busy()}>
              <div class="space-y-6">
                <div class="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                  {status() === 'verifying' ? t('auth.verifyingEmail') : t('auth.loading')}
                </h1>
              </div>
            </Match>
            <Match when={status() === 'success'}>
              <div class="space-y-6">
                <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                  <svg class="h-8 w-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{successMessage()}</h1>
                <p class="text-gray-600 dark:text-gray-400">{t('auth.redirecting')}</p>
              </div>
            </Match>
            <Match when={status() === 'error'}>
              <div class="space-y-6">
                <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                  <svg class="h-8 w-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                  {t('auth.verificationFailed')}
                </h1>
                <p class="text-gray-600 dark:text-gray-400">{error()}</p>
                <div class="space-y-3">
                  <Link
                    href={ROUTE_AUTH_VERIFY_PENDING}
                    class="inline-flex h-11 w-full items-center justify-center rounded-md bg-secondary px-8 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
                  >
                    {t('auth.resendVerificationEmail')}
                  </Link>
                  <Link
                    href={ROUTE_AUTH_SIGNIN}
                    class="inline-flex h-11 w-full items-center justify-center rounded-md px-8 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                  >
                    {t('nav.signIn')}
                  </Link>
                </div>
              </div>
            </Match>
          </Switch>
        </div>
      </div>
    </div>
  );
}
