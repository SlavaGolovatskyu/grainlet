export function toPath(path) {
  if (Array.isArray(path)) return path.slice();
  if (path == null || path === '') return [];
  const string = String(path);
  const quoted = string.match(/^\[\s*['"](.+)['"]\s*\]$/);
  if (quoted) return [quoted[1]];

  const parts = [];
  string.replace(
    /[^.[\]]+|\[(?:(-?\d+)|(['"])(.*?)\2)\]/g,
    (match, index, _quote, quotedKey) => {
      if (quotedKey !== undefined) parts.push(quotedKey);
      else if (index !== undefined) parts.push(Number(index));
      else parts.push(match);
      return match;
    }
  );
  return parts;
}

export function getIn(object, path, fallback = undefined) {
  const keys = toPath(path);
  let current = object;
  for (const key of keys) {
    if (current == null) return fallback;
    current = current[key];
  }
  return current === undefined ? fallback : current;
}

function cloneContainer(existing, nextKey) {
  if (typeof nextKey === 'number') {
    return Array.isArray(existing) ? existing.slice() : [];
  }
  if (existing !== null
    && typeof existing === 'object'
    && !Array.isArray(existing)) {
    return { ...existing };
  }
  return {};
}

function setOwn(object, key, value) {
  Object.defineProperty(object, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

export function setIn(object, path, value) {
  const keys = toPath(path);
  if (keys.length === 0) return value;

  const root = cloneContainer(object, keys[0]);
  let current = root;
  let source = object;

  for (let index = 0; index < keys.length - 1; index += 1) {
    const key = keys[index];
    const nextKey = keys[index + 1];
    const existing = source != null ? source[key] : undefined;
    const child = cloneContainer(existing, nextKey);
    setOwn(current, key, child);
    current = child;
    source = existing;
  }

  setOwn(current, keys[keys.length - 1], value);
  return root;
}
