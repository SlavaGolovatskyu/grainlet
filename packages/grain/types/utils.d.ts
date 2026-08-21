export type Updater<TInput, TOutput = TInput> =
  | TOutput
  | ((input: TInput) => TOutput);

export interface BackoffOptions {
  base?: number;
  factor?: number;
  maximum?: number;
}

export type Path = string | readonly (string | number)[];
export type TypedArray = Exclude<ArrayBufferView, DataView>;

export interface DebounceOptions {
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
}

export interface DebouncedFunction<
  T extends (...args: any[]) => any,
> {
  (
    this: ThisParameterType<T>,
    ...args: Parameters<T>
  ): ReturnType<T> | undefined;
  cancel(): void;
  flush(): ReturnType<T> | undefined;
  pending(): boolean;
}

export interface TimeoutOptions {
  reason?: unknown;
  signal?: AbortSignal | null;
}

export declare function isObject(value: unknown): value is object;
export declare function isPlainObject(
  value: unknown
): value is Record<string, unknown>;
export declare function functionalUpdate<TInput, TOutput = TInput>(
  updater: Updater<TInput, TOutput>,
  input: TInput
): TOutput;
export declare function resolveValue<TResult, TArgs extends unknown[] = []>(
  value: TResult | ((...args: TArgs) => TResult),
  ...args: TArgs
): TResult;
export declare function stableHash(value: unknown): string | undefined;
export declare function partialMatch(
  candidate: unknown,
  filter: unknown
): boolean;
export declare function replaceEqualDeep<T>(previous: T, next: T): T;
export declare function deepEqual(left: unknown, right: unknown): boolean;
export declare function deepClone<T>(value: T): T;

export declare function toPath(path: Path | null | undefined): Array<string | number>;
export declare function getIn<T = unknown>(
  object: unknown,
  path: Path,
  fallback?: T
): T;
export declare function setIn<TObject, TValue>(
  object: TObject,
  path: Path,
  value: TValue
): TObject | TValue;

export declare function isDefined<T>(
  value: T
): value is Exclude<T, null | undefined>;
export declare function isNullish(
  value: unknown
): value is null | undefined;
export declare function isString(value: unknown): value is string;
export declare function isNumber(value: unknown): value is number;
export declare function isBoolean(value: unknown): value is boolean;
export declare function isFunction(
  value: unknown
): value is (...args: any[]) => unknown;
export declare function isDate(value: unknown): value is Date;
export declare function isRegExp(value: unknown): value is RegExp;
export declare function isMap(
  value: unknown
): value is Map<unknown, unknown>;
export declare function isSet(value: unknown): value is Set<unknown>;
export declare function isTypedArray(
  value: unknown
): value is TypedArray;
export declare function isPromiseLike<T = unknown>(
  value: unknown
): value is PromiseLike<T>;

export declare function compact<T>(
  items: Iterable<T | null | undefined>
): T[];
export declare function pick<
  T extends object,
  K extends keyof T,
>(object: T, keys: Iterable<K>): Pick<T, K>;
export declare function omit<
  T extends object,
  K extends keyof T,
>(object: T, keys: Iterable<K>): Omit<T, K>;
export declare function groupBy<T, K extends PropertyKey>(
  items: Iterable<T>,
  selector: (item: T, index: number) => K
): Record<K, T[]>;
export declare function keyBy<T, K extends PropertyKey>(
  items: Iterable<T>,
  selector: (item: T, index: number) => K
): Record<K, T>;
export declare function uniqueBy<T, K = T>(
  items: Iterable<T>,
  selector?: (item: T, index: number) => K
): T[];

export declare function sleep(milliseconds: number): Promise<void>;
export declare function sleep<T>(milliseconds: number, value: T): Promise<T>;
export declare function exponentialBackoffDelay(
  attempt: number,
  options?: BackoffOptions
): number;
export declare function withTimeout<T>(
  promise: PromiseLike<T> | T,
  milliseconds: number,
  options?: TimeoutOptions
): Promise<T>;
export declare function throwIfAborted(
  signal?: AbortSignal | null
): void;
export declare function isAbortError(
  error: unknown
): error is Error & { name: 'AbortError' };

export declare function noop(...args: unknown[]): void;
export declare function identity<T>(value: T): T;
export declare function once<T extends (...args: any[]) => any>(
  callback: T
): (
  this: ThisParameterType<T>,
  ...args: Parameters<T>
) => ReturnType<T>;
export declare function debounce<T extends (...args: any[]) => any>(
  callback: T,
  wait: number,
  options?: DebounceOptions
): DebouncedFunction<T>;
export declare function throttle<T extends (...args: any[]) => any>(
  callback: T,
  wait: number,
  options?: Pick<DebounceOptions, 'leading' | 'trailing'>
): DebouncedFunction<T>;

export declare class Subscribable<T = void> {
  listeners: Set<(value: T) => void>;
  subscribe(listener: (value: T) => void): () => void;
  notify(value: T): void;
  protected onSubscribe?(): void;
  protected onUnsubscribe?(): void;
}

export declare class FocusManager extends Subscribable<boolean> {
  focused: boolean | undefined;
  cleanup: (() => void) | null;
  setFocused(focused: boolean | undefined): void;
  isFocused(): boolean;
}

export declare class OnlineManager extends Subscribable<boolean> {
  online: boolean;
  cleanup: (() => void) | null;
  setOnline(online: boolean): void;
  isOnline(): boolean;
}

export declare const focusManager: FocusManager;
export declare const onlineManager: OnlineManager;
