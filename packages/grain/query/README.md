# grainlet/query

Async server-state caching for Grainlet, with an API modeled on TanStack Query v5.

## Setup

```jsx
import { QueryClient, QueryClientProvider } from 'grainlet/query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 2 },
  },
});

render(
  () => (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  ),
  document.getElementById('app')
);
```

Query and mutation state is exposed as Grainlet accessors. Read `query.data()`
and `mutation.isPending()` rather than React Query's `query.data` and
`mutation.isPending`. Imperative methods remain regular functions.

## Queries

```jsx
import { useQuery, useQueries, useQueryClient } from 'grainlet/query';

function Todo({ id }) {
  const client = useQueryClient();
  const todo = useQuery({
    queryKey: ['todo', id],
    queryFn: ({ signal }) =>
      fetch(`/api/todos/${id}`, { signal }).then((response) => response.json()),
    staleTime: 10_000,
  });

  const related = useQueries({
    queries: [
      { queryKey: ['comments', id], queryFn: fetchComments },
      { queryKey: ['owner', id], queryFn: fetchOwner },
    ],
  });

  return (
    <section>
      <h1>{todo.data()?.title}</h1>
      <button onClick={() => todo.refetch()}>Refresh</button>
      <button onClick={() => client.invalidateQueries({ queryKey: ['todo'] })}>
        Invalidate todos
      </button>
      <p>{related[0].isFetching() ? 'Loading comments…' : 'Comments ready'}</p>
    </section>
  );
}
```

Use an accessor for reactive options:

```js
const query = useQuery(() => ({
  queryKey: ['todo', selectedId()],
  queryFn: ({ queryKey, signal }) => fetchTodo(queryKey[1], signal),
  enabled: selectedId() != null,
}));
```

## Mutations

```jsx
import { useMutation, useIsMutating, useMutationState } from 'grainlet/query';

const saveTodo = useMutation({
  mutationKey: ['save-todo'],
  mutationFn: (todo) => api.saveTodo(todo),
  onMutate: async (todo, { client }) => {
    await client.cancelQueries({ queryKey: ['todos'] });
    const previous = client.getQueryData(['todos']);
    client.setQueryData(['todos'], (items = []) => [...items, todo]);
    return { previous };
  },
  onError: (_error, _todo, context, { client }) => {
    client.setQueryData(['todos'], context.previous);
  },
  onSettled: (_data, _error, _todo, _context, { client }) =>
    client.invalidateQueries({ queryKey: ['todos'] }),
});

saveTodo.mutate({ id: 1, title: 'Ship it' });
await saveTodo.mutateAsync({ id: 2, title: 'Document it' });

const activeMutations = useIsMutating({ mutationKey: ['save-todo'] });
const pendingVariables = useMutationState({
  filters: { mutationKey: ['save-todo'], status: 'pending' },
  select: (mutation) => mutation.state.variables,
});
```

## Infinite queries

```jsx
const posts = useInfiniteQuery({
  queryKey: ['posts'],
  initialPageParam: 0,
  queryFn: ({ pageParam, signal }) => fetchPage(pageParam, signal),
  getNextPageParam: (lastPage) => lastPage.nextCursor,
  maxPages: 5,
});

<For each={posts.data()?.pages.flat() ?? []}>
  {(post) => <article>{post.title}</article>}
</For>
<button
  disabled={!posts.hasNextPage() || posts.isFetchingNextPage()}
  onClick={() => posts.fetchNextPage()}
>
  More
</button>
```

`useSuspenseQuery`, `useSuspenseQueries`, and `useSuspenseInfiniteQuery`
register their pending promises with Grainlet's `Suspense`. Query errors can
be retried with `QueryErrorResetBoundary` and Grainlet's `ErrorBoundary`.

```jsx
<QueryErrorResetBoundary>
  {({ reset }) => (
    <ErrorBoundary fallback={(error, resetBoundary) => (
      <button onClick={() => { reset(); resetBoundary(); }}>Try again</button>
    )}>
      <Suspense fallback={<p>Loading…</p>}>
        <Profile />
      </Suspense>
    </ErrorBoundary>
  )}
</QueryErrorResetBoundary>
```

`usePrefetchQuery` and `usePrefetchInfiniteQuery` prefetch during component
render. `useIsFetching`, `useIsMutating`, and `useMutationState` expose global
cache activity as accessors.

## SSR and hydration

Prefetch with a request-local client, serialize `dehydrate(client)`, then pass
the parsed state to `HydrationBoundary` on the client.

```jsx
<QueryClientProvider client={queryClient}>
  <HydrationBoundary state={window.__QUERY_STATE__}>
    <App />
  </HydrationBoundary>
</QueryClientProvider>
```

`useIsRestoring()` returns the nearest restoration-state accessor.

## Shared utilities

`hashKey`, `partialMatchKey`, `replaceEqualDeep`, `focusManager`, and
`onlineManager` remain available here for compatibility. New non-query code
can import their generic counterparts from `grainlet/utils`: `stableHash`,
`partialMatch`, `replaceEqualDeep`, `focusManager`, and `onlineManager`.

## Route loaders

Nested routes can share this cache through `queryLoader` from `grainlet/route`.
Pass the same `QueryClient` to `Router`; server route preparation includes
loader-prefetched queries in the dehydrated query state.
