# grainlet/utils

Dependency-free, framework-agnostic primitives used across Grainlet and
available to applications without importing a feature package.

## Equality and cloning

```js
import {
  deepClone,
  deepEqual,
  partialMatch,
  replaceEqualDeep,
  stableHash,
} from 'grainlet/utils';

const source = {
  createdAt: new Date('2026-01-01'),
  tags: new Set(['grainlet', 'signals']),
  bytes: new Uint8Array([1, 2, 3]),
};
source.self = source;

const copy = deepClone(source);
deepEqual(copy, source); // true
copy !== source; // true
copy.self === copy; // true
```

`deepEqual` supports arrays, plain and null-prototype objects, cycles, `Date`,
`RegExp`, `Map`, `Set`, `ArrayBuffer`, and typed arrays. Map keys and Set
members follow native identity semantics; mapped values compare deeply. Class
instances and functions compare by reference.

- `deepEqual(a, b)` checks complete structural equality.
- `deepClone(value)` creates an independent supported object graph.
- `replaceEqualDeep(previous, next)` preserves references in equal branches.
- `partialMatch(candidate, filter)` checks whether a nested subset matches.
- `stableHash(value)` creates deterministic JSON-compatible hashes.

## Nested paths

```js
import { getIn, setIn, toPath } from 'grainlet/utils';

toPath('users[0].name'); // ['users', 0, 'name']

const state = { users: [{ name: 'Ada' }] };
getIn(state, 'users[0].name'); // 'Ada'

const nextState = setIn(state, 'users[0].name', 'Grace');
nextState !== state; // true
state.users[0].name; // 'Ada'
```

`getIn` and `setIn` remain available from `grainlet/forms` for compatibility.

## Guards and collections

```js
import {
  compact,
  groupBy,
  isDefined,
  isPromiseLike,
  keyBy,
  omit,
  pick,
  uniqueBy,
} from 'grainlet/utils';

compact([0, null, false, undefined, 'value']); // [0, false, 'value']
pick({ id: 1, secret: true }, ['id']); // { id: 1 }
omit({ id: 1, secret: true }, ['secret']); // { id: 1 }

groupBy(posts, (post) => post.category);
keyBy(users, (user) => user.id);
uniqueBy(events, (event) => event.id);

values.filter(isDefined);
isPromiseLike(fetch('/api/data'));
```

Other typed guards are `isNullish`, `isString`, `isNumber`, `isBoolean`,
`isFunction`, `isDate`, `isRegExp`, `isMap`, `isSet`, and `isTypedArray`.
`groupBy` and `keyBy` return null-prototype objects so keys such as
`"__proto__"` are safe.

## Function and async control

```js
import {
  debounce,
  exponentialBackoffDelay,
  isAbortError,
  once,
  sleep,
  throttle,
  throwIfAborted,
  withTimeout,
} from 'grainlet/utils';

await sleep(250);
exponentialBackoffDelay(3); // 8000

const initialize = once(createConnection);
initialize();
initialize(); // returns the first result

const search = debounce(runSearch, 200);
search('grain');
search('grainlet');
search.flush();
search.cancel();
search.pending();

const updateScroll = throttle(renderPosition, 16);

const controller = new AbortController();
await withTimeout(fetchData(), 5000, { signal: controller.signal });

try {
  throwIfAborted(controller.signal);
} catch (error) {
  if (isAbortError(error)) console.log('cancelled');
}
```

`debounce` defaults to trailing execution. `throttle` defaults to leading and
trailing execution. Both expose `cancel()`, `flush()`, and `pending()`. If the
first `once` call throws, a later call retries it. `withTimeout` rejects
without claiming to cancel the underlying promise.

`noop`, `identity`, `functionalUpdate`, and `resolveValue` cover common
callback and function-or-value patterns.

## Subscriptions and browser state

```js
import {
  Subscribable,
  focusManager,
  onlineManager,
} from 'grainlet/utils';

const events = new Subscribable();
const unsubscribe = events.subscribe((event) => console.log(event));
events.notify({ type: 'saved' });
unsubscribe();

const stopWatchingOnline = onlineManager.subscribe((online) => {
  console.log(online ? 'online' : 'offline');
});

focusManager.isFocused();
onlineManager.isOnline();
stopWatchingOnline();
```

`FocusManager` and `OnlineManager` are also exported for isolated instances.
The `focusManager` and `onlineManager` singletons are shared with
`grainlet/query`.

## API boundary

This entry point intentionally contains only generic utilities. Query caches,
clients, mutations, hydration, and query option helpers remain in
`grainlet/query`.
