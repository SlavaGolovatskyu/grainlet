import { isServer } from '../env.js';
import { currentComponent } from '../reactive-context/reactive-context.js';
import { untrack } from '../untrack/untrack.js';

export function onMount(fn) {
  if (typeof fn !== 'function') {
    throw new TypeError('onMount expects a function');
  }
  if (isServer()) return;
  if (!currentComponent) {
    queueMicrotask(() => untrack(fn));
    return;
  }
  if (currentComponent._effectsInitialized) return;
  currentComponent._mountCallbacks.push(fn);
}
