import assert from 'node:assert/strict';
import {
  FocusManager,
  OnlineManager,
  Subscribable,
  compact,
  debounce,
  deepClone,
  deepEqual,
  exponentialBackoffDelay,
  focusManager,
  functionalUpdate,
  getIn,
  groupBy,
  identity,
  isAbortError,
  isBoolean,
  isDate,
  isDefined,
  isFunction,
  isMap,
  isNullish,
  isNumber,
  isObject,
  isPlainObject,
  isPromiseLike,
  isRegExp,
  isSet,
  isString,
  isTypedArray,
  keyBy,
  noop,
  omit,
  once,
  onlineManager,
  partialMatch,
  pick,
  replaceEqualDeep,
  resolveValue,
  setIn,
  sleep,
  stableHash,
  throttle,
  throwIfAborted,
  toPath,
  uniqueBy,
  withTimeout,
} from '../utils/index.js';
import {
  focusManager as queryFocusManager,
  hashKey,
  onlineManager as queryOnlineManager,
  partialMatchKey,
  replaceEqualDeep as queryReplaceEqualDeep,
} from '../query/index.js';

assert.equal(isObject({}), true);
assert.equal(isObject(null), false);
assert.equal(isPlainObject(Object.create(null)), true);
assert.equal(isPlainObject(new Date()), false);
assert.equal(functionalUpdate((value) => value + 2, 3), 5);
assert.equal(functionalUpdate(8, 3), 8);
assert.equal(resolveValue((a, b) => a + b, 2, 4), 6);
assert.equal(resolveValue('literal'), 'literal');

const left = ['todos', { page: 1, status: 'open' }];
const right = ['todos', { status: 'open', page: 1 }];
assert.equal(stableHash(left), stableHash(right));
assert.equal(hashKey(left), stableHash(left), 'query hashing keeps its public alias');
const circular = {};
circular.self = circular;
assert.throws(() => stableHash(circular), /Cannot hash circular values/);

assert.equal(partialMatch(['todos', { page: 2 }], ['todos']), true);
assert.equal(
  partialMatch({ filters: { page: 2, status: 'open' } }, { filters: { page: 2 } }),
  true
);
assert.equal(partialMatchKey(['todos', 1], ['users']), false);

const previous = {
  items: [{ id: 1, title: 'Stable' }],
  page: 1,
};
const shared = replaceEqualDeep(previous, {
  items: [{ id: 1, title: 'Stable' }],
  page: 2,
});
assert.equal(shared.items, previous.items);
assert.notEqual(shared, previous);
assert.equal(queryReplaceEqualDeep, replaceEqualDeep);

assert.equal(deepEqual(NaN, NaN), true);
assert.equal(deepEqual(0, -0), false);
assert.equal(deepEqual({ a: 1, b: [2] }, { b: [2], a: 1 }), true);
assert.equal(deepEqual(new Date(10), new Date(10)), true);
assert.equal(deepEqual(new Date(10), new Date(11)), false);
assert.equal(deepEqual(/grain/gi, /grain/gi), true);
assert.equal(deepEqual(/grain/g, /grain/i), false);
assert.equal(
  deepEqual(new Uint16Array([1, 2]), new Uint16Array([1, 2])),
  true
);
assert.equal(
  deepEqual(new Uint16Array([1, 2]), new Uint16Array([2, 1])),
  false
);
assert.equal(
  deepEqual(
    new Uint8Array([1, 2]).buffer,
    new Uint8Array([1, 2]).buffer
  ),
  true
);
assert.equal(
  deepEqual(new Map([['key', { value: 1 }]]), new Map([['key', { value: 1 }]])),
  true
);
assert.equal(deepEqual(new Set(['a', 'b']), new Set(['b', 'a'])), true);

const cycleA = { name: 'cycle' };
const cycleB = { name: 'cycle' };
cycleA.self = cycleA;
cycleB.self = cycleB;
assert.equal(deepEqual(cycleA, cycleB), true);
cycleB.name = 'different';
assert.equal(deepEqual(cycleA, cycleB), false);

class Model {
  constructor(id) {
    this.id = id;
  }
}
assert.equal(deepEqual(new Model(1), new Model(1)), false);

const cloneSource = {
  buffer: new Uint8Array([1, 2]),
  createdAt: new Date(42),
  expression: /clone/gi,
  map: new Map([['item', { id: 1 }]]),
  set: new Set([{ id: 2 }]),
};
cloneSource.self = cloneSource;
const cloned = deepClone(cloneSource);
assert.notEqual(cloned, cloneSource);
assert.equal(cloned.self, cloned);
assert.notEqual(cloned.createdAt, cloneSource.createdAt);
assert.equal(cloned.createdAt.getTime(), 42);
assert.notEqual(cloned.buffer, cloneSource.buffer);
assert.deepEqual([...cloned.buffer], [1, 2]);
assert.notEqual(cloned.map.get('item'), cloneSource.map.get('item'));
assert.notEqual([...cloned.set][0], [...cloneSource.set][0]);

const nullPrototype = Object.create(null);
nullPrototype.value = { nested: true };
const nullClone = deepClone(nullPrototype);
assert.equal(Object.getPrototypeOf(nullClone), null);
assert.equal(deepEqual(nullPrototype, nullClone), true);
const sparse = new Array(2);
sparse[1] = 'value';
const sparseClone = deepClone(sparse);
assert.equal(0 in sparseClone, false);
assert.equal(sparseClone[1], 'value');

assert.deepEqual(toPath('users[0].profile["display.name"]'), [
  'users',
  0,
  'profile',
  'display.name',
]);
const pathSource = { users: [{ name: 'Ada', active: true }] };
assert.equal(getIn(pathSource, 'users[0].name'), 'Ada');
assert.equal(getIn(pathSource, 'missing', 'fallback'), 'fallback');
const pathResult = setIn(pathSource, 'users[0].name', 'Grace');
assert.equal(getIn(pathResult, 'users[0].name'), 'Grace');
assert.equal(getIn(pathSource, 'users[0].name'), 'Ada');
assert.notEqual(pathResult.users, pathSource.users);
const safePath = setIn({}, ['__proto__', 'safe'], true);
assert.equal(Object.getPrototypeOf(safePath), Object.prototype);
assert.equal(safePath.__proto__.safe, true);
assert.equal(Object.prototype.safe, undefined);

assert.equal(isDefined(0), true);
assert.equal(isDefined(null), false);
assert.equal(isNullish(undefined), true);
assert.equal(isString('grainlet'), true);
assert.equal(isNumber(NaN), true);
assert.equal(isBoolean(false), true);
assert.equal(isFunction(() => {}), true);
assert.equal(isDate(new Date()), true);
assert.equal(isRegExp(/x/), true);
assert.equal(isMap(new Map()), true);
assert.equal(isSet(new Set()), true);
assert.equal(isTypedArray(new Uint8Array()), true);
assert.equal(isTypedArray(new DataView(new ArrayBuffer(1))), false);
assert.equal(isPromiseLike(Promise.resolve()), true);
assert.equal(isPromiseLike({ then() {} }), true);
assert.equal(isPromiseLike(null), false);

assert.deepEqual(compact([0, null, false, undefined, 'value']), [
  0,
  false,
  'value',
]);
assert.deepEqual(pick({ id: 1, secret: true }, ['id']), { id: 1 });
assert.deepEqual(omit({ id: 1, secret: true }, ['secret']), { id: 1 });
const grouped = groupBy(
  [{ id: 1, type: '__proto__' }, { id: 2, type: 'other' }],
  (item) => item.type
);
assert.equal(Object.getPrototypeOf(grouped), null);
assert.deepEqual(grouped.__proto__.map((item) => item.id), [1]);
const keyed = keyBy([{ id: 'a' }, { id: 'a', latest: true }], (item) => item.id);
assert.equal(keyed.a.latest, true);
assert.deepEqual(
  uniqueBy([{ id: 1 }, { id: 1 }, { id: 2 }], (item) => item.id),
  [{ id: 1 }, { id: 2 }]
);
assert.deepEqual(uniqueBy([1, 1, 2]), [1, 2]);
assert.equal(identity('same'), 'same');
assert.equal(noop('ignored'), undefined);

assert.equal(await sleep(0, 'ready'), 'ready');
assert.equal(exponentialBackoffDelay(0), 1000);
assert.equal(exponentialBackoffDelay(5), 30000);
assert.equal(
  exponentialBackoffDelay(3, { base: 100, factor: 2, maximum: 1000 }),
  800
);

let onceCalls = 0;
const initialize = once((value) => {
  onceCalls += 1;
  if (onceCalls === 1) throw new Error('retry');
  return value * 2;
});
assert.throws(() => initialize(2), /retry/);
assert.equal(initialize(3), 6);
assert.equal(initialize(4), 6);
assert.equal(onceCalls, 2);

const debouncedCalls = [];
const debounced = debounce((value) => {
  debouncedCalls.push(value);
  return value;
}, 10);
debounced('first');
debounced('last');
assert.equal(debounced.pending(), true);
await sleep(20);
assert.deepEqual(debouncedCalls, ['last']);
assert.equal(debounced.pending(), false);
debounced('cancelled');
debounced.cancel();
await sleep(15);
assert.deepEqual(debouncedCalls, ['last']);
debounced('flushed');
assert.equal(debounced.flush(), 'flushed');
assert.deepEqual(debouncedCalls, ['last', 'flushed']);

const throttledCalls = [];
const throttled = throttle((value) => throttledCalls.push(value), 10);
throttled('leading');
throttled('trailing');
await sleep(20);
assert.deepEqual(throttledCalls, ['leading', 'trailing']);
throttled.cancel();

assert.equal(await withTimeout(Promise.resolve('fast'), 20), 'fast');
await assert.rejects(
  withTimeout(new Promise(() => {}), 5),
  (error) => error?.name === 'TimeoutError'
);
const customTimeout = new Error('custom timeout');
await assert.rejects(
  withTimeout(new Promise(() => {}), 5, { reason: customTimeout }),
  (error) => error === customTimeout
);
const abortController = new AbortController();
abortController.abort();
assert.throws(
  () => throwIfAborted(abortController.signal),
  (error) => isAbortError(error)
);
await assert.rejects(
  withTimeout(new Promise(() => {}), 20, {
    signal: abortController.signal,
  }),
  (error) => isAbortError(error)
);

class LifecycleBus extends Subscribable {
  subscribed = 0;
  unsubscribed = 0;
  onSubscribe() {
    this.subscribed += 1;
  }
  onUnsubscribe() {
    this.unsubscribed += 1;
  }
}

const bus = new LifecycleBus();
const received = [];
const unsubscribe = bus.subscribe((value) => received.push(value));
bus.notify('first');
unsubscribe();
unsubscribe();
bus.notify('ignored');
assert.deepEqual(received, ['first']);
assert.equal(bus.subscribed, 1);
assert.equal(bus.unsubscribed, 1);
assert.throws(() => bus.subscribe(null), /listener function/);

const focus = new FocusManager();
const focusEvents = [];
const stopFocus = focus.subscribe((value) => focusEvents.push(value));
focus.setFocused(false);
focus.setFocused(true);
focus.setFocused(undefined);
stopFocus();
assert.deepEqual(focusEvents.slice(0, 2), [false, true]);
assert.equal(typeof focusEvents[2], 'boolean');

const online = new OnlineManager();
const onlineEvents = [];
const stopOnline = online.subscribe((value) => onlineEvents.push(value));
online.setOnline(false);
online.setOnline(true);
stopOnline();
assert.deepEqual(onlineEvents, [false, true]);
assert.throws(() => online.setOnline('yes'), /boolean/);

assert.equal(queryFocusManager, focusManager);
assert.equal(queryOnlineManager, onlineManager);

console.log('utils tests passed');
