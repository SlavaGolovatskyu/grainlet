import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  PENDING_QUIZ_STORAGE_KEY,
  PENDING_TRIP_STORAGE_KEY,
  buildForgotPasswordPayload,
  buildRegisterPayload,
  buildResendVerificationPayload,
  buildResetPasswordPayload,
  buildVerifyPayload,
  forgotPasswordFailureKey,
  forgotPasswordFieldErrors,
  googleSignInErrorMessage,
  googleSignupCallbackPath,
  isAlreadyVerifiedMessage,
  readAuthEmail,
  readAuthToken,
  readPendingAuthFlags,
  resendVerificationFailureMessage,
  resetPasswordFailureMessage,
  resetPasswordFieldErrors,
  signupFailureMessage,
  signupFieldErrors,
  verificationPendingCopy,
  verifyFailureMessage,
  verifyRedirectDelay,
  verifyRedirectPath,
  verifySuccessMessageKey,
} from '../src/pages/auth/auth-pages.js';
import {
  ROUTE_AUTH_SIGNIN,
  ROUTE_AUTH_SIGNIN_QUIZ_PENDING,
  ROUTE_AUTH_SIGNIN_TRIP_PENDING,
  ROUTE_HOME,
} from '../src/routes.js';

const t = (key, variables) =>
  variables ? `${key}:${JSON.stringify(variables)}` : key;

function params(query) {
  return new URLSearchParams(query);
}

test('register payload keeps email, password, and name only', () => {
  assert.deepEqual(
    buildRegisterPayload({
      email: 'ada@example.com',
      password: 'secret123',
      name: 'Ada',
      confirmPassword: 'secret123',
    }),
    { email: 'ada@example.com', password: 'secret123', name: 'Ada' }
  );
});

test('forgot, reset, verify, and resend payloads match the auth contract', () => {
  assert.deepEqual(buildForgotPasswordPayload('ada@example.com'), {
    email: 'ada@example.com',
  });
  assert.deepEqual(buildResetPasswordPayload('tok', 'secret123'), {
    token: 'tok',
    newPassword: 'secret123',
  });
  assert.deepEqual(buildVerifyPayload('tok'), { token: 'tok' });
  assert.deepEqual(buildResendVerificationPayload('ada@example.com'), {
    email: 'ada@example.com',
  });
});

test('readAuthToken and readAuthEmail parse search params', () => {
  assert.equal(readAuthToken(params('')), '');
  assert.equal(readAuthToken(params('token=%20%20')), '');
  assert.equal(readAuthToken(params('token=abc')), 'abc');
  assert.equal(readAuthToken(null), '');
  assert.equal(readAuthEmail(params('')), '');
  assert.equal(readAuthEmail(params('email=ada%40example.com')), 'ada@example.com');
  assert.equal(readAuthEmail(params('email=ada%2540example.com')), 'ada@example.com');
  assert.equal(readAuthEmail({ get: () => '%' }), '%');
});

test('signup, forgot, and reset field errors use the shared validators', () => {
  assert.deepEqual(signupFieldErrors({}, t), {
    name: 'auth.nameRequired',
    email: 'auth.emailRequired',
    password: 'auth.passwordRequired',
    confirmPassword: 'auth.confirmPasswordRequired',
  });
  assert.deepEqual(
    signupFieldErrors(
      {
        name: 'Ada',
        email: 'ada@example.com',
        password: 'secret123',
        confirmPassword: 'secret124',
      },
      t
    ),
    { confirmPassword: 'auth.passwordsDoNotMatch' }
  );
  assert.deepEqual(
    signupFieldErrors(
      {
        name: 'Ada',
        email: 'ada@example.com',
        password: 'secret123',
        confirmPassword: 'secret123',
      },
      t
    ),
    {}
  );
  assert.deepEqual(forgotPasswordFieldErrors({ email: 'nope' }, t), {
    email: 'auth.emailInvalid',
  });
  assert.deepEqual(
    resetPasswordFieldErrors({ password: 'secret123', confirmPassword: 'secret123' }, t),
    {}
  );
});

test('forgot and reset failures keep the source message keys', () => {
  assert.equal(forgotPasswordFailureKey(429), 'auth.tooManyPasswordResetAttempts');
  assert.equal(forgotPasswordFailureKey(500), 'toast.unexpectedError');
  assert.equal(
    resetPasswordFailureMessage({ status: 429, message: 'slow down' }, t),
    'auth.tooManyPasswordResetAttempts'
  );
  assert.equal(
    resetPasswordFailureMessage({ status: 400, message: 'Token expired' }, t),
    'Token expired'
  );
  assert.equal(resetPasswordFailureMessage(null, t), 'auth.resetPasswordFailed');
  assert.equal(signupFailureMessage({ message: 'Email taken' }), 'Email taken');
  assert.equal(signupFailureMessage(null), 'An error occurred');
  assert.equal(
    resendVerificationFailureMessage({ message: 'Already verified' }),
    'Already verified'
  );
  assert.equal(
    resendVerificationFailureMessage(null),
    'Failed to resend verification email'
  );
  assert.equal(googleSignInErrorMessage({ message: 'popup closed' }, t), 'popup closed');
  assert.equal(googleSignInErrorMessage(null, t), 'auth.googleSignInFailed');
});

test('verify success, already-verified, and redirect targets', () => {
  assert.equal(verifyFailureMessage({ message: 'bad token' }, t), 'bad token');
  assert.equal(verifyFailureMessage(null, t), 'auth.invalidOrExpiredToken');
  assert.equal(isAlreadyVerifiedMessage('Email is Already Verified'), true);
  assert.equal(isAlreadyVerifiedMessage('invalid token'), false);
  assert.equal(verifySuccessMessageKey(false), 'auth.emailVerifiedSuccess');
  assert.equal(verifySuccessMessageKey(true), 'auth.emailAlreadyVerifiedSuccess');
  assert.equal(verifyRedirectDelay({}), 3000);
  assert.equal(verifyRedirectDelay({ hasPendingQuiz: true }), 2000);
  assert.equal(verifyRedirectDelay({ hasPendingTrip: true }), 2000);
  assert.equal(verifyRedirectPath({}), ROUTE_AUTH_SIGNIN);
  assert.equal(
    verifyRedirectPath({ hasPendingQuiz: true, hasPendingTrip: true }),
    ROUTE_AUTH_SIGNIN_TRIP_PENDING
  );
  assert.equal(verifyRedirectPath({ hasPendingQuiz: true }), ROUTE_AUTH_SIGNIN_QUIZ_PENDING);
  assert.equal(googleSignupCallbackPath(false), ROUTE_HOME);
  assert.equal(googleSignupCallbackPath(true), ROUTE_AUTH_SIGNIN_TRIP_PENDING);
});

test('verification pending copy uses the email only after a search hit or resend', () => {
  assert.equal(
    verificationPendingCopy({ email: '', emailFromSearch: false, resent: false }, t),
    'auth.checkEmailVerification'
  );
  assert.equal(
    verificationPendingCopy(
      { email: 'ada@example.com', emailFromSearch: true, resent: false },
      t
    ),
    'auth.verificationPendingMessage:{"email":"ada@example.com"}'
  );
  assert.equal(
    verificationPendingCopy(
      { email: 'ada@example.com', emailFromSearch: false, resent: true },
      t
    ),
    'auth.verificationPendingMessage:{"email":"ada@example.com"}'
  );
});

test('pending auth flags follow stored quiz and trip records', () => {
  const storage = new Map();
  const adapter = {
    getItem: (key) => (storage.has(key) ? storage.get(key) : null),
  };
  assert.deepEqual(readPendingAuthFlags(adapter), {
    hasPendingTrip: false,
    hasPendingQuiz: false,
  });
  storage.set(PENDING_TRIP_STORAGE_KEY, JSON.stringify({ city: 'Lisbon' }));
  storage.set(PENDING_QUIZ_STORAGE_KEY, 'not-json');
  assert.deepEqual(readPendingAuthFlags(adapter), {
    hasPendingTrip: true,
    hasPendingQuiz: false,
  });
  storage.set(PENDING_QUIZ_STORAGE_KEY, JSON.stringify({ preferences: {} }));
  assert.equal(readPendingAuthFlags(adapter).hasPendingQuiz, true);
  storage.set(PENDING_TRIP_STORAGE_KEY, 'null');
  assert.equal(readPendingAuthFlags(adapter).hasPendingTrip, false);
  assert.deepEqual(readPendingAuthFlags(null), {
    hasPendingTrip: false,
    hasPendingQuiz: false,
  });
});
