import { createEffect } from './createEffect/createEffect.js';
import { createSignal } from './createSignal/createSignal.js';
import {
  isTransitionPending,
  startTransition,
  subscribeTransition,
} from './scheduler.js';

const [transitionPending, setTransitionPending] =
  createSignal(isTransitionPending());
subscribeTransition(setTransitionPending);

export { startTransition };

export function useTransition() {
  return [transitionPending, startTransition];
}

export function createDeferred(source, options = {}) {
  if (typeof source !== 'function') {
    throw new TypeError('createDeferred expects an accessor');
  }
  const [deferred, setDeferred] = createSignal(source());
  createEffect(() => {
    const value = source();
    if (options.timeoutMs != null) {
      const timer = setTimeout(
        () => startTransition(() => setDeferred(value)),
        Math.max(0, options.timeoutMs)
      );
      return () => clearTimeout(timer);
    }
    startTransition(() => setDeferred(value));
  });
  return deferred;
}
