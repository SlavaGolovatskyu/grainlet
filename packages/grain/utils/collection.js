const identity = (value) => value;

function assertIterable(items) {
  if (items == null || typeof items[Symbol.iterator] !== 'function') {
    throw new TypeError('Expected an iterable');
  }
}

function assertSelector(selector) {
  if (typeof selector !== 'function') {
    throw new TypeError('Expected a selector function');
  }
}

function defineEnumerable(object, key, value) {
  Object.defineProperty(object, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

export function compact(items) {
  assertIterable(items);
  return [...items].filter((value) => value !== null && value !== undefined);
}

export function pick(object, keys) {
  if (object == null) throw new TypeError('pick requires an object');
  assertIterable(keys);
  const result = {};
  for (const key of keys) {
    if (Object.prototype.propertyIsEnumerable.call(object, key)) {
      defineEnumerable(result, key, object[key]);
    }
  }
  return result;
}

export function omit(object, keys) {
  if (object == null) throw new TypeError('omit requires an object');
  assertIterable(keys);
  const omitted = new Set(keys);
  const result = {};
  for (const key of Reflect.ownKeys(Object(object))) {
    if (!omitted.has(key)
      && Object.prototype.propertyIsEnumerable.call(object, key)) {
      defineEnumerable(result, key, object[key]);
    }
  }
  return result;
}

export function groupBy(items, selector) {
  assertIterable(items);
  assertSelector(selector);
  const result = Object.create(null);
  let index = 0;
  for (const item of items) {
    const key = selector(item, index);
    if (!Object.prototype.hasOwnProperty.call(result, key)) result[key] = [];
    result[key].push(item);
    index += 1;
  }
  return result;
}

export function keyBy(items, selector) {
  assertIterable(items);
  assertSelector(selector);
  const result = Object.create(null);
  let index = 0;
  for (const item of items) {
    result[selector(item, index)] = item;
    index += 1;
  }
  return result;
}

export function uniqueBy(items, selector = identity) {
  assertIterable(items);
  assertSelector(selector);
  const seen = new Set();
  const result = [];
  let index = 0;
  for (const item of items) {
    const key = selector(item, index);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
    index += 1;
  }
  return result;
}
