import { createContext, useContext } from '../index.js';

export const QueryClientContext = createContext(null);
export const QueryErrorResetBoundaryContext = createContext(null);
export const IsRestoringContext = createContext(() => false);

export function useQueryClient(explicitClient) {
  if (explicitClient) return explicitClient;
  const client = useContext(QueryClientContext);
  if (!client) {
    throw new Error(
      'useQueryClient: no QueryClientProvider found. Wrap your tree in <QueryClientProvider>.'
    );
  }
  return client;
}

export function useQueryErrorResetBoundary() {
  return useContext(QueryErrorResetBoundaryContext) || {
    clear() {},
    isReset: () => false,
    reset() {},
  };
}

export function useIsRestoring() {
  return useContext(IsRestoringContext);
}
