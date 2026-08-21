import type { Component } from './component.js';
import type { QueryClient } from './query.js';

export interface DevtoolsRecord {
  id: string;
  type: string;
  lastEvent: string;
  timestamp: number;
  name?: string;
  value?: unknown;
}

export interface DevtoolsHook {
  emit(type: string, payload?: Record<string, unknown>): void;
  getSnapshot(): DevtoolsRecord[];
  subscribe(listener: (type: string, record: DevtoolsRecord) => void): () => void;
}

export declare function installDevtoolsHook(target?: typeof globalThis): DevtoolsHook;
export declare function getDevtoolsHook(): DevtoolsHook | null;
export declare const QueryDevtools: Component<{ client: QueryClient }>;
export declare const GrainletDevtools: Component<{ queryClient?: QueryClient }>;
