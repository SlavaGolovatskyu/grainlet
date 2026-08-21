export function sleep(milliseconds, value) {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, milliseconds), value);
  });
}

export function exponentialBackoffDelay(
  attempt,
  { base = 1000, factor = 2, maximum = 30000 } = {}
) {
  return Math.min(base * factor ** Math.max(0, attempt), maximum);
}

function abortReason(signal) {
  if (signal?.reason !== undefined) return signal.reason;
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
}

export function throwIfAborted(signal) {
  if (signal?.aborted) throw abortReason(signal);
}

export function isAbortError(error) {
  return error !== null
    && typeof error === 'object'
    && error.name === 'AbortError';
}

export function withTimeout(promise, milliseconds, options = {}) {
  const delay = Number.isFinite(Number(milliseconds))
    ? Math.max(0, Number(milliseconds))
    : 0;
  const signal = options.signal;

  return new Promise((resolve, reject) => {
    let settled = false;
    let timer = null;

    const cleanup = () => {
      if (timer !== null) clearTimeout(timer);
      timer = null;
      signal?.removeEventListener?.('abort', onAbort);
    };
    const settle = (callback, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback(value);
    };
    const onAbort = () => settle(reject, abortReason(signal));

    if (signal?.aborted) {
      onAbort();
      return;
    }

    signal?.addEventListener?.('abort', onAbort, { once: true });
    timer = setTimeout(() => {
      let reason = options.reason;
      if (reason === undefined) {
        reason = new Error(`Timed out after ${delay} milliseconds`);
        reason.name = 'TimeoutError';
      }
      settle(reject, reason);
    }, delay);

    Promise.resolve(promise).then(
      (value) => settle(resolve, value),
      (error) => settle(reject, error)
    );
  });
}
