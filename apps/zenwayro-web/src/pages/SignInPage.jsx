import { createSignal, Show } from 'grainlet';
import { useSession } from 'grainlet/auth';
import { createForm, getIn, matches, minLength, required } from 'grainlet/forms';
import { useI18n } from 'grainlet/i18n';
import { Link, navigate, useSearchParams } from 'grainlet/route';
import { resolveOAuthSignInError } from '../auth/oauthError.js';
import { EMAIL_RE, MIN_PASSWORD_LENGTH } from '../auth/validation.js';
import { translateApp } from '../i18n.js';
import {
  ROUTE_AUTH_FORGOT_PASSWORD,
  ROUTE_AUTH_SIGNUP,
  ROUTE_HOME,
} from '../routes.js';

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
    setFormError('');
    try {
      await session.signIn('google');
    } catch (error) {
      setFormError(errorText(error) || t('auth.googleSignInFailed'));
      return;
    }
    navigate(callbackPath(search()));
  }

  return (
    <section class="signin">
      <h1>{t('auth.signInTitle')}</h1>
      <Show when={search().get('tripPending') === 'true'}>
        <p class="signin-notice">{t('planGenerate.guestSignInBody')}</p>
      </Show>
      <button type="button" class="signin-google" onClick={handleGoogle}>
        {t('auth.continueWithGoogle')}
      </button>
      <p class="signin-divider">{t('common.or')}</p>
      <form class="signin-form" novalidate onSubmit={handleCredentialsSubmit}>
        <label class="signin-field">
          <span>{t('auth.email')}</span>
          <input
            name="email"
            type="email"
            autocomplete="email"
            placeholder={t('auth.emailPlaceholder')}
            value={form.values().email}
            onInput={form.handleChange}
            onBlur={form.handleBlur}
          />
          <Show when={fieldMessage('email')}>
            {(message) => <p class="signin-error">{message}</p>}
          </Show>
        </label>
        <label class="signin-field">
          <span>{t('auth.password')}</span>
          <input
            name="password"
            type="password"
            autocomplete="current-password"
            placeholder={t('auth.passwordPlaceholder')}
            value={form.values().password}
            onInput={form.handleChange}
            onBlur={form.handleBlur}
          />
          <Show when={fieldMessage('password')}>
            {(message) => <p class="signin-error">{message}</p>}
          </Show>
        </label>
        <div class="signin-aside">
          <Link href={ROUTE_AUTH_FORGOT_PASSWORD}>{t('auth.forgotPasswordLink')}</Link>
          <p class="signin-hint">{t('auth.signInOAuthHint')}</p>
        </div>
        <Show when={banner()}>
          {(message) => <p class="signin-error">{message}</p>}
        </Show>
        <button type="submit" disabled={form.isSubmitting()}>
          {t('nav.signIn')}
        </button>
      </form>
      <p class="signin-footer">
        {t('auth.dontHaveAccount')}{' '}
        <Link href={ROUTE_AUTH_SIGNUP}>{t('auth.signUpLink')}</Link>
      </p>
    </section>
  );
}
