import { createEffect, createSignal, onCleanup } from '../signals/index.js';
import { currentComponent } from '../signals/reactive-context/reactive-context.js';
import { jsx } from '../core/jsx-compiler-new/jsx-runtime.js';
import { hydrate } from './core.js';
import {
  InfiniteQueryObserver,
  QueriesObserver,
  QueryObserver,
} from './observers.js';
import {
  IsRestoringContext,
  QueryClientContext,
  QueryErrorResetBoundaryContext,
  useQueryClient,
} from './context.js';

function readOptions(input) {
  return typeof input === 'function' ? input() : input;
}

const hookRegistry = new WeakMap();

function useStableHook(create, update) {
  if (!currentComponent) return create();
  let registry = hookRegistry.get(currentComponent);
  if (!registry) {
    registry = { index: 0, renderCount: currentComponent._renderCount, values: [] };
    hookRegistry.set(currentComponent, registry);
  }
  if (registry.renderCount !== currentComponent._renderCount) {
    registry.index = 0;
    registry.renderCount = currentComponent._renderCount;
  }
  const index = registry.index++;
  if (!registry.values[index]) registry.values[index] = create();
  else update?.(registry.values[index]);
  return registry.values[index];
}

export function QueryClientProvider(props) {
  const client = readOptions(props.client);
  if (!client) throw new Error('QueryClientProvider requires a client');
  useStableHook(
    () => {
      const lifecycle = { client };
      client.mount();
      onCleanup(() => lifecycle.client.unmount());
      return lifecycle;
    },
    (lifecycle) => {
      if (lifecycle.client !== client) {
        lifecycle.client.unmount();
        lifecycle.client = client;
        client.mount();
      }
    }
  );
  const children = typeof props.children === 'function'
    ? props.children(client)
    : props.children;
  return jsx(QueryClientContext.Provider, { value: client }, children);
}

export function QueryErrorResetBoundary(props) {
  const client = props.client || useQueryClient();
  const [resetValue, setResetValue] = createSignal(false);
  const value = {
    clear: () => setResetValue(false),
    isReset: resetValue,
    reset: () => {
      setResetValue(true);
      for (const query of client.getQueryCache().getAll()) {
        if (query.state.status === 'error') {
          query.reset();
          if (query.observers.size > 0) query.fetch(query.options).catch(() => {});
        }
      }
    },
  };
  const children = typeof props.children === 'function'
    ? props.children(value)
    : props.children;
  return jsx(QueryErrorResetBoundaryContext.Provider, { value }, children);
}

export function HydrationBoundary(props) {
  const client = props.client || useQueryClient();
  const [restoring, setRestoring] = createSignal(true);
  hydrate(client, props.state, props.options);
  setRestoring(false);
  return jsx(
    IsRestoringContext.Provider,
    { value: restoring },
    props.children
  );
}

export function IsRestoringProvider(props) {
  const value = typeof props.value === 'function'
    ? props.value
    : () => !!props.value;
  return jsx(IsRestoringContext.Provider, { value }, props.children);
}

export function useQuery(options, explicitClient) {
  const client = useQueryClient(explicitClient);
  const reactive = createSignal(0);
  const observer = useStableHook(
    () => new QueryObserver(client, options, { reactive }),
    (current) => current.setOptionsInput(options, { reactive })
  );
  return observer.result();
}

export function useSuspenseQuery(options, explicitClient) {
  const client = useQueryClient(explicitClient);
  const reactive = createSignal(0);
  const config = { reactive, suspense: true };
  const observer = useStableHook(
    () => new QueryObserver(client, options, config),
    (current) => current.setOptionsInput(options, config)
  );
  return observer.result();
}

export function useInfiniteQuery(options, explicitClient) {
  const client = useQueryClient(explicitClient);
  const reactive = createSignal(0);
  const observer = useStableHook(
    () => new InfiniteQueryObserver(client, options, { reactive }),
    (current) => current.setOptionsInput(options, { reactive })
  );
  return observer.result();
}

export function useSuspenseInfiniteQuery(options, explicitClient) {
  const client = useQueryClient(explicitClient);
  const reactive = createSignal(0);
  const config = { reactive, suspense: true };
  const observer = useStableHook(
    () => new InfiniteQueryObserver(client, options, config),
    (current) => current.setOptionsInput(options, config)
  );
  return observer.result();
}

export function useQueries(options, explicitClient) {
  const client = useQueryClient(explicitClient);
  return createQueriesResult(client, options, false);
}

export function useSuspenseQueries(options, explicitClient) {
  const client = useQueryClient(explicitClient);
  return createQueriesResult(client, options, true);
}

function createQueriesResult(client, options, suspense) {
  const reactive = createSignal(0);
  const config = { reactive, suspense };
  const observer = useStableHook(
    () => new QueriesObserver(client, options, config),
    (current) => current.setOptionsInput(options, config)
  );
  const input = readOptions(options);
  return input.combine
    ? () => readOptions(options).combine(observer.results)
    : observer.results;
}

export function usePrefetchQuery(options, explicitClient) {
  const client = useQueryClient(explicitClient);
  createEffect(() => {
    client.prefetchQuery(readOptions(options));
  });
}

export function usePrefetchInfiniteQuery(options, explicitClient) {
  const client = useQueryClient(explicitClient);
  createEffect(() => {
    client.prefetchInfiniteQuery(readOptions(options));
  });
}

export function useMutation(options, explicitClient) {
  const client = useQueryClient(explicitClient);
  const reactive = createSignal(0);
  const controller = useStableHook(
    () => createMutationController(client, options, reactive),
    (current) => current.setOptions(options)
  );
  return controller.result;
}

function createMutationController(client, options, reactive) {
  const [version, setVersion] = reactive;
  const controller = {
    current: null,
    resolvedOptions: client.defaultMutationOptions(readOptions(options)),
    setOptions(nextOptions) {
      this.resolvedOptions = client.defaultMutationOptions(readOptions(nextOptions));
    },
  };
  createEffect(() => controller.setOptions(options));
  const unsubscribe = client.getMutationCache().subscribe((event) => {
    if (event.mutation === controller.current) setVersion((value) => value + 1);
  });
  onCleanup(unsubscribe);

  const state = () => {
    version();
    return controller.current?.state || {
      context: undefined,
      data: undefined,
      error: null,
      failureCount: 0,
      failureReason: null,
      isPaused: false,
      status: 'idle',
      submittedAt: 0,
      variables: undefined,
    };
  };
  const mutateAsync = (variables, callOptions = {}) => {
    controller.current = client.getMutationCache().build(
      client,
      controller.resolvedOptions
    );
    setVersion((value) => value + 1);
    return client.getMutationCache().execute(controller.current, variables, callOptions);
  };
  controller.result = {
    context: () => state().context,
    data: () => {
      const currentState = state();
      if (currentState.status === 'error') {
        const shouldThrow = typeof controller.resolvedOptions.throwOnError === 'function'
          ? controller.resolvedOptions.throwOnError(currentState.error)
          : controller.resolvedOptions.throwOnError;
        if (shouldThrow) throw currentState.error;
      }
      return currentState.data;
    },
    error: () => state().error,
    failureCount: () => state().failureCount,
    failureReason: () => state().failureReason,
    isError: () => state().status === 'error',
    isIdle: () => state().status === 'idle',
    isPaused: () => state().isPaused,
    isPending: () => state().status === 'pending',
    isSuccess: () => state().status === 'success',
    mutate: (variables, callOptions) => {
      mutateAsync(variables, callOptions).catch(() => {});
    },
    mutateAsync,
    reset: () => {
      controller.current?.reset();
      controller.current = null;
      setVersion((value) => value + 1);
    },
    status: () => state().status,
    submittedAt: () => state().submittedAt,
    variables: () => state().variables,
  };
  return controller;
}

export function useMutationState(options = {}, explicitClient) {
  const client = useQueryClient(explicitClient);
  const reactive = createSignal(0);
  const controller = useStableHook(
    () => createCacheAccessor(
      client.getMutationCache(),
      options,
      reactive,
      (resolved) => client.getMutationCache().findAll(resolved.filters)
        .map((mutation) => resolved.select
          ? resolved.select(mutation)
          : mutation.state)
    ),
    (current) => { current.input = options; }
  );
  return controller.accessor;
}

export function useIsFetching(filters = {}, explicitClient) {
  const client = useQueryClient(explicitClient);
  const reactive = createSignal(0);
  const controller = useStableHook(
    () => createCacheAccessor(
      client.getQueryCache(),
      filters,
      reactive,
      (resolved) => client.isFetching(resolved)
    ),
    (current) => { current.input = filters; }
  );
  return controller.accessor;
}

export function useIsMutating(filters = {}, explicitClient) {
  const client = useQueryClient(explicitClient);
  const reactive = createSignal(0);
  const controller = useStableHook(
    () => createCacheAccessor(
      client.getMutationCache(),
      filters,
      reactive,
      (resolved) => client.isMutating(resolved)
    ),
    (current) => { current.input = filters; }
  );
  return controller.accessor;
}

function createCacheAccessor(cache, input, reactive, select) {
  const [version, setVersion] = reactive;
  const controller = { input };
  const unsubscribe = cache.subscribe(() => {
    setVersion((value) => value + 1);
  });
  onCleanup(unsubscribe);
  controller.accessor = () => {
    version();
    return select(readOptions(controller.input) || {});
  };
  return controller;
}
