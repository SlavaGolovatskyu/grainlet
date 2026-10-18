import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveOAuthSignInError } from '../src/auth/oauthError.js';
import {
  MIN_PASSWORD_LENGTH,
  validateConfirmPassword,
  validateEmail,
  validateName,
  validatePassword,
} from '../src/auth/validation.js';

const t = (key) => key;

test('validateEmail rejects empty and invalid addresses', () => {
  assert.equal(validateEmail('', t), 'auth.emailRequired');
  assert.equal(validateEmail('   ', t), 'auth.emailRequired');
  assert.equal(validateEmail('not-an-email', t), 'auth.emailInvalid');
  assert.equal(validateEmail('a@b', t), 'auth.emailInvalid');
  assert.equal(validateEmail('a@b.c', t), undefined);
});

test('validatePassword enforces presence and minimum length', () => {
  assert.equal(validatePassword('', t), 'auth.passwordRequired');
  assert.equal(validatePassword('short', t), 'auth.passwordTooShort');
  assert.equal(validatePassword('x'.repeat(MIN_PASSWORD_LENGTH - 1), t), 'auth.passwordTooShort');
  assert.equal(validatePassword('x'.repeat(MIN_PASSWORD_LENGTH), t), undefined);
});

test('validateName and validateConfirmPassword', () => {
  assert.equal(validateName(' ', t), 'auth.nameRequired');
  assert.equal(validateName('A', t), 'auth.nameTooShort');
  assert.equal(validateName('Ada', t), undefined);
  assert.equal(validateConfirmPassword('secret12', '', t), 'auth.confirmPasswordRequired');
  assert.equal(
    validateConfirmPassword('secret12', 'secret13', t),
    'auth.passwordsDoNotMatch'
  );
  assert.equal(validateConfirmPassword('secret12', 'secret12', t), undefined);
});

test('resolveOAuthSignInError maps known codes and falls back', () => {
  assert.equal(
    resolveOAuthSignInError('BackendSync', t),
    'auth.googleSignInBackendSyncFailed'
  );
  assert.equal(
    resolveOAuthSignInError('GoogleIdToken', t),
    'auth.googleSignInNoIdToken'
  );
  assert.equal(
    resolveOAuthSignInError('Configuration', t),
    'auth.googleSignInConfigError'
  );
  assert.equal(
    resolveOAuthSignInError('Callback', t),
    'auth.googleSignInConfigError'
  );
  assert.equal(resolveOAuthSignInError('Other', t), 'auth.googleSignInFailed');
  assert.equal(resolveOAuthSignInError(null, t), 'auth.googleSignInFailed');
});
