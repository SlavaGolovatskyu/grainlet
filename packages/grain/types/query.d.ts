import type { JSX } from '../jsx-runtime.js';
import type { Accessor } from './signals.js';
import type {
  FocusManager,
  OnlineManager,
  Updater as UtilityUpdater,
} from './utils.js';

export type QueryKey = readonly unknown[];
export type MutationKey = readonly unknown[];
export type QueryStatus = 'pending' | 'error' | 'success';
export type FetchStatus = 'fetching' | 'paused' | 'idle';
export type MutationStatus = 'idle' | 'pending' | 'error' | 'success';
export type MaybePromise<T> = T | Promise<T>;
export type Updater<TInput, TOutput = TInput> =
  UtilityUpdater<TInput, TOutput>;

export interface QueryFunctionContext<
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = never,
> {
  client: QueryClient;
  queryKey: TQueryKey;
  signal: AbortSignal;
  meta?: Record<string, unknown>;
  pageParam: TPageParam;
  direction?: 'forward' | 'backward';
}

export type QueryFunction<
  TData,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = never,
> = (context: QueryFunctionContext<TQueryKey, TPageParam>) => MaybePromise<TData>;

export interface QueryFilters {
  queryKey?: QueryKey;
  exact?: boolean;
  type?: 'active' | 'inactive' | 'all';
  stale?: boolean;
  fetchStatus?: FetchStatus;
  predicate?: (query: Query) => boolean;
}

export interface MutationFilters {
  mutationKey?: MutationKey;
  exact?: boolean;
  status?: MutationStatus;
  predicate?: (mutation: Mutation) => boolean;
}

export interface QueryState<TData = unknown, TError = Error> {
  data: TData | undefined;
  dataUpdatedAt: number;
  error: TError | null;
  errorUpdatedAt: number;
  errorUpdateCount: number;
  failureCount: number;
  failureReason: TError | null;
  fetchStatus: FetchStatus;
  isInvalidated: boolean;
  status: QueryStatus;
}

export interface QueryOptions<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> {
  queryKey: TQueryKey | Accessor<TQueryKey>;
  queryFn?: QueryFunction<TQueryFnData, TQueryKey> | typeof skipToken;
  enabled?: boolean | ((query: Query<TQueryFnData, TError>) => boolean);
  gcTime?: number;
  initialData?: TQueryFnData | (() => TQueryFnData | undefined);
  initialDataUpdatedAt?: number | (() => number | undefined);
  meta?: Record<string, unknown>;
  networkMode?: 'online' | 'always' | 'offlineFirst';
  placeholderData?:
    | TQueryFnData
    | ((previousData: TQueryFnData | undefined, query: Query) => TQueryFnData);
  queryKeyHashFn?: (queryKey: TQueryKey) => string;
  refetchInterval?: number | false | ((query: Query) => number | false | undefined);
  refetchIntervalInBackground?: boolean;
  refetchOnMount?: boolean | 'always';
  refetchOnReconnect?: boolean | 'always';
  refetchOnWindowFocus?: boolean | 'always';
  retry?: boolean | number | ((failureCount: number, error: TError) => boolean);
  retryDelay?: number | ((failureCount: number, error: TError) => number);
  select?: (data: TQueryFnData) => TData;
  staleTime?: number | 'static' | ((query: Query) => number | 'static');
  structuralSharing?: boolean;
  subscribed?: boolean;
  throwOnError?: boolean | ((error: TError, query: Query) => boolean);
}

export type QueryHookOptions<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> =
  | QueryOptions<TQueryFnData, TError, TData, TQueryKey>
  | Accessor<QueryOptions<TQueryFnData, TError, TData, TQueryKey>>;

export interface RefetchOptions {
  cancelRefetch?: boolean;
  throwOnError?: boolean;
}

export interface QueryResult<TData = unknown, TError = Error> {
  data: Accessor<TData | undefined>;
  dataUpdatedAt: Accessor<number>;
  error: Accessor<TError | null>;
  errorUpdateCount: Accessor<number>;
  errorUpdatedAt: Accessor<number>;
  failureCount: Accessor<number>;
  failureReason: Accessor<TError | null>;
  fetchStatus: Accessor<FetchStatus>;
  isEnabled: Accessor<boolean>;
  isError: Accessor<boolean>;
  isFetched: Accessor<boolean>;
  isFetchedAfterMount: Accessor<boolean>;
  isFetching: Accessor<boolean>;
  isInitialLoading: Accessor<boolean>;
  isLoading: Accessor<boolean>;
  isLoadingError: Accessor<boolean>;
  isPaused: Accessor<boolean>;
  isPending: Accessor<boolean>;
  isPlaceholderData: Accessor<boolean>;
  isRefetchError: Accessor<boolean>;
  isRefetching: Accessor<boolean>;
  isStale: Accessor<boolean>;
  isSuccess: Accessor<boolean>;
  promise: Accessor<Promise<TData>>;
  refetch: (options?: RefetchOptions) => Promise<TData | undefined>;
  status: Accessor<QueryStatus>;
}

export interface DefinedQueryResult<TData = unknown, TError = Error>
  extends QueryResult<TData, TError> {
  data: Accessor<TData>;
}

export interface InfiniteData<TData, TPageParam = unknown> {
  pages: TData[];
  pageParams: TPageParam[];
}

export interface InfiniteQueryOptions<
  TQueryFnData = unknown,
  TError = Error,
  TData = InfiniteData<TQueryFnData>,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
> extends Omit<QueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'queryFn' | 'select'> {
  queryFn: QueryFunction<TQueryFnData, TQueryKey, TPageParam>;
  initialPageParam: TPageParam;
  getNextPageParam?: (
    lastPage: TQueryFnData,
    allPages: TQueryFnData[],
    lastPageParam: TPageParam,
    allPageParams: TPageParam[]
  ) => TPageParam | null | undefined;
  getPreviousPageParam?: (
    firstPage: TQueryFnData,
    allPages: TQueryFnData[],
    firstPageParam: TPageParam,
    allPageParams: TPageParam[]
  ) => TPageParam | null | undefined;
  maxPages?: number;
  select?: (data: InfiniteData<TQueryFnData, TPageParam>) => TData;
}

export interface InfiniteQueryResult<TData = unknown, TError = Error>
  extends QueryResult<TData, TError> {
  fetchNextPage: (options?: { pageParam?: unknown }) => Promise<TData>;
  fetchPreviousPage: (options?: { pageParam?: unknown }) => Promise<TData>;
  hasNextPage: Accessor<boolean>;
  hasPreviousPage: Accessor<boolean>;
  isFetchNextPageError: Accessor<boolean>;
  isFetchingNextPage: Accessor<boolean>;
  isFetchPreviousPageError: Accessor<boolean>;
  isFetchingPreviousPage: Accessor<boolean>;
}

export interface MutationFunctionContext {
  client: QueryClient;
  meta?: Record<string, unknown>;
  mutationKey?: MutationKey;
}

export interface MutationOptions<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TOnMutateResult = unknown,
> {
  mutationFn?: (
    variables: TVariables,
    context: MutationFunctionContext
  ) => MaybePromise<TData>;
  mutationKey?: MutationKey;
  gcTime?: number;
  meta?: Record<string, unknown>;
  networkMode?: 'online' | 'always' | 'offlineFirst';
  onMutate?: (
    variables: TVariables,
    context: { client: QueryClient }
  ) => MaybePromise<TOnMutateResult>;
  onSuccess?: (
    data: TData,
    variables: TVariables,
    onMutateResult: TOnMutateResult,
    context: { client: QueryClient }
  ) => MaybePromise<void>;
  onError?: (
    error: TError,
    variables: TVariables,
    onMutateResult: TOnMutateResult | undefined,
    context: { client: QueryClient }
  ) => MaybePromise<void>;
  onSettled?: (
    data: TData | undefined,
    error: TError | null,
    variables: TVariables,
    onMutateResult: TOnMutateResult | undefined,
    context: { client: QueryClient }
  ) => MaybePromise<void>;
  retry?: boolean | number | ((failureCount: number, error: TError) => boolean);
  retryDelay?: number | ((failureCount: number, error: TError) => number);
  scope?: { id: string };
  throwOnError?: boolean | ((error: TError) => boolean);
}

export type MutateOptions<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TOnMutateResult = unknown,
> = Pick<
  MutationOptions<TData, TError, TVariables, TOnMutateResult>,
  'onSuccess' | 'onError' | 'onSettled'
>;

export interface MutationResult<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TOnMutateResult = unknown,
> {
  context: Accessor<TOnMutateResult | undefined>;
  data: Accessor<TData | undefined>;
  error: Accessor<TError | null>;
  failureCount: Accessor<number>;
  failureReason: Accessor<TError | null>;
  isError: Accessor<boolean>;
  isIdle: Accessor<boolean>;
  isPaused: Accessor<boolean>;
  isPending: Accessor<boolean>;
  isSuccess: Accessor<boolean>;
  mutate: (variables: TVariables, options?: MutateOptions<TData, TError, TVariables, TOnMutateResult>) => void;
  mutateAsync: (variables: TVariables, options?: MutateOptions<TData, TError, TVariables, TOnMutateResult>) => Promise<TData>;
  reset: () => void;
  status: Accessor<MutationStatus>;
  submittedAt: Accessor<number>;
  variables: Accessor<TVariables | undefined>;
}

export class Query<TData = unknown, TError = Error> {
  queryKey: QueryKey;
  queryHash: string;
  state: QueryState<TData, TError>;
  options: QueryOptions<any, TError, TData>;
  promise: Promise<TData> | null;
  observers: Set<unknown>;
  isStale(): boolean;
  setData(updater: Updater<TData | undefined, TData>, options?: { updatedAt?: number; structuralSharing?: boolean }): TData;
  fetch(options?: QueryOptions<any, TError, TData>, fetchOptions?: RefetchOptions): Promise<TData>;
  cancel(options?: { silent?: boolean }): Promise<unknown>;
  reset(): void;
}

export class QueryCache {
  constructor(config?: Record<string, Function>);
  build(client: QueryClient, options: QueryOptions): Query;
  find(filters: QueryFilters | QueryKey): Query | undefined;
  findAll(filters?: QueryFilters): Query[];
  get(queryHash: string): Query | undefined;
  getAll(): Query[];
  remove(query: Query): void;
  clear(): void;
  subscribe(listener: (event: { type: string; query: Query }) => void): () => void;
}

export class Mutation<TData = unknown, TError = Error, TVariables = unknown> {
  mutationId: number;
  mutationHash: string;
  options: MutationOptions<TData, TError, TVariables>;
  state: {
    context: unknown;
    data: TData | undefined;
    error: TError | null;
    failureCount: number;
    failureReason: TError | null;
    isPaused: boolean;
    status: MutationStatus;
    submittedAt: number;
    variables: TVariables | undefined;
  };
  execute(variables: TVariables, options?: MutateOptions<TData, TError, TVariables>): Promise<TData>;
  reset(): void;
}

export class MutationCache {
  constructor(config?: Record<string, Function>);
  build(client: QueryClient, options: MutationOptions): Mutation;
  find(filters?: MutationFilters): Mutation | undefined;
  findAll(filters?: MutationFilters): Mutation[];
  remove(mutation: Mutation): void;
  clear(): void;
  subscribe(listener: (event: { type: string; mutation: Mutation }) => void): () => void;
}

export interface QueryClientConfig {
  queryCache?: QueryCache;
  mutationCache?: MutationCache;
  defaultOptions?: {
    queries?: Partial<QueryOptions>;
    mutations?: Partial<MutationOptions>;
  };
}

export class QueryClient {
  constructor(config?: QueryClientConfig);
  mount(): void;
  unmount(): void;
  dispose(): void;
  clear(): void;
  getQueryCache(): QueryCache;
  getMutationCache(): MutationCache;
  getDefaultOptions(): QueryClientConfig['defaultOptions'];
  setDefaultOptions(options: QueryClientConfig['defaultOptions']): void;
  setQueryDefaults(queryKey: QueryKey, options: Partial<QueryOptions>): void;
  getQueryDefaults(queryKey: QueryKey): Partial<QueryOptions>;
  setMutationDefaults(mutationKey: MutationKey, options: Partial<MutationOptions>): void;
  getMutationDefaults(mutationKey: MutationKey): Partial<MutationOptions>;
  fetchQuery<TData>(options: QueryOptions<TData>): Promise<TData>;
  prefetchQuery(options: QueryOptions): Promise<void>;
  ensureQueryData<TData>(options: QueryOptions<TData> & { revalidateIfStale?: boolean }): Promise<TData>;
  fetchInfiniteQuery<TData, TError = Error, TPageParam = unknown>(
    options: InfiniteQueryOptions<TData, TError, InfiniteData<TData, TPageParam>, QueryKey, TPageParam>
  ): Promise<InfiniteData<TData, TPageParam>>;
  prefetchInfiniteQuery(options: InfiniteQueryOptions): Promise<void>;
  getQueryData<TData = unknown>(queryKey: QueryKey): TData | undefined;
  getQueryState<TData = unknown, TError = Error>(queryKey: QueryKey): QueryState<TData, TError> | undefined;
  getQueriesData<TData = unknown>(filters?: QueryFilters): Array<[QueryKey, TData | undefined]>;
  setQueryData<TData>(queryKey: QueryKey, updater: Updater<TData | undefined, TData>, options?: object): TData;
  setQueriesData<TData>(filters: QueryFilters, updater: Updater<TData | undefined, TData>, options?: object): Array<[QueryKey, TData]>;
  invalidateQueries(filters?: QueryFilters, options?: { refetchType?: QueryFilters['type'] | 'none' }): Promise<unknown>;
  refetchQueries(filters?: QueryFilters, options?: RefetchOptions): Promise<unknown>;
  cancelQueries(filters?: QueryFilters, options?: { silent?: boolean }): Promise<unknown>;
  resetQueries(filters?: QueryFilters, options?: RefetchOptions & { refetchType?: 'none' }): Promise<unknown>;
  removeQueries(filters?: QueryFilters): void;
  isFetching(filters?: QueryFilters): number;
  isMutating(filters?: MutationFilters): number;
  resumePausedMutations(): Promise<void>;
}

export interface QueryClientProviderProps {
  client: QueryClient;
  children?: JSX.Element | ((client: QueryClient) => JSX.Element);
}

export interface QueryErrorResetBoundaryValue {
  clear(): void;
  isReset: Accessor<boolean>;
  reset(): void;
}

export declare function QueryClientProvider(props: QueryClientProviderProps): any;
export declare function QueryErrorResetBoundary(props: {
  client?: QueryClient;
  children?: JSX.Element | ((value: QueryErrorResetBoundaryValue) => JSX.Element);
}): any;
export declare function HydrationBoundary(props: {
  client?: QueryClient;
  state: DehydratedState;
  options?: object;
  children?: JSX.Element;
}): any;
export declare function IsRestoringProvider(props: {
  value: boolean | Accessor<boolean>;
  children?: JSX.Element;
}): any;

export declare function useQuery<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(options: QueryHookOptions<TQueryFnData, TError, TData, TQueryKey>, client?: QueryClient): QueryResult<TData, TError>;
export declare function useSuspenseQuery<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(options: QueryHookOptions<TQueryFnData, TError, TData, TQueryKey>, client?: QueryClient): DefinedQueryResult<TData, TError>;
export declare function useInfiniteQuery<
  TQueryFnData = unknown,
  TError = Error,
  TData = InfiniteData<TQueryFnData>,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
>(options: InfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>, client?: QueryClient): InfiniteQueryResult<TData, TError>;
export declare function useSuspenseInfiniteQuery<
  TQueryFnData = unknown,
  TError = Error,
  TData = InfiniteData<TQueryFnData>,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
>(options: InfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>, client?: QueryClient): InfiniteQueryResult<TData, TError> & { data: Accessor<TData> };
export declare function useQueries<T extends readonly QueryHookOptions[]>(
  options: { queries: T | Accessor<T>; combine?: (results: QueryResult[]) => unknown },
  client?: QueryClient
): QueryResult[] | Accessor<unknown>;
export declare function useSuspenseQueries<T extends readonly QueryHookOptions[]>(
  options: { queries: T | Accessor<T>; combine?: (results: DefinedQueryResult[]) => unknown },
  client?: QueryClient
): DefinedQueryResult[] | Accessor<unknown>;
export declare function useMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TOnMutateResult = unknown,
>(options: MutationOptions<TData, TError, TVariables, TOnMutateResult>, client?: QueryClient): MutationResult<TData, TError, TVariables, TOnMutateResult>;
export declare function useMutationState<TResult = unknown>(options?: {
  filters?: MutationFilters;
  select?: (mutation: Mutation) => TResult;
}, client?: QueryClient): Accessor<TResult[]>;
export declare function useIsFetching(filters?: QueryFilters, client?: QueryClient): Accessor<number>;
export declare function useIsMutating(filters?: MutationFilters, client?: QueryClient): Accessor<number>;
export declare function usePrefetchQuery(options: QueryHookOptions, client?: QueryClient): void;
export declare function usePrefetchInfiniteQuery(options: InfiniteQueryOptions, client?: QueryClient): void;
export declare function useQueryClient(client?: QueryClient): QueryClient;
export declare function useQueryErrorResetBoundary(): QueryErrorResetBoundaryValue;
export declare function useIsRestoring(): Accessor<boolean>;

export interface DehydratedState {
  queries: Array<{ queryHash: string; queryKey: QueryKey; state: QueryState; meta?: object }>;
  mutations: Array<{ mutationKey?: MutationKey; state: object; meta?: object }>;
}

export declare function dehydrate(client: QueryClient, options?: object): DehydratedState;
export declare function hydrate(client: QueryClient, state: DehydratedState, options?: object): void;
export declare function hashKey(queryKey: unknown): string;
export declare function partialMatchKey(candidate: unknown, filter: unknown): boolean;
export declare function replaceEqualDeep<T>(previous: T, next: T): T;
export declare function queryOptions<T extends QueryOptions>(options: T): T;
export declare function infiniteQueryOptions<T extends InfiniteQueryOptions>(options: T): T;
export declare function mutationOptions<T extends MutationOptions>(options: T): T;
export declare function keepPreviousData<T>(previousData: T): T;
export declare const skipToken: unique symbol;
export declare function defaultShouldDehydrateQuery(query: Query): boolean;
export declare function defaultShouldDehydrateMutation(mutation: Mutation): boolean;

export interface EnvironmentManager {
  subscribe(listener: (value: boolean) => void): () => void;
  setFocused?(focused: boolean | undefined): void;
  setOnline?(online: boolean): void;
  isFocused?(): boolean;
  isOnline?(): boolean;
}
export declare const focusManager: FocusManager;
export declare const onlineManager: OnlineManager;
export declare const QueryClientContext: any;
export declare const QueryErrorResetBoundaryContext: any;
export declare const IsRestoringContext: any;
