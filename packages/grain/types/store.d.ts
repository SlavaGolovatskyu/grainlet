export type StorePath = string | number | symbol;

export interface SetStore<T extends object> {
  (value: Partial<T> | ((state: T) => T)): void;
  <K1 extends keyof T>(
    key: K1,
    value: T[K1] | ((previous: T[K1]) => T[K1])
  ): void;
  (...pathAndValue: [...StorePath[], unknown]): void;
}

export declare const STORE_RAW: unique symbol;

export declare function createStore<T extends object>(
  initialValue: T
): [store: T, setStore: SetStore<T>];

export declare function produce<T>(mutator: (draft: T) => void): (state: T) => T;
export declare function reconcile<T>(value: T): (state: T) => T;
