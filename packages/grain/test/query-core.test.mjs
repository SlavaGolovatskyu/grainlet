import assert from 'node:assert/strict';
import {
  MutationCache,
  QueryCache,
  QueryClient,
  dehydrate,
  focusManager,
  hashKey,
  hydrate,
  onlineManager,
  partialMatchKey,
  replaceEqualDeep,
} from '../query/index.js';

const delay = (ms, value) => new Promise((resolve) => setTimeout(resolve, ms, value));

assert.equal(
  hashKey(['todos', { page: 1, filter: 'open' }]),
  hashKey(['todos', { filter: 'open', page: 1 }]),
  'object key order is stable'
);
assert.equal(partialMatchKey(['todos', 2], ['todos']), true);
assert.equal(partialMatchKey(['users'], ['todos']), false);
const oldData = { nested: { stable: true }, changed: 1 };
const shared = replaceEqualDeep(oldData, { nested: { stable: true }, changed: 2 });
assert.equal(shared.nested, oldData.nested, 'unchanged nested data is shared');

let calls = 0;
const client = new QueryClient({
  queryCache: new QueryCache(),
  mutationCache: new MutationCache(),
  defaultOptions: { queries: { retry: 0, gcTime: Infinity } },
});
const options = {
  queryKey: ['dedupe'],
  queryFn: async () => {
    calls += 1;
    return delay(10, { value: 1 });
  },
};
const [first, second] = await Promise.all([
  client.fetchQuery(options),
  client.fetchQuery(options),
]);
assert.deepEqual(first, { value: 1 });
assert.equal(second, first);
assert.equal(calls, 1, 'in-flight requests are deduplicated');
assert.equal(client.getQueryData(['dedupe']), first);

client.setQueryData(['dedupe'], (data) => ({ value: data.value + 1 }));
assert.deepEqual(client.getQueryData(['dedupe']), { value: 2 });
await client.invalidateQueries({ queryKey: ['dedupe'] }, { refetchType: 'none' });
assert.equal(client.getQueryState(['dedupe']).isInvalidated, true);
assert.equal(client.getQueriesData({ queryKey: ['dedupe'] }).length, 1);

let retryCalls = 0;
const retried = await client.fetchQuery({
  queryKey: ['retry'],
  retry: 2,
  retryDelay: 0,
  queryFn: async () => {
    retryCalls += 1;
    if (retryCalls < 3) throw new Error('temporary');
    return 'ready';
  },
});
assert.equal(retried, 'ready');
assert.equal(retryCalls, 3);

let aborted = false;
const cancelling = client.fetchQuery({
  queryKey: ['cancel'],
  retry: 0,
  queryFn: ({ signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => {
      aborted = true;
      reject(new Error('aborted'));
    });
    setTimeout(resolve, 100, 'late');
  }),
});
await client.cancelQueries({ queryKey: ['cancel'] });
await assert.rejects(cancelling, /aborted/);
assert.equal(aborted, true);

const source = new QueryClient({ defaultOptions: { queries: { retry: 0 } } });
source.setQueryData(['hydrated'], { id: 7 });
const dehydrated = dehydrate(source);
const target = new QueryClient();
hydrate(target, dehydrated);
assert.deepEqual(target.getQueryData(['hydrated']), { id: 7 });

const lifecycle = [];
const mutationClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: () => lifecycle.push('cache-success'),
  }),
});
const mutation = mutationClient.getMutationCache().build(mutationClient, {
  mutationKey: ['save'],
  gcTime: Infinity,
  mutationFn: async (variables) => ({ ...variables, saved: true }),
  onMutate: (variables) => {
    lifecycle.push(`mutate:${variables.id}`);
    return { optimistic: true };
  },
  onSuccess: (_data, _variables, context) => {
    assert.equal(context.optimistic, true);
    lifecycle.push('success');
  },
  onSettled: () => lifecycle.push('settled'),
});
const mutationData = await mutationClient.getMutationCache().execute(
  mutation,
  { id: 3 },
  { onSuccess: () => lifecycle.push('call-success') }
);
assert.deepEqual(mutationData, { id: 3, saved: true });
assert.equal(mutation.state.status, 'success');
assert.deepEqual(lifecycle, [
  'mutate:3',
  'cache-success',
  'success',
  'call-success',
  'settled',
]);
assert.equal(mutationClient.isMutating(), 0);

onlineManager.setOnline(false);
const pausedMutation = mutationClient.getMutationCache().build(mutationClient, {
  mutationKey: ['offline-save'],
  gcTime: Infinity,
  mutationFn: async () => 'resumed',
});
const pausedPromise = mutationClient.getMutationCache().execute(pausedMutation);
await delay(0);
assert.equal(pausedMutation.state.isPaused, true);
onlineManager.setOnline(true);
assert.equal(await pausedPromise, 'resumed');
assert.equal(pausedMutation.state.isPaused, false);

let focusFetches = 0;
const focusQuery = client.getQueryCache().build(client, client.defaultQueryOptions({
  queryKey: ['focus'],
  queryFn: async () => ++focusFetches,
  staleTime: Infinity,
}));
await focusQuery.fetch();
const observer = () => {};
focusQuery.addObserver(observer);
client.mount();
await client.invalidateQueries({ queryKey: ['focus'] }, { refetchType: 'none' });
focusQuery.options.refetchOnWindowFocus = 'always';
focusManager.setFocused(false);
focusManager.setFocused(true);
await delay(0);
assert.equal(focusFetches, 2, 'active queries refetch on focus');
focusQuery.removeObserver(observer);
client.unmount();

const gcClient = new QueryClient({ defaultOptions: { queries: { gcTime: 5, retry: 0 } } });
await gcClient.fetchQuery({ queryKey: ['gc'], queryFn: async () => true });
await delay(15);
assert.equal(gcClient.getQueryData(['gc']), undefined, 'unused queries are garbage collected');

client.clear();
source.clear();
target.clear();
mutationClient.clear();
gcClient.clear();
console.log('query-core tests passed');
