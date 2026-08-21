import {
  Subscribable,
  exponentialBackoffDelay as defaultRetryDelay,
  focusManager,
  functionalUpdate,
  onlineManager,
  partialMatch,
  replaceEqualDeep,
  resolveValue,
  sleep,
  stableHash,
} from '../utils/index.js';

export {
  focusManager,
  onlineManager,
  replaceEqualDeep,
};

export const hashKey = stableHash;
export const partialMatchKey = partialMatch;

function canFetch(networkMode) {
  return networkMode !== 'online' || onlineManager.isOnline();
}

function matchesQuery(filters, query) {
  if (!filters) return true;
  if (filters.queryKey) {
    if (filters.exact) {
      if (query.queryHash !== hashKey(filters.queryKey)) return false;
    } else if (!partialMatchKey(query.queryKey, filters.queryKey)) return false;
  }
  if (filters.type && filters.type !== 'all') {
    const active = query.observers.size > 0;
    if (filters.type === 'active' !== active) return false;
    if (filters.type === 'inactive' === active) return false;
  }
  if (typeof filters.stale === 'boolean' && query.isStale() !== filters.stale) return false;
  if (filters.fetchStatus && query.state.fetchStatus !== filters.fetchStatus) return false;
  return !filters.predicate || filters.predicate(query);
}

function matchesMutation(filters, mutation) {
  if (!filters) return true;
  if (filters.mutationKey) {
    if (filters.exact) {
      if (mutation.mutationHash !== hashKey(filters.mutationKey)) return false;
    } else if (!partialMatchKey(mutation.options.mutationKey, filters.mutationKey)) return false;
  }
  if (filters.status && mutation.state.status !== filters.status) return false;
  return !filters.predicate || filters.predicate(mutation);
}

export class Query {
  constructor(cache, client, options) {
    this.cache = cache;
    this.client = client;
    this.observers = new Set();
    this.promise = null;
    this.abortController = null;
    this.gcTimer = null;
    this.setOptions(options);
    const initial = resolveValue(options.initialData);
    this.initialState = {
      data: initial,
      dataUpdatedAt: initial === undefined
        ? 0
        : (resolveValue(options.initialDataUpdatedAt) || Date.now()),
      error: null,
      errorUpdatedAt: 0,
      errorUpdateCount: 0,
      failureCount: 0,
      failureReason: null,
      fetchStatus: 'idle',
      isInvalidated: false,
      status: initial === undefined ? 'pending' : 'success',
    };
    this.state = { ...this.initialState };
  }
  setOptions(options) {
    this.options = { ...this.options, ...options };
    this.queryKey = this.options.queryKey;
    this.queryHash = this.options.queryHash || hashKey(this.queryKey);
  }
  isStale() {
    const staleTime = resolveValue(this.options.staleTime, this) ?? 0;
    if (this.state.data === undefined) return true;
    if (staleTime === 'static') return false;
    return this.state.isInvalidated
      || (staleTime !== Infinity && Date.now() - this.state.dataUpdatedAt > staleTime);
  }
  setState(patch) {
    this.state = { ...this.state, ...functionalUpdate(patch, this.state) };
    this.cache.notify({ type: 'updated', query: this });
    for (const observer of [...this.observers]) observer(this.state);
  }
  setData(updater, options = {}) {
    const next = functionalUpdate(updater, this.state.data);
    const sharing = options.structuralSharing ?? this.options.structuralSharing;
    const data = typeof sharing === 'function'
      ? sharing(this.state.data, next)
      : sharing === false
        ? next
        : replaceEqualDeep(this.state.data, next);
    this.setState({
      data,
      dataUpdatedAt: options.updatedAt || Date.now(),
      error: null,
      failureCount: 0,
      failureReason: null,
      isInvalidated: false,
      status: 'success',
    });
    return data;
  }
  addObserver(observer) {
    this.observers.add(observer);
    clearTimeout(this.gcTimer);
    this.gcTimer = null;
  }
  removeObserver(observer) {
    this.observers.delete(observer);
    if (this.observers.size === 0) this.scheduleGc();
  }
  scheduleGc() {
    clearTimeout(this.gcTimer);
    const gcTime = this.options.gcTime ?? this.client.defaultOptions.queries?.gcTime ?? 5 * 60 * 1000;
    if (gcTime === Infinity) return;
    this.gcTimer = setTimeout(() => {
      if (this.observers.size === 0 && this.state.fetchStatus === 'idle') {
        this.cache.remove(this);
      }
    }, Math.max(0, gcTime));
    this.gcTimer.unref?.();
  }
  cancel(options = {}) {
    this.abortController?.abort();
    if (options.silent) this.setState({ fetchStatus: 'idle' });
    return this.promise || Promise.resolve();
  }
  async fetch(options = this.options, fetchOptions = {}) {
    this.setOptions(options);
    if (this.promise) {
      if (fetchOptions.cancelRefetch && this.state.data !== undefined) this.abortController?.abort();
      else return this.promise;
    }
    const queryFn = fetchOptions.fetchFn || this.options.queryFn;
    if (typeof queryFn !== 'function') {
      return Promise.reject(new Error(`Missing queryFn for ${this.queryHash}`));
    }
    const networkMode = this.options.networkMode || 'online';
    if (!canFetch(networkMode)) {
      this.setState({ fetchStatus: 'paused' });
      await new Promise((resolve) => {
        const unsubscribe = onlineManager.subscribe((online) => {
          if (online || networkMode === 'always') {
            unsubscribe();
            resolve();
          }
        });
      });
    }
    const controller = new AbortController();
    this.abortController = controller;
    this.setState({
      fetchStatus: 'fetching',
      status: this.state.data === undefined ? 'pending' : this.state.status,
      failureCount: 0,
      failureReason: null,
    });
    const retry = this.options.retry ?? 3;
    const retryDelay = this.options.retryDelay ?? defaultRetryDelay;
    const context = {
      client: this.client,
      queryKey: this.queryKey,
      meta: this.options.meta,
      signal: controller.signal,
      ...fetchOptions.context,
    };
    this.promise = (async () => {
      let failures = 0;
      while (true) {
        try {
          const data = await queryFn(context);
          if (data === undefined) throw new Error('Query data cannot be undefined');
          if (!controller.signal.aborted) {
            this.setData(data);
            this.setState({ fetchStatus: 'idle' });
            await this.cache.config.onSuccess?.(data, this);
            await this.cache.config.onSettled?.(data, null, this);
          }
          return data;
        } catch (error) {
          if (controller.signal.aborted) {
            if (this.abortController === controller) {
              this.setState({ fetchStatus: 'idle' });
            }
            throw error;
          }
          failures += 1;
          const shouldRetry = typeof retry === 'function'
            ? retry(failures, error)
            : retry === true || failures <= retry;
          this.setState({ failureCount: failures, failureReason: error });
          if (!shouldRetry) {
            this.setState({
              error,
              errorUpdatedAt: Date.now(),
              errorUpdateCount: this.state.errorUpdateCount + 1,
              fetchStatus: 'idle',
              status: 'error',
            });
            await this.cache.config.onError?.(error, this);
            await this.cache.config.onSettled?.(undefined, error, this);
            throw error;
          }
          await sleep(resolveValue(retryDelay, failures - 1, error));
        }
      }
    })();
    const activePromise = this.promise;
    activePromise.finally(() => {
      if (this.abortController === controller) {
        this.abortController = null;
        this.promise = null;
      }
      if (this.observers.size === 0) this.scheduleGc();
    }).catch(() => {});
    return this.promise;
  }
  reset() {
    this.cancel({ silent: true });
    this.state = { ...this.initialState };
    this.setState({});
  }
  destroy() {
    clearTimeout(this.gcTimer);
    this.abortController?.abort();
    this.observers.clear();
  }
}

export class QueryCache extends Subscribable {
  constructor(config = {}) {
    super();
    this.config = config;
    this.queries = new Map();
  }
  build(client, options) {
    const queryHash = options.queryHash || hashKey(options.queryKey);
    let query = this.queries.get(queryHash);
    if (!query) {
      query = new Query(this, client, { ...options, queryHash });
      this.queries.set(queryHash, query);
      this.notify({ type: 'added', query });
    } else query.setOptions(options);
    return query;
  }
  find(filters) {
    const normalized = Array.isArray(filters)
      ? { queryKey: filters, exact: true }
      : { ...filters, exact: filters?.exact ?? true };
    return this.findAll(normalized)[0];
  }
  findAll(filters = {}) {
    return [...this.queries.values()].filter((query) => matchesQuery(filters, query));
  }
  get(queryHash) {
    return this.queries.get(queryHash);
  }
  getAll() {
    return [...this.queries.values()];
  }
  remove(query) {
    if (this.queries.get(query.queryHash) !== query) return;
    query.destroy();
    this.queries.delete(query.queryHash);
    this.notify({ type: 'removed', query });
  }
  clear() {
    for (const query of this.getAll()) this.remove(query);
  }
}

let mutationId = 0;
export class Mutation {
  constructor(cache, client, options) {
    this.cache = cache;
    this.client = client;
    this.options = options;
    this.mutationId = ++mutationId;
    this.mutationHash = hashKey(options.mutationKey || [this.mutationId]);
    this.state = {
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
    this.gcTimer = null;
  }
  setState(patch) {
    this.state = { ...this.state, ...patch };
    this.cache.notify({ type: 'updated', mutation: this });
  }
  async execute(variables, callOptions = {}) {
    const options = this.options;
    const mutationFn = callOptions.mutationFn || options.mutationFn;
    if (typeof mutationFn !== 'function') throw new Error('No mutationFn found');
    let context;
    this.setState({
      data: undefined,
      error: null,
      failureCount: 0,
      failureReason: null,
      status: 'pending',
      submittedAt: Date.now(),
      variables,
    });
    try {
      const networkMode = options.networkMode || 'online';
      if (!canFetch(networkMode)) {
        this.setState({ isPaused: true });
        await new Promise((resolve) => {
          const unsubscribe = onlineManager.subscribe((online) => {
            if (online || networkMode !== 'online') {
              unsubscribe();
              resolve();
            }
          });
        });
        this.setState({ isPaused: false });
      }
      await this.cache.config.onMutate?.(variables, this);
      context = await options.onMutate?.(variables, { client: this.client });
      this.setState({ context });
      const retry = options.retry ?? 0;
      let failures = 0;
      let data;
      while (true) {
        try {
          data = await mutationFn(variables, {
            client: this.client,
            meta: options.meta,
            mutationKey: options.mutationKey,
          });
          break;
        } catch (error) {
          failures += 1;
          const shouldRetry = typeof retry === 'function'
            ? retry(failures, error)
            : retry === true || failures <= retry;
          this.setState({ failureCount: failures, failureReason: error });
          if (!shouldRetry) throw error;
          await sleep(resolveValue(options.retryDelay ?? defaultRetryDelay, failures - 1, error));
        }
      }
      this.setState({ data, status: 'success' });
      await this.cache.config.onSuccess?.(data, variables, context, this);
      await options.onSuccess?.(data, variables, context, { client: this.client });
      await callOptions.onSuccess?.(data, variables, context, { client: this.client });
      await this.cache.config.onSettled?.(data, null, variables, context, this);
      await options.onSettled?.(data, null, variables, context, { client: this.client });
      await callOptions.onSettled?.(data, null, variables, context, { client: this.client });
      return data;
    } catch (error) {
      this.setState({ error, status: 'error' });
      await this.cache.config.onError?.(error, variables, context, this);
      await options.onError?.(error, variables, context, { client: this.client });
      await callOptions.onError?.(error, variables, context, { client: this.client });
      await this.cache.config.onSettled?.(undefined, error, variables, context, this);
      await options.onSettled?.(undefined, error, variables, context, { client: this.client });
      await callOptions.onSettled?.(undefined, error, variables, context, { client: this.client });
      throw error;
    } finally {
      this.scheduleGc();
    }
  }
  scheduleGc() {
    clearTimeout(this.gcTimer);
    const gcTime = this.options.gcTime ?? 5 * 60 * 1000;
    if (gcTime === Infinity) return;
    this.gcTimer = setTimeout(() => this.cache.remove(this), Math.max(0, gcTime));
    this.gcTimer.unref?.();
  }
  reset() {
    this.setState({
      context: undefined,
      data: undefined,
      error: null,
      failureCount: 0,
      failureReason: null,
      isPaused: false,
      status: 'idle',
      submittedAt: 0,
      variables: undefined,
    });
  }
}

export class MutationCache extends Subscribable {
  constructor(config = {}) {
    super();
    this.config = config;
    this.mutations = [];
    this.scopes = new Map();
  }
  build(client, options) {
    const mutation = new Mutation(this, client, options);
    this.mutations.push(mutation);
    this.notify({ type: 'added', mutation });
    return mutation;
  }
  find(filters = {}) {
    return this.findAll({ ...filters, exact: filters.exact ?? true })[0];
  }
  findAll(filters = {}) {
    return this.mutations.filter((mutation) => matchesMutation(filters, mutation));
  }
  execute(mutation, variables, callOptions) {
    const scopeId = mutation.options.scope?.id;
    if (!scopeId) return mutation.execute(variables, callOptions);
    const previous = this.scopes.get(scopeId) || Promise.resolve();
    const next = previous.catch(() => {}).then(() => mutation.execute(variables, callOptions));
    this.scopes.set(scopeId, next);
    next.finally(() => {
      if (this.scopes.get(scopeId) === next) this.scopes.delete(scopeId);
    });
    return next;
  }
  remove(mutation) {
    const index = this.mutations.indexOf(mutation);
    if (index < 0) return;
    clearTimeout(mutation.gcTimer);
    this.mutations.splice(index, 1);
    this.notify({ type: 'removed', mutation });
  }
  clear() {
    for (const mutation of [...this.mutations]) this.remove(mutation);
  }
}

export class QueryClient {
  constructor(config = {}) {
    this.queryCache = config.queryCache || new QueryCache();
    this.mutationCache = config.mutationCache || new MutationCache();
    this.defaultOptions = config.defaultOptions || {};
    this.queryDefaults = [];
    this.mutationDefaults = [];
    this.mountCount = 0;
    this.unsubscribers = [];
  }
  mount() {
    if (++this.mountCount !== 1) return;
    this.unsubscribers = [
      focusManager.subscribe((focused) => {
        if (focused) {
          this.refetchQueries({
            type: 'active',
            predicate: (query) => {
              const option = resolveValue(query.options.refetchOnWindowFocus, query);
              return option === 'always' || (option !== false && query.isStale());
            },
          });
        }
      }),
      onlineManager.subscribe((online) => {
        if (online) {
          this.refetchQueries({
            type: 'active',
            predicate: (query) => {
              const option = resolveValue(query.options.refetchOnReconnect, query);
              return option === 'always' || (option !== false && query.isStale());
            },
          });
        }
      }),
    ];
  }
  unmount() {
    if (this.mountCount === 0 || --this.mountCount !== 0) return;
    for (const unsubscribe of this.unsubscribers) unsubscribe();
    this.unsubscribers = [];
  }
  dispose() {
    this.unmount();
    this.clear();
  }
  getQueryCache() { return this.queryCache; }
  getMutationCache() { return this.mutationCache; }
  getDefaultOptions() { return this.defaultOptions; }
  setDefaultOptions(options) { this.defaultOptions = options; }
  setQueryDefaults(queryKey, options) {
    this.queryDefaults.push({ queryKey, options });
  }
  getQueryDefaults(queryKey) {
    return this.queryDefaults
      .filter((entry) => partialMatchKey(queryKey, entry.queryKey))
      .reduce((result, entry) => ({ ...result, ...entry.options }), {});
  }
  setMutationDefaults(mutationKey, options) {
    this.mutationDefaults.push({ mutationKey, options });
  }
  getMutationDefaults(mutationKey) {
    return this.mutationDefaults
      .filter((entry) => partialMatchKey(mutationKey, entry.mutationKey))
      .reduce((result, entry) => ({ ...result, ...entry.options }), {});
  }
  defaultQueryOptions(options) {
    const merged = {
      ...this.defaultOptions.queries,
      ...this.getQueryDefaults(options.queryKey),
      ...options,
    };
    merged.queryHash = merged.queryHash
      || (merged.queryKeyHashFn
        ? merged.queryKeyHashFn(merged.queryKey)
        : hashKey(merged.queryKey));
    return merged;
  }
  defaultMutationOptions(options = {}) {
    return {
      ...this.defaultOptions.mutations,
      ...this.getMutationDefaults(options.mutationKey),
      ...options,
    };
  }
  fetchQuery(options) {
    const resolved = this.defaultQueryOptions(options);
    const query = this.queryCache.build(this, resolved);
    return !query.isStale() ? Promise.resolve(query.state.data) : query.fetch(resolved);
  }
  prefetchQuery(options) {
    return this.fetchQuery(options).then(() => undefined).catch(() => undefined);
  }
  ensureQueryData(options) {
    const data = this.getQueryData(options.queryKey);
    if (data !== undefined) {
      if (options.revalidateIfStale) this.prefetchQuery(options);
      return Promise.resolve(data);
    }
    return this.fetchQuery(options);
  }
  fetchInfiniteQuery(options) {
    const pageParam = options.initialPageParam;
    return this.fetchQuery({
      ...options,
      queryFn: async (context) => {
        const page = await options.queryFn({
          ...context,
          pageParam,
          direction: 'forward',
        });
        return { pages: [page], pageParams: [pageParam] };
      },
    });
  }
  prefetchInfiniteQuery(options) {
    return this.fetchInfiniteQuery(options).then(() => undefined).catch(() => undefined);
  }
  getQueryData(queryKey) {
    const queryHash = this.defaultQueryOptions({ queryKey }).queryHash;
    return this.queryCache.get(queryHash)?.state.data;
  }
  getQueryState(queryKey) {
    const queryHash = this.defaultQueryOptions({ queryKey }).queryHash;
    return this.queryCache.get(queryHash)?.state;
  }
  getQueriesData(filters = {}) {
    return this.queryCache.findAll(filters).map((query) => [query.queryKey, query.state.data]);
  }
  setQueryData(queryKey, updater, options) {
    const query = this.queryCache.build(this, this.defaultQueryOptions({ queryKey }));
    return query.setData(updater, options);
  }
  setQueriesData(filters, updater, options) {
    return this.queryCache.findAll(filters)
      .map((query) => [query.queryKey, query.setData(updater, options)]);
  }
  invalidateQueries(filters = {}, options = {}) {
    const queries = this.queryCache.findAll(filters);
    for (const query of queries) query.setState({ isInvalidated: true });
    if (options.refetchType === 'none') return Promise.resolve();
    return this.refetchQueries({ ...filters, type: options.refetchType || filters.type || 'active' }, options);
  }
  refetchQueries(filters = {}, options = {}) {
    return Promise.all(this.queryCache.findAll(filters).map((query) =>
      query.fetch(query.options, { cancelRefetch: options.cancelRefetch !== false })
        .catch((error) => {
          if (options.throwOnError) throw error;
        })
    ));
  }
  cancelQueries(filters = {}, options = {}) {
    return Promise.all(this.queryCache.findAll(filters).map((query) => query.cancel(options).catch(() => {})));
  }
  resetQueries(filters = {}, options = {}) {
    const queries = this.queryCache.findAll(filters);
    for (const query of queries) query.reset();
    return options.refetchType === 'none'
      ? Promise.resolve()
      : this.refetchQueries({ ...filters, type: filters.type || 'active' }, options);
  }
  removeQueries(filters = {}) {
    for (const query of this.queryCache.findAll(filters)) this.queryCache.remove(query);
  }
  isFetching(filters = {}) {
    return this.queryCache.findAll({ ...filters, fetchStatus: 'fetching' }).length;
  }
  isMutating(filters = {}) {
    return this.mutationCache.findAll({ ...filters, status: 'pending' }).length;
  }
  resumePausedMutations() {
    return Promise.resolve();
  }
  clear() {
    this.queryCache.clear();
    this.mutationCache.clear();
  }
}

export function dehydrate(client, options = {}) {
  const queries = client.getQueryCache().getAll()
    .filter((query) => options.shouldDehydrateQuery
      ? options.shouldDehydrateQuery(query)
      : query.state.status === 'success')
    .map((query) => ({
      queryHash: query.queryHash,
      queryKey: query.queryKey,
      state: { ...query.state, fetchStatus: 'idle' },
      meta: query.options.meta,
    }));
  const mutations = client.getMutationCache().findAll()
    .filter((mutation) => options.shouldDehydrateMutation?.(mutation) || mutation.state.isPaused)
    .map((mutation) => ({
      mutationKey: mutation.options.mutationKey,
      state: mutation.state,
      meta: mutation.options.meta,
    }));
  return { mutations, queries };
}

export function hydrate(client, dehydratedState, options = {}) {
  if (!dehydratedState || !Array.isArray(dehydratedState.queries)) return;
  for (const item of dehydratedState.queries) {
    const existing = client.getQueryCache().get(item.queryHash);
    if (existing && existing.state.dataUpdatedAt >= item.state.dataUpdatedAt) continue;
    const query = client.getQueryCache().build(client, client.defaultQueryOptions({
      ...options.defaultOptions?.queries,
      queryKey: item.queryKey,
      queryHash: item.queryHash,
      meta: item.meta,
    }));
    query.state = { ...query.state, ...item.state, fetchStatus: 'idle' };
    query.setState({});
  }
  for (const item of dehydratedState.mutations || []) {
    const mutation = client.getMutationCache().build(
      client,
      client.defaultMutationOptions({
        ...options.defaultOptions?.mutations,
        mutationKey: item.mutationKey,
        meta: item.meta,
      })
    );
    mutation.state = { ...mutation.state, ...item.state };
    mutation.setState({});
  }
}

export function queryOptions(options) {
  return options;
}

export function infiniteQueryOptions(options) {
  return options;
}

export function mutationOptions(options) {
  return options;
}

export function keepPreviousData(previousData) {
  return previousData;
}

export const skipToken = Symbol('skipToken');

export function defaultShouldDehydrateQuery(query) {
  return query.state.status === 'success';
}

export function defaultShouldDehydrateMutation(mutation) {
  return mutation.state.isPaused;
}
