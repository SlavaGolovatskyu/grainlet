export {
  deepClone,
  deepEqual,
  getIn,
  setIn,
  toPath,
} from '../../utils/index.js';

/** Build a touched map mirroring values shape (all true). */
export function touchAll(values, value = true) {
  if (values == null || typeof values !== 'object') return {};
  if (Array.isArray(values)) {
    return values.map((item) =>
      item != null && typeof item === 'object' ? touchAll(item, value) : value
    );
  }
  const out = {};
  for (const key of Object.keys(values)) {
    const v = values[key];
    out[key] =
      v != null && typeof v === 'object' ? touchAll(v, value) : value;
  }
  return out;
}

/** True if errors object has any string (or nested) error. */
export function hasErrors(errors) {
  if (errors == null) return false;
  if (typeof errors === 'string') return errors.length > 0;
  if (Array.isArray(errors)) return errors.some(hasErrors);
  if (typeof errors === 'object') {
    return Object.keys(errors).some((k) => hasErrors(errors[k]));
  }
  return false;
}

/**
 * Deep-merge error objects. Prefer later sources. Skip undefined.
 * @param {...unknown} sources
 */
export function mergeErrors(...sources) {
  let result = {};
  for (const src of sources) {
    if (src == null) continue;
    result = mergeErrorsPair(result, src);
  }
  return result;
}

function mergeErrorsPair(a, b) {
  if (b == null || b === undefined) return a;
  if (typeof b === 'string') return b;
  if (typeof a !== 'object' || a == null || typeof b !== 'object') return b;

  if (Array.isArray(b)) {
    const base = Array.isArray(a) ? a.slice() : [];
    const len = Math.max(base.length, b.length);
    const out = [];
    for (let i = 0; i < len; i++) {
      if (b[i] === undefined) out[i] = base[i];
      else if (base[i] === undefined) out[i] = b[i];
      else out[i] = mergeErrorsPair(base[i], b[i]);
    }
    return out;
  }

  const out = { ...a };
  for (const key of Object.keys(b)) {
    if (b[key] === undefined) continue;
    out[key] =
      out[key] === undefined ? b[key] : mergeErrorsPair(out[key], b[key]);
  }
  return out;
}
