import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
  url: 'https://example.test/',
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.HTMLElement = dom.window.HTMLElement;

const { createComponent } = await import('../core/component/component.js');
const { jsx } = await import('../core/jsx-compiler-new/jsx-runtime.js');
const { render } = await import('../core/render/render.js');
const { createSignal } = await import('../signals/index.js');
const {
  QueryClient,
  QueryClientProvider,
  QueryErrorResetBoundary,
  useIsFetching,
  useIsMutating,
  useMutation,
  useMutationState,
  useQueries,
  useQuery,
  useQueryClient,
  useQueryErrorResetBoundary,
} = await import('../query/index.js');

assert.throws(() => useQueryClient(), /no QueryClientProvider found/);

const client = new QueryClient({
  defaultOptions: { queries: { retry: 0, gcTime: Infinity, staleTime: Infinity } },
});
let query;
let disabled;
let mutation;
let fetching;
let mutating;
let mutationState;
let parallel;
let errorQuery;
let resetBoundary;
let reactiveQuery;
let setSelectedId;
let dynamicQueries;
let setDynamicIds;
let fetchCalls = 0;
let shouldFail = true;

const View = createComponent(() => {
  const [selectedId, updateSelectedId] = createSignal(1);
  const [dynamicIds, updateDynamicIds] = createSignal([1]);
  setSelectedId = updateSelectedId;
  setDynamicIds = updateDynamicIds;
  assert.equal(useQueryClient(), client);
  query = useQuery({
    queryKey: ['hook'],
    queryFn: async () => {
      fetchCalls += 1;
      return { title: `loaded-${fetchCalls}` };
    },
  });
  disabled = useQuery({
    queryKey: ['disabled'],
    enabled: false,
    queryFn: async () => 'never',
  });
  parallel = useQueries({
    queries: [
      { queryKey: ['parallel', 1], queryFn: async () => 1 },
      { queryKey: ['parallel', 2], queryFn: async () => 2 },
    ],
  });
  resetBoundary = useQueryErrorResetBoundary();
  errorQuery = useQuery({
    queryKey: ['recoverable'],
    retry: 0,
    throwOnError: true,
    queryFn: async () => {
      if (shouldFail) throw new Error('recoverable');
      return 'recovered';
    },
  });
  reactiveQuery = useQuery(() => ({
    queryKey: ['reactive', selectedId()],
    queryFn: async ({ queryKey }) => queryKey[1],
  }));
  dynamicQueries = useQueries(() => ({
    queries: dynamicIds().map((id) => ({
      queryKey: ['dynamic', id],
      queryFn: async () => id,
    })),
  }));
  mutation = useMutation({
    mutationKey: ['hook-save'],
    gcTime: Infinity,
    mutationFn: async (value) => value * 2,
  });
  fetching = useIsFetching();
  mutating = useIsMutating({ mutationKey: ['hook-save'] });
  mutationState = useMutationState({
    filters: { mutationKey: ['hook-save'] },
    select: (entry) => entry.state.status,
  });
  return jsx('p', { 'data-testid': 'view' }, 'query hooks');
});

const App = createComponent(() =>
  jsx(QueryClientProvider, {
    client,
    children: jsx(QueryErrorResetBoundary, {
      children: jsx(View, {}),
    }),
  })
);

const instance = render(App, document.getElementById('app'));
assert.equal(client.mountCount, 1);
assert.equal(query.isPending(), true);
assert.equal(query.isFetching(), true);
assert.equal(fetching() >= 1, true);
assert.equal(disabled.fetchStatus(), 'idle');
assert.equal(disabled.data(), undefined);

await query.promise();
await assert.rejects(errorQuery.promise(), /recoverable/);
assert.throws(() => errorQuery.data(), /recoverable/);
shouldFail = false;
resetBoundary.reset();
await errorQuery.promise();
assert.equal(errorQuery.data(), 'recovered');
await Promise.all(parallel.map((result) => result.promise()));
await reactiveQuery.promise();
await Promise.all(dynamicQueries.map((result) => result.promise()));
assert.deepEqual(query.data(), { title: 'loaded-1' });
assert.equal(query.isSuccess(), true);
assert.equal(query.isFetching(), false);
assert.deepEqual(parallel.map((result) => result.data()), [1, 2]);
assert.equal(reactiveQuery.data(), 1);
setSelectedId(2);
await reactiveQuery.promise();
assert.equal(reactiveQuery.data(), 2, 'accessor options switch query keys reactively');
setDynamicIds([1, 2]);
assert.equal(dynamicQueries.length, 2);
await Promise.all(dynamicQueries.map((result) => result.promise()));
assert.deepEqual(dynamicQueries.map((result) => result.data()), [1, 2]);
assert.equal(
  client.getQueryCache().find({ queryKey: ['reactive', 1] }).observers.size,
  0,
  'reactive key changes unsubscribe the previous record'
);
assert.equal(
  client.getQueryCache().find({ queryKey: ['reactive', 2] }).observers.size,
  1,
  'hook rerenders reuse one observer'
);

const mutationPromise = mutation.mutateAsync(4);
assert.equal(mutation.isPending(), true);
assert.equal(mutating(), 1);
assert.deepEqual(mutationState(), ['pending']);
assert.equal(await mutationPromise, 8);
assert.equal(mutation.data(), 8);
assert.equal(mutation.isSuccess(), true);
assert.equal(mutating(), 0);
assert.deepEqual(mutationState(), ['success']);

await query.refetch({ throwOnError: true });
assert.deepEqual(query.data(), { title: 'loaded-2' });
assert.equal(fetchCalls, 2);

mutation.reset();
assert.equal(mutation.isIdle(), true);
instance.unmount();
assert.equal(client.mountCount, 0);
client.clear();

console.log('query-hooks tests passed');
