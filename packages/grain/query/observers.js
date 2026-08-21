import { createEffect, createSignal, onCleanup } from '../signals/index.js';
import { getSuspenseContext } from '../core/flow/context.js';

function resolveOptions(input) {
  const options = typeof input === 'function' ? input() : input;
  if (!options || typeof options !== 'object') {
    throw new TypeError('Query hooks require an options object');
  }
  return {
    ...options,
    queryKey: typeof options.queryKey === 'function'
      ? options.queryKey()
      : options.queryKey,
  };
}

function enabled(options, query) {
  if (typeof options.queryFn === 'symbol') return false;
  return typeof options.enabled === 'function'
    ? options.enabled(query) !== false
    : options.enabled !== false;
}

export class QueryObserver {
  constructor(client, optionsInput, config = {}) {
    this.client = client;
    this.optionsInput = optionsInput;
    this.config = config;
    this.query = null;
    this.unsubscribe = null;
    this.subscribed = false;
    this.interval = null;
    this.mountedAt = Date.now();
    this.previousData = undefined;
    const [version, setVersion] = config.reactive || createSignal(0);
    this.version = version;
    this.bump = () => setVersion((value) => value + 1);

    this.update(resolveOptions(this.optionsInput));
    createEffect(() => this.update(resolveOptions(this.optionsInput)));
    onCleanup(() => this.dispose());
  }

  setOptionsInput(optionsInput, config = this.config) {
    this.optionsInput = optionsInput;
    this.config = config;
    this.update(resolveOptions(optionsInput), false);
  }

  update(options, shouldNotify = true) {
    const resolved = this.client.defaultQueryOptions({
      ...options,
      suspense: this.config.suspense || options.suspense,
    });
    const query = this.client.getQueryCache().build(this.client, resolved);
    const changed = query !== this.query;
    this.options = resolved;
    if (changed) {
      if (this.query && this.unsubscribe) {
        this.previousData = this.query.state.data;
        if (this.subscribed) this.query.removeObserver(this.unsubscribe);
      }
      this.query = query;
      this.unsubscribe = () => this.bump();
      this.subscribed = resolved.subscribed !== false;
      if (this.subscribed) query.addObserver(this.unsubscribe);
      if (shouldNotify) this.bump();
    } else if ((resolved.subscribed !== false) !== this.subscribed) {
      this.subscribed = resolved.subscribed !== false;
      if (this.subscribed) query.addObserver(this.unsubscribe);
      else query.removeObserver(this.unsubscribe);
    }
    this.updateInterval();
    const shouldFetch = enabled(resolved, query)
      && resolved.subscribed !== false
      && (query.state.data === undefined
        || resolved.refetchOnMount === 'always'
        || (query.isStale() && resolved.refetchOnMount !== false));
    if (shouldFetch && query.state.fetchStatus === 'idle') {
      query.fetch(resolved).catch(() => {});
    }
  }

  updateInterval() {
    clearInterval(this.interval);
    this.interval = null;
    const interval = typeof this.options?.refetchInterval === 'function'
      ? this.options.refetchInterval(this.query)
      : this.options?.refetchInterval;
    if (!interval || interval < 1 || typeof window === 'undefined') return;
    this.interval = setInterval(() => {
      if (this.options.refetchIntervalInBackground
        || typeof document === 'undefined'
        || document.visibilityState !== 'hidden') {
        this.refetch().catch(() => {});
      }
    }, interval);
  }

  state() {
    this.version();
    return this.query.state;
  }

  selectedData() {
    const state = this.state();
    let data = state.data;
    if (data === undefined && this.options.placeholderData !== undefined) {
      data = typeof this.options.placeholderData === 'function'
        ? this.options.placeholderData(this.previousData, this.query)
        : this.options.placeholderData;
    }
    return this.options.select && data !== undefined
      ? this.options.select(data)
      : data;
  }

  trackSuspense() {
    const state = this.state();
    if (!this.options.suspense || state.status !== 'pending') return;
    const suspense = getSuspenseContext();
    if (suspense && this.query.promise) {
      suspense.track({
        loading: () => this.query.state.fetchStatus !== 'idle',
        promise: () => this.query.promise,
      });
    }
  }

  readData() {
    this.trackSuspense();
    const state = this.state();
    if (state.status === 'error') {
      const shouldThrow = this.options.suspense
        || (typeof this.options.throwOnError === 'function'
          ? this.options.throwOnError(state.error, this.query)
          : this.options.throwOnError);
      if (shouldThrow) throw state.error;
    }
    return this.selectedData();
  }

  result() {
    const observer = this;
    const status = () => {
      const state = observer.state();
      return state.data === undefined && observer.options.placeholderData !== undefined
        ? 'success'
        : state.status;
    };
    const fetchStatus = () => observer.state().fetchStatus;
    return {
      data: () => observer.readData(),
      dataUpdatedAt: () => observer.state().dataUpdatedAt,
      error: () => observer.state().error,
      errorUpdateCount: () => observer.state().errorUpdateCount,
      errorUpdatedAt: () => observer.state().errorUpdatedAt,
      failureCount: () => observer.state().failureCount,
      failureReason: () => observer.state().failureReason,
      fetchStatus,
      isEnabled: () => enabled(observer.options, observer.query),
      isError: () => status() === 'error',
      isFetched: () => observer.state().dataUpdatedAt > 0 || observer.state().errorUpdatedAt > 0,
      isFetchedAfterMount: () => Math.max(
        observer.state().dataUpdatedAt,
        observer.state().errorUpdatedAt
      ) > observer.mountedAt,
      isFetching: () => fetchStatus() === 'fetching',
      isInitialLoading: () => status() === 'pending' && fetchStatus() === 'fetching',
      isLoading: () => status() === 'pending' && fetchStatus() === 'fetching',
      isLoadingError: () => status() === 'error' && observer.state().data === undefined,
      isPaused: () => fetchStatus() === 'paused',
      isPending: () => status() === 'pending',
      isPlaceholderData: () => observer.state().data === undefined
        && observer.options.placeholderData !== undefined,
      isRefetchError: () => status() === 'error' && observer.state().data !== undefined,
      isRefetching: () => fetchStatus() === 'fetching' && status() !== 'pending',
      isStale: () => {
        observer.version();
        return observer.query.isStale();
      },
      isSuccess: () => status() === 'success',
      promise: () => observer.query.promise || Promise.resolve(observer.query.state.data),
      refetch: (options = {}) => observer.query.fetch(observer.options, {
        cancelRefetch: options.cancelRefetch !== false,
      }).catch((error) => {
        if (options.throwOnError) throw error;
        return observer.query.state.data;
      }),
      status,
    };
  }

  dispose() {
    clearInterval(this.interval);
    if (this.query && this.unsubscribe && this.subscribed) {
      this.query.removeObserver(this.unsubscribe);
    }
    this.unsubscribe = null;
  }
}

export class QueriesObserver {
  constructor(client, optionsInput, config = {}) {
    this.client = client;
    this.optionsInput = optionsInput;
    this.config = config;
    this.entries = [];
    this.results = [];
    const [version, setVersion] = config.reactive || createSignal(0);
    this.version = version;
    this.bump = () => setVersion((value) => value + 1);
    this.rebuild(resolveOptions(this.optionsInput));
    createEffect(() => {
      this.rebuild(resolveOptions(this.optionsInput));
      return () => this.clear();
    });
    onCleanup(() => this.clear());
  }

  setOptionsInput(optionsInput, config = this.config) {
    this.optionsInput = optionsInput;
    this.config = config;
    this.rebuild(resolveOptions(optionsInput), false);
  }

  rebuild(input, shouldNotify = true) {
    this.clear();
    const queries = typeof input.queries === 'function'
      ? input.queries()
      : input.queries;
    const nextResults = [];
    for (const inputOptions of queries || []) {
      const options = this.client.defaultQueryOptions({
        ...resolveOptions(inputOptions),
        suspense: this.config.suspense,
      });
      const query = this.client.getQueryCache().build(this.client, options);
      const listener = this.bump;
      if (options.subscribed !== false) query.addObserver(listener);
      const observer = Object.create(QueryObserver.prototype);
      Object.assign(observer, {
        client: this.client,
        config: this.config,
        mountedAt: Date.now(),
        options,
        previousData: undefined,
        query,
        version: this.version,
      });
      nextResults.push(observer.result());
      this.entries.push({ listener, options, query });
      if (enabled(options, query)
        && options.subscribed !== false
        && (query.state.data === undefined
          || options.refetchOnMount === 'always'
          || (query.isStale() && options.refetchOnMount !== false))
        && query.state.fetchStatus === 'idle') {
        query.fetch(options).catch(() => {});
      }
    }
    this.results.splice(0, this.results.length, ...nextResults);
    if (shouldNotify) this.bump();
  }

  clear() {
    for (const entry of this.entries) {
      if (entry.options.subscribed !== false) {
        entry.query.removeObserver(entry.listener);
      }
    }
    this.entries = [];
  }
}

function infiniteOptions(input) {
  const options = resolveOptions(input);
  const queryFn = options.queryFn;
  return {
    ...options,
    _infiniteQueryFn: queryFn,
    queryFn: async (context) => {
      const pageParam = options.initialPageParam;
      const page = await queryFn({ ...context, pageParam, direction: 'forward' });
      return { pages: [page], pageParams: [pageParam] };
    },
  };
}

export class InfiniteQueryObserver extends QueryObserver {
  constructor(client, optionsInput, config = {}) {
    const wrapped = () => infiniteOptions(optionsInput);
    super(client, wrapped, config);
    this.fetchingNext = false;
    this.fetchingPrevious = false;
    this.hasNextError = false;
    this.hasPreviousError = false;
  }

  setOptionsInput(optionsInput, config = this.config) {
    super.setOptionsInput(() => infiniteOptions(optionsInput), config);
  }

  async fetchPage(direction, options = {}) {
    const current = this.query.state.data || { pages: [], pageParams: [] };
    const pages = current.pages || [];
    const pageParams = current.pageParams || [];
    const queryFn = this.options._infiniteQueryFn;
    const derived = direction === 'forward'
      ? this.options.getNextPageParam?.(
        pages[pages.length - 1],
        pages,
        pageParams[pageParams.length - 1],
        pageParams
      )
      : this.options.getPreviousPageParam?.(pages[0], pages, pageParams[0], pageParams);
    const pageParam = options.pageParam !== undefined ? options.pageParam : derived;
    if (pageParam == null && pages.length) return current;
    if (direction === 'forward') {
      this.fetchingNext = true;
      this.hasNextError = false;
    } else {
      this.fetchingPrevious = true;
      this.hasPreviousError = false;
    }
    this.query.setState({ fetchStatus: 'fetching' });
    this.bump();
    try {
      const controller = new AbortController();
      const page = await queryFn({
        client: this.client,
        direction,
        meta: this.options.meta,
        pageParam,
        queryKey: this.query.queryKey,
        signal: controller.signal,
      });
      let nextPages = direction === 'forward' ? [...pages, page] : [page, ...pages];
      let nextParams = direction === 'forward'
        ? [...pageParams, pageParam]
        : [pageParam, ...pageParams];
      if (this.options.maxPages && nextPages.length > this.options.maxPages) {
        if (direction === 'forward') {
          nextPages = nextPages.slice(-this.options.maxPages);
          nextParams = nextParams.slice(-this.options.maxPages);
        } else {
          nextPages = nextPages.slice(0, this.options.maxPages);
          nextParams = nextParams.slice(0, this.options.maxPages);
        }
      }
      return this.query.setData({ pages: nextPages, pageParams: nextParams });
    } catch (error) {
      if (direction === 'forward') this.hasNextError = true;
      else this.hasPreviousError = true;
      this.query.setState({ error, errorUpdatedAt: Date.now(), status: 'error' });
      throw error;
    } finally {
      this.fetchingNext = false;
      this.fetchingPrevious = false;
      this.query.setState({ fetchStatus: 'idle' });
      this.bump();
    }
  }

  result() {
    const result = super.result();
    return {
      ...result,
      fetchNextPage: (options) => this.fetchPage('forward', options),
      fetchPreviousPage: (options) => this.fetchPage('backward', options),
      hasNextPage: () => {
        const data = this.state().data;
        if (!data?.pages.length || !this.options.getNextPageParam) return false;
        return this.options.getNextPageParam(
          data.pages[data.pages.length - 1],
          data.pages,
          data.pageParams[data.pageParams.length - 1],
          data.pageParams
        ) != null;
      },
      hasPreviousPage: () => {
        const data = this.state().data;
        if (!data?.pages.length || !this.options.getPreviousPageParam) return false;
        return this.options.getPreviousPageParam(
          data.pages[0],
          data.pages,
          data.pageParams[0],
          data.pageParams
        ) != null;
      },
      isFetchNextPageError: () => {
        this.version();
        return this.hasNextError;
      },
      isFetchingNextPage: () => {
        this.version();
        return this.fetchingNext;
      },
      isFetchPreviousPageError: () => {
        this.version();
        return this.hasPreviousError;
      },
      isFetchingPreviousPage: () => {
        this.version();
        return this.fetchingPrevious;
      },
    };
  }
}
