function assertProviderConfig(type, config) {
  if (!config || typeof config.authorize !== 'function') {
    throw new TypeError(`${type}: authorize must be a function`);
  }
}

export function Credentials(config) {
  assertProviderConfig('Credentials', config);
  return {
    id: config.id ?? 'credentials',
    name: config.name ?? 'Credentials',
    type: 'credentials',
    credentials: config.credentials ?? {},
    authorize: config.authorize,
  };
}

export function Google(config) {
  assertProviderConfig('Google', config);
  if (config.getIdToken != null && typeof config.getIdToken !== 'function') {
    throw new TypeError('Google: getIdToken must be a function');
  }

  return {
    id: config.id ?? 'google',
    name: config.name ?? 'Google',
    type: 'oauth',
    async authorize(input = {}, context) {
      const supplied =
        typeof input === 'string' ? input : input?.idToken;
      const idToken =
        supplied ?? (await config.getIdToken?.(input, context));

      if (!idToken) {
        throw new Error(
          'Google: an idToken or getIdToken callback is required'
        );
      }

      return config.authorize(
        {
          ...(typeof input === 'object' && input ? input : {}),
          idToken,
        },
        context
      );
    },
  };
}
