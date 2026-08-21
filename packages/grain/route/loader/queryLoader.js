export function queryLoader(options) {
  return async (args) => {
    if (!args.queryClient) {
      throw new Error('queryLoader requires Router queryClient');
    }
    const resolved = typeof options === 'function' ? options(args) : options;
    if (!resolved?.queryKey) {
      throw new Error('queryLoader requires a queryKey');
    }
    const onAbort = () => {
      args.queryClient.cancelQueries({
        exact: true,
        queryKey: resolved.queryKey,
      }).catch(() => {});
    };
    args.signal?.addEventListener?.('abort', onAbort, { once: true });
    try {
      return await args.queryClient.ensureQueryData(resolved);
    } finally {
      args.signal?.removeEventListener?.('abort', onAbort);
    }
  };
}
