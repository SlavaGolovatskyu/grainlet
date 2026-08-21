export const isObject = (value) =>
  value !== null && typeof value === 'object';

export function isPlainObject(value) {
  if (!isObject(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function functionalUpdate(updater, input) {
  return typeof updater === 'function' ? updater(input) : updater;
}

export function resolveValue(value, ...args) {
  return typeof value === 'function' ? value(...args) : value;
}

export function stableHash(value) {
  const seen = new WeakSet();
  return JSON.stringify(value, (_, current) => {
    if (!isObject(current)) return current;
    if (seen.has(current)) {
      throw new TypeError('Cannot hash circular values');
    }
    seen.add(current);
    if (!isPlainObject(current)) return current;
    return Object.keys(current)
      .sort()
      .reduce((result, name) => {
        result[name] = current[name];
        return result;
      }, {});
  });
}

export function partialMatch(candidate, filter) {
  if (candidate === filter) return true;
  if (typeof candidate !== typeof filter) return false;
  if (Array.isArray(filter)) {
    return Array.isArray(candidate)
      && filter.every((value, index) => partialMatch(candidate[index], value));
  }
  if (isPlainObject(filter)) {
    return isPlainObject(candidate)
      && Object.keys(filter).every((key) =>
        partialMatch(candidate[key], filter[key])
      );
  }
  return false;
}

export function replaceEqualDeep(previous, next) {
  if (previous === next) return previous;
  if (!Array.isArray(previous) && !isPlainObject(previous)) return next;
  if (Array.isArray(previous) !== Array.isArray(next)) return next;
  if (!Array.isArray(next) && !isPlainObject(next)) return next;
  const previousKeys = Object.keys(previous);
  const nextKeys = Object.keys(next);
  const result = Array.isArray(next) ? [] : {};
  let equal = previousKeys.length === nextKeys.length;
  for (const key of nextKeys) {
    result[key] = replaceEqualDeep(previous[key], next[key]);
    if (result[key] !== previous[key]) equal = false;
  }
  return equal ? previous : result;
}

function isTypedArrayValue(value) {
  return ArrayBuffer.isView(value) && !(value instanceof DataView);
}

export function deepEqual(left, right) {
  const leftToRight = new WeakMap();
  const rightToLeft = new WeakMap();

  const compare = (a, b) => {
    if (Object.is(a, b)) return true;
    if (!isObject(a) || !isObject(b)) return false;

    if (leftToRight.has(a)) return leftToRight.get(a) === b;
    if (rightToLeft.has(b)) return false;
    leftToRight.set(a, b);
    rightToLeft.set(b, a);

    if (a instanceof Date || b instanceof Date) {
      return a instanceof Date
        && b instanceof Date
        && Object.is(a.getTime(), b.getTime());
    }

    if (a instanceof RegExp || b instanceof RegExp) {
      return a instanceof RegExp
        && b instanceof RegExp
        && a.source === b.source
        && a.flags === b.flags;
    }

    if (a instanceof ArrayBuffer || b instanceof ArrayBuffer) {
      if (!(a instanceof ArrayBuffer) || !(b instanceof ArrayBuffer)) return false;
      if (a.byteLength !== b.byteLength) return false;
      const leftBytes = new Uint8Array(a);
      const rightBytes = new Uint8Array(b);
      return leftBytes.every((value, index) => value === rightBytes[index]);
    }

    if (isTypedArrayValue(a) || isTypedArrayValue(b)) {
      if (!isTypedArrayValue(a)
        || !isTypedArrayValue(b)
        || a.constructor !== b.constructor
        || a.length !== b.length) {
        return false;
      }
      for (let index = 0; index < a.length; index += 1) {
        if (!Object.is(a[index], b[index])) return false;
      }
      return true;
    }

    if (a instanceof Map || b instanceof Map) {
      if (!(a instanceof Map) || !(b instanceof Map) || a.size !== b.size) {
        return false;
      }
      for (const [key, value] of a) {
        if (!b.has(key) || !compare(value, b.get(key))) return false;
      }
      return true;
    }

    if (a instanceof Set || b instanceof Set) {
      if (!(a instanceof Set) || !(b instanceof Set) || a.size !== b.size) {
        return false;
      }
      for (const value of a) {
        if (!b.has(value)) return false;
      }
      return true;
    }

    if (Array.isArray(a) || Array.isArray(b)) {
      if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
        return false;
      }
      for (let index = 0; index < a.length; index += 1) {
        if (!compare(a[index], b[index])) return false;
      }
      return true;
    }

    if (!isPlainObject(a) || !isPlainObject(b)) return false;
    if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;

    const leftKeys = Object.keys(a);
    const rightKeys = Object.keys(b);
    if (leftKeys.length !== rightKeys.length) return false;
    for (const key of leftKeys) {
      if (!Object.prototype.hasOwnProperty.call(b, key)
        || !compare(a[key], b[key])) {
        return false;
      }
    }
    return true;
  };

  return compare(left, right);
}

export function deepClone(value) {
  const clones = new WeakMap();

  const clone = (input) => {
    if (!isObject(input)) return input;
    if (clones.has(input)) return clones.get(input);

    if (input instanceof Date) return new Date(input.getTime());
    if (input instanceof RegExp) return new RegExp(input.source, input.flags);
    if (input instanceof ArrayBuffer) return input.slice(0);
    if (isTypedArrayValue(input)) return new input.constructor(input);

    if (input instanceof Map) {
      const output = new Map();
      clones.set(input, output);
      for (const [key, item] of input) output.set(clone(key), clone(item));
      return output;
    }

    if (input instanceof Set) {
      const output = new Set();
      clones.set(input, output);
      for (const item of input) output.add(clone(item));
      return output;
    }

    if (Array.isArray(input)) {
      const output = new Array(input.length);
      clones.set(input, output);
      for (const key of Object.keys(input)) output[key] = clone(input[key]);
      return output;
    }

    if (!isPlainObject(input)) return input;
    const output = Object.create(Object.getPrototypeOf(input));
    clones.set(input, output);
    for (const key of Object.keys(input)) output[key] = clone(input[key]);
    return output;
  };

  return clone(value);
}
