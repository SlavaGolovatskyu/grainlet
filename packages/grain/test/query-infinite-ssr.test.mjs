import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body><div id="app"></div><div id="hydrated"></div></body></html>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.HTMLElement = dom.window.HTMLElement;

const { createComponent } = await import('../core/component/component.js');
const { Suspense } = await import('../core/flow/Suspense.js');
const { jsx } = await import('../core/jsx-compiler-new/jsx-runtime.js');
const { render } = await import('../core/render/render.js');
const { renderToStringAsync } = await import('../ssr/render-to-string.js');
const {
  HydrationBoundary,
  QueryClient,
  QueryClientProvider,
  dehydrate,
  useInfiniteQuery,
  useIsRestoring,
  usePrefetchInfiniteQuery,
  usePrefetchQuery,
  useQuery,
  useSuspenseQuery,
} = await import('../query/index.js');

const client = new QueryClient({
  defaultOptions: { queries: { retry: 0, gcTime: Infinity, staleTime: Infinity } },
});
let infinite;
let prefetched = false;
const InfiniteView = createComponent(() => {
  infinite = useInfiniteQuery({
    queryKey: ['pages'],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => ({
      items: [pageParam],
      next: pageParam < 2 ? pageParam + 1 : undefined,
    }),
    getNextPageParam: (page) => page.next,
    maxPages: 2,
  });
  usePrefetchQuery({
    queryKey: ['prefetch'],
    queryFn: async () => {
      prefetched = true;
      return 'prefetched';
    },
  });
  usePrefetchInfiniteQuery({
    queryKey: ['prefetch-pages'],
    initialPageParam: 5,
    queryFn: async ({ pageParam }) => ({ pageParam }),
    getNextPageParam: () => undefined,
  });
  return jsx('div', null, 'infinite');
});
const InfiniteApp = createComponent(() =>
  jsx(QueryClientProvider, { client, children: jsx(InfiniteView, {}) })
);
const instance = render(InfiniteApp, document.getElementById('app'));
await infinite.promise();
assert.deepEqual(infinite.data().pageParams, [0]);
assert.equal(infinite.hasNextPage(), true);
await infinite.fetchNextPage();
assert.deepEqual(infinite.data().pageParams, [0, 1]);
await infinite.fetchNextPage();
assert.deepEqual(infinite.data().pageParams, [1, 2], 'maxPages trims the oldest page');
assert.equal(infinite.hasNextPage(), false);
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(prefetched, true);
assert.equal(client.getQueryData(['prefetch']), 'prefetched');
assert.deepEqual(client.getQueryData(['prefetch-pages']).pageParams, [5]);
instance.unmount();

const serverClient = new QueryClient({
  defaultOptions: { queries: { retry: 0, staleTime: Infinity, gcTime: Infinity } },
});
function ServerProfile() {
  const profile = useSuspenseQuery({
    queryKey: ['profile'],
    queryFn: async () => ({ name: 'Ada' }),
  });
  return jsx('strong', null, profile.data()?.name || 'pending');
}
function ServerApp() {
  return jsx(QueryClientProvider, {
    client: serverClient,
    children: jsx(Suspense, {
      fallback: jsx('p', null, 'Loading profile'),
      children: jsx(ServerProfile, null),
    }),
  });
}
const html = await renderToStringAsync(ServerApp);
assert.match(html, /Ada/);
assert.doesNotMatch(html, /Loading profile/);

const dehydrated = dehydrate(serverClient);
const hydratedClient = new QueryClient({
  defaultOptions: { queries: { retry: 0, staleTime: Infinity, gcTime: Infinity } },
});
let hydratedQuery;
let restoring;
let hydrationFetches = 0;
const HydratedView = createComponent(() => {
  restoring = useIsRestoring();
  hydratedQuery = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      hydrationFetches += 1;
      return { name: 'Refetched' };
    },
  });
  return jsx('span', null, 'hydrated');
});
const HydratedApp = createComponent(() =>
  jsx(QueryClientProvider, {
    client: hydratedClient,
    children: jsx(HydrationBoundary, {
      state: dehydrated,
      children: jsx(HydratedView, {}),
    }),
  })
);
const hydratedInstance = render(HydratedApp, document.getElementById('hydrated'));
assert.deepEqual(hydratedQuery.data(), { name: 'Ada' });
assert.equal(restoring(), false);
assert.equal(hydrationFetches, 0, 'fresh hydrated data is not fetched again');
hydratedInstance.unmount();

client.clear();
serverClient.clear();
hydratedClient.clear();
console.log('query infinite, prefetch, suspense, and hydration tests passed');
