import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  imageUploadFailureCopy,
  isImageValidationErrorMessage,
  MAX_PROFILE_IMAGE_SIZE_BYTES,
  profileImageProblem,
  profileImageProblemKeys,
  profileUpdateBody,
  settingsFieldId,
} from '../src/pages/settings/profile.js';
import {
  getSettingsSecurityCopy,
  resolveSettingsAuthProvider,
  SETTINGS_AUTH_PROVIDER,
} from '../src/pages/settings/security.js';
import {
  applyDocumentTheme,
  isThemeValue,
  readStoredTheme,
  resolveAppliedTheme,
  THEME_STORAGE_KEY,
} from '../src/pages/settings/theme.js';

const t = (key) => key;

test('profileUpdateBody trims name and username', () => {
  assert.deepEqual(profileUpdateBody({ name: '  Ada  ', username: ' ada_1 ' }), {
    name: 'Ada',
    username: 'ada_1',
  });
  assert.deepEqual(profileUpdateBody(null), { name: '', username: '' });
});

test('settingsFieldId matches the source label slug', () => {
  assert.equal(settingsFieldId('Full Name'), 'full-name');
  assert.equal(settingsFieldId('Username / Handle'), 'username-/-handle');
  assert.equal(settingsFieldId('Email Address'), 'email-address');
});

test('profile image problems map to the source validation keys', () => {
  assert.equal(profileImageProblem(null), null);
  assert.equal(profileImageProblem({ type: 'image/gif', size: 10 }), 'type');
  assert.equal(
    profileImageProblem({ type: 'image/jpeg', size: MAX_PROFILE_IMAGE_SIZE_BYTES + 1 }),
    'size'
  );
  assert.equal(
    profileImageProblem({ type: 'image/png', size: MAX_PROFILE_IMAGE_SIZE_BYTES }),
    null
  );
  assert.deepEqual(profileImageProblemKeys('type'), {
    title: 'settings.imageTypeInvalid',
    description: 'settings.imageTypeInvalidDescription',
  });
  assert.deepEqual(profileImageProblemKeys('size'), {
    title: 'settings.imageSizeExceeded',
    description: 'settings.imageSizeExceededDescription',
  });
  assert.equal(profileImageProblemKeys(null), null);
});

test('isImageValidationErrorMessage matches source image and size phrases', () => {
  assert.equal(isImageValidationErrorMessage('Only PNG and JPEG are allowed'), true);
  assert.equal(isImageValidationErrorMessage('Invalid image format'), true);
  assert.equal(isImageValidationErrorMessage('jpg not supported'), true);
  assert.equal(isImageValidationErrorMessage('File too large'), true);
  assert.equal(isImageValidationErrorMessage('Size must be under 2MB'), true);
  assert.equal(isImageValidationErrorMessage('Unauthorized'), false);
  assert.equal(isImageValidationErrorMessage('Network error'), false);
  assert.equal(isImageValidationErrorMessage(null), false);
});

test('imageUploadFailureCopy keeps API text and falls back to settings keys', () => {
  assert.deepEqual(imageUploadFailureCopy('File too large', true), {
    title: 'File too large',
    descriptionKey: 'settings.imageUploadFailedDescription',
  });
  assert.deepEqual(imageUploadFailureCopy('Unauthorized', true), {
    title: 'Unauthorized',
    descriptionKey: undefined,
  });
  assert.deepEqual(imageUploadFailureCopy('', false), {
    titleKey: 'settings.imageUploadFailed',
    descriptionKey: 'settings.imageUploadFailedDescription',
  });
});

test('resolveSettingsAuthProvider prefers the profile provider', () => {
  assert.equal(
    resolveSettingsAuthProvider(SETTINGS_AUTH_PROVIDER.GITHUB, 'google'),
    SETTINGS_AUTH_PROVIDER.GITHUB
  );
  assert.equal(
    resolveSettingsAuthProvider(undefined, 'credentials'),
    SETTINGS_AUTH_PROVIDER.LOCAL
  );
  assert.equal(
    resolveSettingsAuthProvider(undefined, 'google'),
    SETTINGS_AUTH_PROVIDER.GOOGLE
  );
  assert.equal(resolveSettingsAuthProvider(undefined, undefined), SETTINGS_AUTH_PROVIDER.LOCAL);
  assert.equal(resolveSettingsAuthProvider(undefined, 'unknown'), SETTINGS_AUTH_PROVIDER.LOCAL);
});

test('getSettingsSecurityCopy returns provider-specific settings keys', () => {
  assert.deepEqual(getSettingsSecurityCopy(SETTINGS_AUTH_PROVIDER.GOOGLE, t), {
    securityMethodTitle: 'settings.googleSignIn',
    securityMethodDescription: 'settings.googleManagedDescription',
    securityMethodBadge: 'G',
  });
  assert.deepEqual(getSettingsSecurityCopy(SETTINGS_AUTH_PROVIDER.GITHUB, t), {
    securityMethodTitle: 'settings.githubSignIn',
    securityMethodDescription: 'settings.githubManagedDescription',
    securityMethodBadge: 'GH',
  });
  assert.deepEqual(getSettingsSecurityCopy(SETTINGS_AUTH_PROVIDER.LOCAL, t), {
    securityMethodTitle: 'settings.localSignIn',
    securityMethodDescription: 'settings.localManagedDescription',
    securityMethodBadge: 'PW',
  });
});

test('theme storage accepts only light, dark, and system', () => {
  assert.equal(isThemeValue('light'), true);
  assert.equal(isThemeValue('dark'), true);
  assert.equal(isThemeValue('system'), true);
  assert.equal(isThemeValue('sepia'), false);
  const storage = {
    getItem(key) {
      assert.equal(key, THEME_STORAGE_KEY);
      return 'dark';
    },
  };
  assert.equal(readStoredTheme(storage), 'dark');
  assert.equal(readStoredTheme({ getItem: () => 'system' }), 'system');
  assert.equal(readStoredTheme({ getItem: () => null }), 'light');
  assert.equal(readStoredTheme({ getItem: () => 'sepia' }), 'light');
  assert.equal(
    readStoredTheme({
      getItem() {
        throw new Error('denied');
      },
    }),
    'light'
  );
});

test('resolveAppliedTheme and applyDocumentTheme toggle the dark class', () => {
  assert.equal(resolveAppliedTheme('light', true), 'light');
  assert.equal(resolveAppliedTheme('dark', false), 'dark');
  assert.equal(resolveAppliedTheme('system', true), 'dark');
  assert.equal(resolveAppliedTheme('system', false), 'light');
  assert.equal(resolveAppliedTheme('other', true), 'light');

  const classes = new Set(['dark']);
  const root = {
    classList: {
      add(name) {
        classes.add(name);
      },
      remove(name) {
        classes.delete(name);
      },
    },
  };
  applyDocumentTheme(root, 'light');
  assert.equal(classes.has('dark'), false);
  applyDocumentTheme(root, 'dark');
  assert.equal(classes.has('dark'), true);
  applyDocumentTheme(null, 'dark');
});
