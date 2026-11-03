import { createSignal, Show } from 'grainlet';
import { useSession } from 'grainlet/auth';
import { createForm, getIn, matches, minLength, required } from 'grainlet/forms';
import { useI18n } from 'grainlet/i18n';
import { Link, navigate, useSearchParams } from 'grainlet/route';
import { resolveOAuthSignInError } from '../../auth/oauthError.js';
import { EMAIL_RE, MIN_PASSWORD_LENGTH } from '../../auth/validation.js';
import { translateApp } from '../../i18n.js';
import {
  ROUTE_AUTH_FORGOT_PASSWORD,
  ROUTE_AUTH_SIGNUP,
  ROUTE_HOME,
} from '../../routes.js';
import { AuthCard, AuthField, AuthSubmitButton } from './AuthCard.jsx';
import { ContinueWithGoogleButton } from './ContinueWithGoogleButton.jsx';

function callbackPath(params) {
  const callbackUrl = params.get('callbackUrl');
  if (
    typeof callbackUrl === 'string' &&
    callbackUrl.startsWith('/') &&
    !callbackUrl.startsWith('//')
  ) {
    return callbackUrl;
  }
  return ROUTE_HOME;
}

function errorText(error) {
  if (typeof error === 'string') return error;
  if (error && typeof error.message === 'string') return error.message;
  return '';
}

function isVerificationSignInError(error) {
  const haystack = `${errorText(error)}\n${errorText(error?.cause)}`.toLowerCase();
  return haystack.includes('verify') || haystack.includes('verification');
}

function readFieldError(error) {
  if (error == null || error === '') return '';
  if (typeof error === 'function') {
    const message = error();
    return message == null ? '' : String(message);
  }
  return String(error);
}

export function SignInPage() {
  const session = useSession();
  const i18n = useI18n();
  const [search] = useSearchParams();
  const [formError, setFormError] = createSignal(null);
  const [googleBusy, setGoogleBusy] = createSignal(false);
  const t = (key) => translateApp(i18n, key);

  const form = createForm({
    initialValues: { email: '', password: '' },
    rules: {
      email: [
        required(() => t('auth.emailRequired')),
        matches(EMAIL_RE, () => t('auth.emailInvalid')),
      ],
      password: [
        required(() => t('auth.passwordRequired')),
        minLength(MIN_PASSWORD_LENGTH, () => t('auth.passwordTooShort')),
      ],
    },
    onSubmit: async (values) => {
      try {
        await session.signIn('credentials', {
          email: values.email,
          password: values.password,
        });
      } catch (error) {
        setFormError(
          isVerificationSignInError(error)
            ? t('auth.pleaseVerifyEmail')
            : t('auth.invalidCredentials')
        );
        return;
      }
      navigate(callbackPath(search()));
    },
  });

  function fieldMessage(name) {
    if (!getIn(form.touched(), name)) return '';
    return readFieldError(getIn(form.errors(), name));
  }

  function banner() {
    const explicit = formError();
    if (explicit != null) return explicit;
    const code = search().get('error');
    if (!code) return '';
    return resolveOAuthSignInError(code, t);
  }

  function handleCredentialsSubmit(event) {
    setFormError(null);
    return form.handleSubmit(event);
  }

  async function handleGoogle() {
    if (googleBusy()) return;
    setGoogleBusy(true);
    setFormError('');
    try {
      await session.signIn('google');
    } catch (error) {
      setFormError(errorText(error) || t('auth.googleSignInFailed'));
      return;
    } finally {
      setGoogleBusy(false);
    }
    navigate(callbackPath(search()));
  }

  return (
    <AuthCard title={t('auth.signInTitle')}>
      <Show when={search().get('tripPending') === 'true'}>
        <p class="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-900">
          {t('planGenerate.guestSignInBody')}
        </p>
      </Show>

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

      <form class="space-y-4" novalidate onSubmit={handleCredentialsSubmit}>
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
          autocomplete="current-password"
          placeholder={t('auth.passwordPlaceholder')}
          value={form.values().password}
          onInput={form.handleChange}
          onBlur={form.handleBlur}
          error={fieldMessage('password')}
        />
        <div class="space-y-1 text-right">
          <Link
            href={ROUTE_AUTH_FORGOT_PASSWORD}
            class="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            {t('auth.forgotPasswordLink')}
          </Link>
          <p class="text-xs text-gray-500 dark:text-gray-400">{t('auth.signInOAuthHint')}</p>
        </div>
        <Show when={banner()}>
          {(message) => <p class="text-sm text-red-600 dark:text-red-400">{message}</p>}
        </Show>
        <AuthSubmitButton disabled={form.isSubmitting() || googleBusy()}>
          {t('nav.signIn')}
        </AuthSubmitButton>
      </form>

      <p class="text-center text-sm text-gray-500 dark:text-gray-400">
        {t('auth.dontHaveAccount')}{' '}
        <Link
          href={ROUTE_AUTH_SIGNUP}
          class="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
        >
          {t('auth.signUpLink')}
        </Link>
      </p>
    </AuthCard>
  );
}
