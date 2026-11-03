import { createSignal, Show } from 'grainlet';
import { useSession } from 'grainlet/auth';
import { createForm, getIn } from 'grainlet/forms';
import { useI18n } from 'grainlet/i18n';
import { Link, navigate } from 'grainlet/route';
import { AUTH_PATHS, apiClient } from '../../api.js';
import { translateApp } from '../../i18n.js';
import { ROUTE_AUTH_SIGNIN, routeAuthVerifyPendingWithEmail } from '../../routes.js';
import { AuthCard, AuthField, AuthSubmitButton } from './AuthCard.jsx';
import { ContinueWithGoogleButton } from './ContinueWithGoogleButton.jsx';
import {
  buildRegisterPayload,
  googleSignInErrorMessage,
  googleSignupCallbackPath,
  readFieldError,
  readPendingAuthFlags,
  safeLocalStorage,
  signupFailureMessage,
  signupFieldErrors,
} from './auth-pages.js';

export function SignUpPage() {
  const session = useSession();
  const i18n = useI18n();
  const t = (key, variables) => translateApp(i18n, key, variables);
  const [formError, setFormError] = createSignal('');
  const [googleBusy, setGoogleBusy] = createSignal(false);

  const form = createForm({
    initialValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validate: (values) => signupFieldErrors(values, t),
    onSubmit: async (values) => {
      try {
        await apiClient.post(AUTH_PATHS.register, buildRegisterPayload(values));
      } catch (error) {
        setFormError(signupFailureMessage(error));
        return;
      }
      navigate(routeAuthVerifyPendingWithEmail(values.email));
    },
  });

  function fieldMessage(name) {
    if (!getIn(form.touched(), name)) return '';
    return readFieldError(getIn(form.errors(), name));
  }

  function handleSubmit(event) {
    setFormError('');
    return form.handleSubmit(event);
  }

  async function handleGoogle() {
    if (googleBusy()) return;
    setGoogleBusy(true);
    setFormError('');
    try {
      await session.signIn('google');
      const flags = readPendingAuthFlags(safeLocalStorage());
      navigate(googleSignupCallbackPath(flags.hasPendingTrip));
    } catch (error) {
      setFormError(googleSignInErrorMessage(error, t));
    } finally {
      setGoogleBusy(false);
    }
  }

  return (
    <AuthCard title={t('auth.signUpTitle')}>
      <ContinueWithGoogleButton disabled={googleBusy()} onClick={handleGoogle}>
        {t('auth.continueWithGoogle')}
      </ContinueWithGoogleButton>
      <div class="relative">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-gray-300 dark:border-gray-700" />
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="bg-card px-2 text-gray-500">{t('common.or')}</span>
        </div>
      </div>
      <form class="space-y-4" novalidate onSubmit={handleSubmit}>
        <AuthField
          label={t('auth.name')}
          name="name"
          type="text"
          autocomplete="name"
          placeholder={t('auth.namePlaceholder')}
          value={form.values().name}
          onInput={form.handleChange}
          onBlur={form.handleBlur}
          error={fieldMessage('name')}
        />
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
        <Show when={formError()}>
          {(message) => <p class="text-sm text-red-600 dark:text-red-400">{message}</p>}
        </Show>
        <AuthSubmitButton disabled={form.isSubmitting()}>
          {t('auth.createAccount')}
        </AuthSubmitButton>
      </form>
      <p class="text-center text-sm text-gray-500 dark:text-gray-400">
        {t('auth.alreadyHaveAccount')}{' '}
        <Link
          href={ROUTE_AUTH_SIGNIN}
          class="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
        >
          {t('auth.signInLink')}
        </Link>
      </p>
    </AuthCard>
  );
}
