import { createSignal, Show, Switch, Match } from 'grainlet';
import { createForm, getIn } from 'grainlet/forms';
import { useI18n } from 'grainlet/i18n';
import { Link, useSearchParams } from 'grainlet/route';
import { AUTH_PATHS, apiClient } from '../../api.js';
import { translateApp } from '../../i18n.js';
import { ROUTE_AUTH_SIGNIN } from '../../routes.js';
import { AuthCard, AuthField, AuthSubmitButton } from './AuthCard.jsx';
import {
  buildResetPasswordPayload,
  readAuthToken,
  readFieldError,
  resetPasswordFailureMessage,
  resetPasswordFieldErrors,
} from './auth-pages.js';

export function ResetPasswordPage() {
  const i18n = useI18n();
  const t = (key, variables) => translateApp(i18n, key, variables);
  const [search] = useSearchParams();
  const [submitError, setSubmitError] = createSignal('');
  const [success, setSuccess] = createSignal(false);

  const form = createForm({
    initialValues: { password: '', confirmPassword: '' },
    validate: (values) => resetPasswordFieldErrors(values, t),
    onSubmit: async (values) => {
      const token = readAuthToken(search());
      setSubmitError('');
      if (!token) {
        setSubmitError(t('auth.invalidOrExpiredResetToken'));
        return;
      }
      try {
        await apiClient.post(
          AUTH_PATHS.resetPassword,
          buildResetPasswordPayload(token, values.password)
        );
      } catch (error) {
        setSubmitError(resetPasswordFailureMessage(error, t));
        return;
      }
      setSuccess(true);
    },
  });

  function fieldMessage(name) {
    if (!getIn(form.touched(), name)) return '';
    return readFieldError(getIn(form.errors(), name));
  }

  function missingToken() {
    return !readAuthToken(search());
  }

  return (
    <AuthCard title={t('auth.resetPasswordTitle')}>
      <Switch>
        <Match when={missingToken()}>
          <div class="space-y-4">
            <p class="text-sm text-red-600 dark:text-red-400">
              {t('auth.invalidOrExpiredResetToken')}
            </p>
            <Link
              href={ROUTE_AUTH_SIGNIN}
              class="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t('auth.backToSignIn')}
            </Link>
          </div>
        </Match>
        <Match when={success()}>
          <div class="space-y-4">
            <p class="text-center text-sm text-green-600 dark:text-green-400">
              {t('auth.resetPasswordSuccess')}
            </p>
            <Link
              href={ROUTE_AUTH_SIGNIN}
              class="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t('auth.backToSignIn')}
            </Link>
          </div>
        </Match>
        <Match when={!success()}>
          <form class="space-y-4" novalidate onSubmit={form.handleSubmit}>
            <AuthField
              label={t('auth.password')}
              name="password"
              type="password"
              autocomplete="new-password"
              placeholder={t('auth.passwordPlaceholder')}
              value={form.values().password}
              onInput={form.handleChange}
              onBlur={form.handleBlur}
              error={fieldMessage('password')}
            />
            <AuthField
              label={t('auth.confirmPassword')}
              name="confirmPassword"
              type="password"
              autocomplete="new-password"
              placeholder={t('auth.confirmPasswordPlaceholder')}
              value={form.values().confirmPassword}
              onInput={form.handleChange}
              onBlur={form.handleBlur}
              error={fieldMessage('confirmPassword')}
            />
            <Show when={submitError()}>
              {(message) => <p class="text-sm text-red-600 dark:text-red-400">{message}</p>}
            </Show>
            <AuthSubmitButton disabled={form.isSubmitting()}>
              {form.isSubmitting() ? t('auth.resettingPassword') : t('auth.resetPasswordCta')}
            </AuthSubmitButton>
          </form>
        </Match>
      </Switch>
    </AuthCard>
  );
}
