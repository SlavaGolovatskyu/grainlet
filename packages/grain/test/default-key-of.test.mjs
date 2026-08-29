import assert from 'node:assert/strict';
import { defaultKeyOf } from '../core/flow/keyed-list.js';

const withId = { id: 'user-1', name: 'Ada' };
assert.equal(defaultKeyOf(withId, 0), 'user-1');
assert.equal(defaultKeyOf(withId, 99), 'user-1', 'id wins over index');

const withKey = { key: 'k1', name: 'Grace' };
assert.equal(defaultKeyOf(withKey, 0), 'k1');

const plain = { name: 'no-id' };
const a = defaultKeyOf(plain, 0);
assert.equal(plain.id, a, 'stamps id onto the object');
assert.equal(defaultKeyOf(plain, 1), a, 'same object keeps stamped id');

// Immutable form updates clone via spread — id must survive.
const cloned = { ...plain, name: 'edited' };
assert.equal(defaultKeyOf(cloned, 0), a, 'spread clone keeps id');

const other = { name: 'other' };
assert.notEqual(defaultKeyOf(other, 0), a, 'distinct objects get distinct ids');

assert.equal(defaultKeyOf('x', 0), 'x');
assert.equal(defaultKeyOf(null, 3), 3);

console.log('default-key-of: PASS');
