import { createEffect, createSignal, Show } from 'grainlet';
import { useI18n } from 'grainlet/i18n';
import { Link, useSearchParams } from 'grainlet/route';
import { AUTH_PATHS, apiClient } from '../../api.js';
import { translateApp } from '../../i18n.js';
import { ROUTE_AUTH_SIGNIN } from '../../routes.js';
import {
  buildResendVerificationPayload,
  readAuthEmail,
  resendVerificationFailureMessage,
  verificationPendingCopy,
} from './auth-pages.js';

export function VerifyPendingPage() {
  const i18n = useI18n();
  const t = (key, variables) => translateApp(i18n, key, variables);
  const [search] = useSearchParams();
  const [email, setEmail] = createSignal('');
  const [emailFromSearch, setEmailFromSearch] = createSignal(false);
  const [sending, setSending] = createSignal(false);
  const [success, setSuccess] = createSignal(false);
  const [error, setError] = createSignal('');

  createEffect(() => {
    const fromSearch = readAuthEmail(search());
    if (!fromSearch) return;
    setEmail(fromSearch);
    setEmailFromSearch(true);
  });

  function pendingMessage() {
    return verificationPendingCopy(
      {
        email: email(),
        emailFromSearch: emailFromSearch(),
        resent: success(),
      },
      t
    );
  }

  async function handleResend(event) {
    event.preventDefault();
    const current = email();
    if (!current || sending()) return;
    setSending(true);
    setSuccess(false);
    setError('');
    try {
      await apiClient.post(
        AUTH_PATHS.resendVerification,
        buildResendVerificationPayload(current)
      );
      setSuccess(true);
    } catch (cause) {
      setError(resendVerificationFailureMessage(cause));
    } finally {
      setSending(false);
    }
  }

  return (
    <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div class="flex items-center justify-center px-4 py-16">
        <div class="w-full max-w-md space-y-6">
          <div class="text-center">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
              <svg class="h-8 w-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
              {t('auth.verificationPending')}
            </h1>
            <p class="mt-2 text-gray-600 dark:text-gray-400">{pendingMessage()}</p>
          </div>
          <form class="space-y-4" onSubmit={handleResend}>
            <div>
              <p class="mb-2 text-sm text-gray-600 dark:text-gray-400">
                {t('auth.didntReceiveEmail')}
              </p>
              <label class="block space-y-1.5">
                <span class="text-sm font-medium">{t('auth.email')}</span>
                <input
                  class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
                  name="email"
                  type="email"
                  autocomplete="email"
                  required
                  placeholder={t('auth.emailPlaceholder')}
                  value={email()}
                  onInput={(event) => setEmail(event.target.value)}
                />
              </label>
            </div>
            <Show when={success()}>
              <p class="text-sm text-green-600 dark:text-green-400">{t('auth.emailResent')}</p>
            </Show>
            <Show when={error()}>
              {(message) => <p class="text-sm text-red-600 dark:text-red-400">{message}</p>}
            </Show>
            <button
              type="submit"
              class="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={sending() || !email()}
            >
              {sending() ? t('auth.sending') : t('auth.resendVerificationEmail')}
            </button>
          </form>
          <div class="text-center">
            <Link
              href={ROUTE_AUTH_SIGNIN}
              class="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              {t('auth.signInLink')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
