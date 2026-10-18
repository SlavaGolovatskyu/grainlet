import { createSignal, Show } from 'grainlet';
import { createForm, getIn } from 'grainlet/forms';
import { useI18n } from 'grainlet/i18n';
import { Link } from 'grainlet/route';
import { AUTH_PATHS, apiClient } from '../../api.js';
import { translateApp } from '../../i18n.js';
import { ROUTE_AUTH_SIGNIN } from '../../routes.js';
import { AuthCard, AuthField, AuthSubmitButton } from './AuthCard.jsx';
import {
  buildForgotPasswordPayload,
  forgotPasswordFailureKey,
  forgotPasswordFieldErrors,
  readFieldError,
} from './auth-pages.js';

export function ForgotPasswordPage() {
  const i18n = useI18n();
  const t = (key, variables) => translateApp(i18n, key, variables);
  const [formError, setFormError] = createSignal('');
  const [success, setSuccess] = createSignal(false);

  const form = createForm({
    initialValues: { email: '' },
    validate: (values) => forgotPasswordFieldErrors(values, t),
    onSubmit: async (values) => {
      setFormError('');
      setSuccess(false);
      try {
        await apiClient.post(
          AUTH_PATHS.forgotPassword,
          buildForgotPasswordPayload(values.email)
        );
      } catch (error) {
        setSuccess(false);
        setFormError(t(forgotPasswordFailureKey(error && error.status)));
        return;
      }
      setSuccess(true);
    },
  });

  function fieldMessage(name) {
    if (!getIn(form.touched(), name)) return '';
    return readFieldError(getIn(form.errors(), name));
  }

  return (
    <AuthCard
      title={t('auth.forgotPasswordTitle')}
      description={t('auth.forgotPasswordSubtitle')}
    >
      <form class="space-y-4" novalidate onSubmit={form.handleSubmit}>
        <AuthField
          label={t('auth.email')}
          name="email"
          type="email"
          autocomplete="email"
          placeholder={t('auth.emailPlaceholder')}
          value={form.values().email}
          onInput={form.handleChange}
          onBlur={form.handleBlur}
          error={fieldMessage('email')}
        />
        <Show when={success()}>
          <p class="text-sm text-green-600 dark:text-green-400">
            {t('auth.forgotPasswordSuccess')}
          </p>
        </Show>
        <Show when={formError()}>
          {(message) => <p class="text-sm text-red-600 dark:text-red-400">{message}</p>}
        </Show>
        <AuthSubmitButton disabled={form.isSubmitting()}>
          {form.isSubmitting() ? t('auth.sending') : t('auth.sendResetLink')}
        </AuthSubmitButton>
      </form>
      <p class="text-center text-sm text-gray-500 dark:text-gray-400">
        <Link
          href={ROUTE_AUTH_SIGNIN}
          class="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
        >
          {t('auth.backToSignIn')}
        </Link>
      </p>
    </AuthCard>
  );
}
