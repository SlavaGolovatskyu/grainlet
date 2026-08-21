import { currentEffect, currentComponent } from '../reactive-context/reactive-context.js';
import { scheduleEffect } from '../scheduler.js';
import { emitDevtools } from '../../devtools/hook.js';

// Track signal creation order per component to reuse signals across renders
export const componentSignalRegistry = new WeakMap();

export function createSignalInstance(initialValue) {
  let value = initialValue;
  const subscribers = new Set();

  const unsubscribe = (effect) => {
    subscribers.delete(effect);
  };

  const read = () => {
    if (currentEffect && !currentEffect._disabled) {
      subscribers.add(currentEffect);
      if (currentEffect._deps) {
        currentEffect._deps.add(unsubscribe);
      }
    }
    return value;
  };

  const write = (newValue) => {
    const next = typeof newValue === 'function' ? newValue(value) : newValue;
    if (Object.is(value, next)) {
      return;
    }
    value = next;
    emitDevtools('signal:update', { signal: read, value });
    // Copy subscribers so re-entrant subscribe/unsubscribe during notify is safe
    [...subscribers].forEach((effect) => {
      if (!effect._disabled) {
        scheduleEffect(effect);
      }
    });
  };

  emitDevtools('signal:create', { signal: read, value });

  return [read, write];
}

export function createSignal(initialValue) {
  if (currentComponent) {
    if (!componentSignalRegistry.has(currentComponent)) {
      componentSignalRegistry.set(currentComponent, { signals: [], index: 0 });
    }
    const registry = componentSignalRegistry.get(currentComponent);

    // Reuse existing signal on re-render (hooks-like call order)
    if (currentComponent._renderCount > 1 && registry.signals[registry.index]) {
      const signal = registry.signals[registry.index];
      registry.index++;
      return signal;
    }

    const [read, write] = createSignalInstance(initialValue);
    const signal = [read, write];
    registry.signals.push(signal);
    registry.index++;
    return signal;
  }

  const [read, write] = createSignalInstance(initialValue);
  return [read, write];
}
