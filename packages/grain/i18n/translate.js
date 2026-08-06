export function getTranslation(dictionary, key) {
  if (!dictionary || typeof key !== 'string') return undefined;

  let value = dictionary;
  for (const segment of key.split('.')) {
    if (
      value === null ||
      typeof value !== 'object' ||
      !Object.prototype.hasOwnProperty.call(value, segment)
    ) {
      return undefined;
    }
    value = value[segment];
  }

  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : undefined;
}

export function interpolate(message, variables = {}) {
  return message.replace(/\{([^{}]+)\}/g, (placeholder, name) =>
    Object.prototype.hasOwnProperty.call(variables, name)
      ? String(variables[name])
      : placeholder
  );
}

export function translate(dictionary, key, variables) {
  const message = getTranslation(dictionary, key);
  return message === undefined ? undefined : interpolate(message, variables);
}
