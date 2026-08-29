import { getIn, setIn } from './utils/paths.js';

/** @typedef {(value: any, values: any, meta: { path: string }) => string|undefined|Promise<string|undefined>} Validator */

export function isEmptyValue(value) {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Normalize Field/rules validate prop into a single async validator.
 * Accepts a function, an array of validators, or undefined.
 * @param {Validator|Validator[]|undefined} validate
 * @returns {Validator|undefined}
 */
export function normalizeValidators(validate) {
  if (validate == null) return undefined;
  if (typeof validate === 'function') return validate;
  if (Array.isArray(validate)) {
    if (validate.length === 0) return undefined;
    return compose(...validate);
  }
  throw new Error(
    'grainlet/forms: validate/rules entry must be a function or an array of validators'
  );
}

/**
 * Run validators in order; return the first error message.
 * @param {...Validator} validators
 * @returns {Validator}
 */
export function compose(...validators) {
  const list = validators.filter(Boolean);
  return async (value, values, meta) => {
    for (const v of list) {
      let result = v(value, values, meta);
      if (result != null && typeof result.then === 'function') {
        result = await result;
      }
      if (result != null && result !== '') return result;
    }
    return undefined;
  };
}

/** Alias for compose. */
export const all = compose;

/**
 * @typedef {string | (() => string)} MessageInput
 * Lazy `() => t('key')` getters are stored on the form and resolved at display time.
 */
function resolveMessage(custom, fallback) {
  const raw = custom == null || custom === '' ? fallback : custom;
  return typeof raw === 'function' ? raw : raw;
}

/** Nullary fn from `() => t('key')` — not a field validator (which takes value). */
export function isLazyMessageGetter(fn) {
  return typeof fn === 'function' && fn.length === 0;
}

/**
 * Validator output for storage: plain strings or lazy message getters only.
 * Never store validator fns (e.g. `(value) => …` from `required()`).
 */
export function coerceValidationResult(result) {
  if (result == null || result === '') return undefined;
  if (typeof result === 'function') {
    if (isLazyMessageGetter(result)) return result;
    let resolved = result(undefined, undefined, { path: '' });
    if (resolved != null && typeof resolved.then === 'function') {
      return undefined;
    }
    return coerceValidationResult(resolved);
  }
  return typeof result === 'string' ? result : String(result);
}

/** Resolve a stored error (string or lazy getter) for display. */
export function formatError(error) {
  const resolved = coerceValidationResult(error);
  if (resolved == null || resolved === '') return undefined;
  if (isLazyMessageGetter(resolved)) return resolved();
  return typeof resolved === 'string' ? resolved : String(resolved);
}

/** Fails when value is empty (null, '', [], {}). */
export function required(message) {
  return (value) =>
    isEmptyValue(value) ? resolveMessage(message, 'Required') : undefined;
}

/** Alias — same as required(). */
export const isNotEmpty = required;

/** Fails when value is NOT empty. */
export function isEmpty(message) {
  return (value) =>
    !isEmptyValue(value)
      ? resolveMessage(message, 'Must be empty')
      : undefined;
}

const EMAIL_RE =
  /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

/** Fails when non-empty value is not an email. Empty passes (pair with required). */
export function isEmail(message) {
  return (value) => {
    if (isEmptyValue(value)) return undefined;
    return EMAIL_RE.test(String(value))
      ? undefined
      : resolveMessage(message, 'Invalid email');
  };
}

export const email = isEmail;

/** Fails when non-empty value is not a finite number (number or numeric string). */
export function isNumber(message) {
  return (value) => {
    if (isEmptyValue(value)) return undefined;
    if (typeof value === 'number') {
      return Number.isFinite(value)
        ? undefined
        : resolveMessage(message, 'Must be a number');
    }
    if (typeof value === 'string' && value.trim() !== '') {
      return Number.isFinite(Number(value))
        ? undefined
        : resolveMessage(message, 'Must be a number');
    }
    return resolveMessage(message, 'Must be a number');
  };
}

export const number = isNumber;

/** Fails when non-empty value is not an integer. */
export function isInteger(message) {
  return (value) => {
    if (isEmptyValue(value)) return undefined;
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isInteger(n)
      ? undefined
      : resolveMessage(message, 'Must be an integer');
  };
}

export const integer = isInteger;

export function minLength(min, message) {
  return (value) => {
    if (isEmptyValue(value)) return undefined;
    return String(value).length >= min
      ? undefined
      : resolveMessage(message, `Must be at least ${min} characters`);
  };
}

export function maxLength(max, message) {
  return (value) => {
    if (isEmptyValue(value)) return undefined;
    return String(value).length <= max
      ? undefined
      : resolveMessage(message, `Must be at most ${max} characters`);
  };
}

export function min(minVal, message) {
  return (value) => {
    if (isEmptyValue(value)) return undefined;
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) {
      return resolveMessage(message, `Must be at least ${minVal}`);
    }
    return n >= minVal
      ? undefined
      : resolveMessage(message, `Must be at least ${minVal}`);
  };
}

export function max(maxVal, message) {
  return (value) => {
    if (isEmptyValue(value)) return undefined;
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) {
      return resolveMessage(message, `Must be at most ${maxVal}`);
    }
    return n <= maxVal
      ? undefined
      : resolveMessage(message, `Must be at most ${maxVal}`);
  };
}

export function matches(regex, message) {
  const re = regex instanceof RegExp ? regex : new RegExp(regex);
  return (value) => {
    if (isEmptyValue(value)) return undefined;
    return re.test(String(value))
      ? undefined
      : resolveMessage(message, 'Invalid format');
  };
}

export const pattern = matches;

const URL_RE = /^(https?:\/\/)?([^\s.]+\.\S{2}|localhost[:\d]*)\S*$/i;

export function isUrl(message) {
  return (value) => {
    if (isEmptyValue(value)) return undefined;
    return URL_RE.test(String(value))
      ? undefined
      : resolveMessage(message, 'Invalid URL');
  };
}

export const url = isUrl;

export function oneOf(list, message) {
  return (value) => {
    if (isEmptyValue(value)) return undefined;
    return list.includes(value)
      ? undefined
      : resolveMessage(message, 'Invalid value');
  };
}

export function notOneOf(list, message) {
  return (value) => {
    if (isEmptyValue(value)) return undefined;
    return list.includes(value)
      ? resolveMessage(message, 'Invalid value')
      : undefined;
  };
}

/** Value must equal another field (e.g. password confirm). */
export function equalsField(otherPath, message) {
  return (value, values) => {
    const other = getIn(values, otherPath);
    return Object.is(value, other)
      ? undefined
      : resolveMessage(message, 'Values must match');
  };
}

/** Custom predicate: fail when test returns false. */
export function test(predicate, message) {
  return (value, values, meta) => {
    const fail = () => resolveMessage(message, 'Invalid value');
    const ok = predicate(value, values, meta);
    if (ok != null && typeof ok.then === 'function') {
      return ok.then((passed) => (passed ? undefined : fail()));
    }
    return ok ? undefined : fail();
  };
}

/**
 * Build a form-level validate() from a path → validator map.
 *
 *   rules({
 *     email: [required(), isEmail()],
 *     age: [required(), isNumber(), min(18)],
 *   })
 *
 * @param {Record<string, Validator|Validator[]>} map
 * @returns {(values: any) => Promise<Record<string, any>>}
 */
export function rules(map) {
  if (!map || typeof map !== 'object') {
    throw new Error('rules(): expected an object of field validators');
  }
  const entries = Object.entries(map).map(([path, v]) => [
    path,
    normalizeValidators(v),
  ]);

  return async (values) => {
    let errors = {};
    await Promise.all(
      entries.map(async ([path, validator]) => {
        if (!validator) return;
        const value = getIn(values, path);
        let result = validator(value, values, { path });
        if (result != null && typeof result.then === 'function') {
          result = await result;
        }
        if (result != null && result !== '') {
          errors = setIn(errors, path, coerceValidationResult(result));
        }
      })
    );
    return errors;
  };
}

/**
 * Run a rules map against values (same as rules(map)(values)).
 * @param {Record<string, Validator|Validator[]>} map
 * @param {any} values
 */
export async function runRules(map, values) {
  if (!map) return {};
  return rules(map)(values);
}
