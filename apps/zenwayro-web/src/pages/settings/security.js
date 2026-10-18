export const SETTINGS_AUTH_PROVIDERS = ['local', 'google', 'github'];

export const SETTINGS_AUTH_PROVIDER = {
  LOCAL: 'local',
  GOOGLE: 'google',
  GITHUB: 'github',
};

function isSettingsAuthProvider(value) {
  return SETTINGS_AUTH_PROVIDERS.includes(value);
}

export function resolveSettingsAuthProvider(meProvider, sessionProvider) {
  const fromSession =
    sessionProvider === 'credentials'
      ? SETTINGS_AUTH_PROVIDER.LOCAL
      : sessionProvider && isSettingsAuthProvider(sessionProvider)
        ? sessionProvider
        : undefined;

  return meProvider ?? fromSession ?? SETTINGS_AUTH_PROVIDER.LOCAL;
}

export function getSettingsSecurityCopy(provider, t) {
  if (provider === SETTINGS_AUTH_PROVIDER.GOOGLE) {
    return {
      securityMethodTitle: t('settings.googleSignIn'),
      securityMethodDescription: t('settings.googleManagedDescription'),
      securityMethodBadge: 'G',
    };
  }

  if (provider === SETTINGS_AUTH_PROVIDER.GITHUB) {
    return {
      securityMethodTitle: t('settings.githubSignIn'),
      securityMethodDescription: t('settings.githubManagedDescription'),
      securityMethodBadge: 'GH',
    };
  }

  return {
    securityMethodTitle: t('settings.localSignIn'),
    securityMethodDescription: t('settings.localManagedDescription'),
    securityMethodBadge: 'PW',
  };
}
