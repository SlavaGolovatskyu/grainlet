export function resolveOAuthSignInError(errorCode, t) {
  if (errorCode === 'BackendSync') {
    return t('auth.googleSignInBackendSyncFailed');
  }
  if (errorCode === 'GoogleIdToken') {
    return t('auth.googleSignInNoIdToken');
  }
  if (errorCode === 'Configuration' || errorCode === 'Callback') {
    return t('auth.googleSignInConfigError');
  }
  return t('auth.googleSignInFailed');
}
