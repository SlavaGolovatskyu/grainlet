export function noop() {}

export function identity(value) {
  return value;
}

export function once(callback) {
  if (typeof callback !== 'function') {
    throw new TypeError('once requires a function');
  }
  let called = false;
  let result;
  return function onceWrapper(...args) {
    if (called) return result;
    result = callback.apply(this, args);
    called = true;
    return result;
  };
}

function normalizedDelay(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

export function debounce(callback, wait, options = {}) {
  if (typeof callback !== 'function') {
    throw new TypeError('debounce requires a function');
  }
  const delay = normalizedDelay(wait);
  const leading = options.leading === true;
  const trailing = options.trailing !== false;
  const maxWait = options.maxWait == null
    ? null
    : Math.max(delay, normalizedDelay(options.maxWait));
  if (!leading && !trailing) {
    throw new TypeError('debounce requires leading or trailing execution');
  }

  let timer = null;
  let maxTimer = null;
  let lastArgs = null;
  let lastContext;
  let result;

  const clearTimers = () => {
    if (timer !== null) clearTimeout(timer);
    if (maxTimer !== null) clearTimeout(maxTimer);
    timer = null;
    maxTimer = null;
  };

  const invoke = () => {
    if (lastArgs === null) return result;
    const args = lastArgs;
    const context = lastContext;
    lastArgs = null;
    lastContext = undefined;
    result = callback.apply(context, args);
    return result;
  };

  const finish = () => {
    if (trailing) invoke();
    else {
      lastArgs = null;
      lastContext = undefined;
    }
    clearTimers();
  };

  function debounced(...args) {
    const idle = timer === null;
    lastArgs = args;
    lastContext = this;

    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(finish, delay);

    if (maxWait !== null && maxTimer === null) {
      maxTimer = setTimeout(finish, maxWait);
    }

    if (idle && leading) invoke();
    return result;
  }

  debounced.cancel = () => {
    clearTimers();
    lastArgs = null;
    lastContext = undefined;
  };
  debounced.flush = () => {
    if (lastArgs !== null) invoke();
    clearTimers();
    return result;
  };
  debounced.pending = () => lastArgs !== null;

  return debounced;
}

export function throttle(callback, wait, options = {}) {
  const delay = normalizedDelay(wait);
  return debounce(callback, delay, {
    leading: options.leading !== false,
    trailing: options.trailing !== false,
    maxWait: delay,
  });
}
