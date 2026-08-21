import { pushEffect, popEffect, currentComponent } from '../reactive-context/reactive-context.js';
import { isServer } from '../env.js';
import { emitDevtools } from '../../devtools/hook.js';

function clearDeps(effect) {
  if (effect._deps) {
    effect._deps.forEach((unsubscribe) => unsubscribe(effect));
    effect._deps.clear();
  }
}

function runCleanups(effect, cleanupFnRef) {
  if (cleanupFnRef.current) {
    try {
      cleanupFnRef.current();
    } catch (error) {
      console.error('Error in effect cleanup:', error);
    }
    cleanupFnRef.current = null;
  }

  if (effect._cleanups) {
    effect._cleanups.forEach((cleanup) => {
      try {
        cleanup();
      } catch (error) {
        console.error('Error in onCleanup callback:', error);
      }
    });
    effect._cleanups = [];
  }
}

function createTrackedEffect(fn, { registerOnComponent } = {}) {
  const cleanupFnRef = { current: null };

  const effect = () => {
    if (effect._disabled) {
      return;
    }

    emitDevtools('effect:run', { effect });
    clearDeps(effect);
    runCleanups(effect, cleanupFnRef);

    if (!effect._deps) {
      effect._deps = new Set();
    }

    const previous = pushEffect(effect);
    let result;
    try {
      result = fn();
    } finally {
      popEffect(previous);
    }

    if (typeof result === 'function') {
      cleanupFnRef.current = result;
    }
  };

  effect._cleanups = [];
  effect._deps = new Set();
  effect._disabled = false;
  emitDevtools('effect:create', { effect });

  const dispose = () => {
    if (effect._disabled) {
      return;
    }
    clearDeps(effect);
    runCleanups(effect, cleanupFnRef);
    effect._disabled = true;
    emitDevtools('effect:dispose', { effect });
  };

  effect._dispose = dispose;

  if (registerOnComponent && currentComponent) {
    if (!currentComponent._effectsInitialized) {
      currentComponent._effects.push(effect);
      effect();
    } else {
      return () => {};
    }
  } else {
    if (currentComponent) {
      if (!currentComponent._bindings) {
        currentComponent._bindings = [];
      }
      currentComponent._bindings.push(dispose);
    }
    effect();
  }

  return dispose;
}

export function createEffect(fn) {
  // Side effects (intervals, DOM, fetch) do not run during SSR.
  if (isServer()) {
    return () => {};
  }
  return createTrackedEffect(fn, { registerOnComponent: true });
}

/** DOM text/prop bindings — always subscribe; disposed via node or owner._bindings. */
export function createBindingEffect(fn) {
  return createTrackedEffect(fn, { registerOnComponent: false });
}
