import {
  validateConfirmPassword,
  validateEmail,
  validateName,
  validatePassword,
} from '../../auth/validation.js';
import {
  ROUTE_AUTH_SIGNIN,
  ROUTE_AUTH_SIGNIN_QUIZ_PENDING,
  ROUTE_AUTH_SIGNIN_TRIP_PENDING,
  ROUTE_HOME,
} from '../../routes.js';

export const PENDING_TRIP_STORAGE_KEY = 'pendingTripGeneration';
export const PENDING_QUIZ_STORAGE_KEY = 'pendingQuiz';
export const VERIFY_SUCCESS_REDIRECT_MS = 3000;
export const VERIFY_PENDING_FLOW_REDIRECT_MS = 2000;

function definedErrors(errors) {
  const next = {};
  for (const [key, value] of Object.entries(errors)) {
    if (value) next[key] = value;
  }
  return next;
}

export function buildRegisterPayload(values = {}) {
  return {
    email: values.email,
    password: values.password,
    name: values.name,
  };
}

export function buildForgotPasswordPayload(email) {
  return { email };
}

export function buildResetPasswordPayload(token, newPassword) {
  return { token, newPassword };
}

export function buildVerifyPayload(token) {
  return { token };
}

export function buildResendVerificationPayload(email) {
  return { email };
}

export function readAuthToken(params) {
  const token = params?.get?.('token');
  if (typeof token !== 'string') return '';
  return token.trim();
}

export function readAuthEmail(params) {
  const email = params?.get?.('email');
  if (typeof email !== 'string' || email.length === 0) return '';
  try {
    return decodeURIComponent(email);
  } catch {
    return email;
  }
}

export function readFieldError(error) {
  if (error == null || error === '') return '';
  if (typeof error === 'function') {
    const message = error();
    return message == null ? '' : String(message);
  }
  return String(error);
}

export function signupFieldErrors(values, translate) {
  const name = values?.name ?? '';
  const email = values?.email ?? '';
  const password = values?.password ?? '';
  const confirmPassword = values?.confirmPassword ?? '';
  return definedErrors({
    name: validateName(name, translate),
    email: validateEmail(email, translate),
    password: validatePassword(password, translate),
    confirmPassword: validateConfirmPassword(password, confirmPassword, translate),
  });
}

export function forgotPasswordFieldErrors(values, translate) {
  return definedErrors({
    email: validateEmail(values?.email ?? '', translate),
  });
}

export function resetPasswordFieldErrors(values, translate) {
  const password = values?.password ?? '';
  const confirmPassword = values?.confirmPassword ?? '';
  return definedErrors({
    password: validatePassword(password, translate),
    confirmPassword: validateConfirmPassword(password, confirmPassword, translate),
  });
}

export function messageFromError(error, fallback) {
  if (typeof error === 'string' && error.trim()) return error;
  if (error && typeof error.message === 'string' && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

export function isRateLimited(error) {
  return Boolean(error && error.status === 429);
}

export function forgotPasswordFailureKey(status) {
  return status === 429 ? 'auth.tooManyPasswordResetAttempts' : 'toast.unexpectedError';
}

export function resetPasswordFailureMessage(error, translate) {
  if (isRateLimited(error)) return translate('auth.tooManyPasswordResetAttempts');
  return messageFromError(error, translate('auth.resetPasswordFailed'));
}

export function signupFailureMessage(error) {
  return messageFromError(error, 'An error occurred');
}

export function resendVerificationFailureMessage(error) {
  return messageFromError(error, 'Failed to resend verification email');
}

export function verifyFailureMessage(error, translate) {
  return messageFromError(error, translate('auth.invalidOrExpiredToken'));
}

export function googleSignInErrorMessage(error, translate) {
  return messageFromError(error, '') || translate('auth.googleSignInFailed');
}

export function isAlreadyVerifiedMessage(message) {
  return String(message ?? '').toLowerCase().includes('already verified');
}

export function verifySuccessMessageKey(alreadyVerified) {
  return alreadyVerified
    ? 'auth.emailAlreadyVerifiedSuccess'
    : 'auth.emailVerifiedSuccess';
}

export function verifyRedirectDelay(flags) {
  return flags?.hasPendingTrip || flags?.hasPendingQuiz
    ? VERIFY_PENDING_FLOW_REDIRECT_MS
    : VERIFY_SUCCESS_REDIRECT_MS;
}

export function verifyRedirectPath(flags) {
  if (flags?.hasPendingTrip) return ROUTE_AUTH_SIGNIN_TRIP_PENDING;
  if (flags?.hasPendingQuiz) return ROUTE_AUTH_SIGNIN_QUIZ_PENDING;
  return ROUTE_AUTH_SIGNIN;
}

export function googleSignupCallbackPath(hasPendingTrip) {
  return hasPendingTrip ? ROUTE_AUTH_SIGNIN_TRIP_PENDING : ROUTE_HOME;
}

export function verificationPendingCopy(state, translate) {
  const email = state?.email ?? '';
  if ((state?.emailFromSearch || state?.resent) && email) {
    return translate('auth.verificationPendingMessage', { email });
  }
  return translate('auth.checkEmailVerification');
}

function hasStoredRecord(storage, key) {
  if (!storage || typeof storage.getItem !== 'function') return false;
  try {
    const raw = storage.getItem(key);
    if (!raw) return false;
    return JSON.parse(raw) !== null;
  } catch {
    return false;
  }
}

export function readPendingAuthFlags(storage) {
  return {
    hasPendingTrip: hasStoredRecord(storage, PENDING_TRIP_STORAGE_KEY),
    hasPendingQuiz: hasStoredRecord(storage, PENDING_QUIZ_STORAGE_KEY),
  };
}

export function safeLocalStorage() {
  try {
    if (typeof globalThis.localStorage === 'undefined') return null;
    return globalThis.localStorage;
  } catch {
    return null;
  }
}
