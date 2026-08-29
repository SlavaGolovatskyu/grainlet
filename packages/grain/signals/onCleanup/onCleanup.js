import { currentComponent, currentEffect } from '../reactive-context/reactive-context.js';

export function onCleanup(fn) {
  const effect = currentEffect;
  const component = currentComponent;

  if (!effect && !component) {
    throw new Error('onCleanup must be called within an effect or a component');
  }

  // Component body (not a nested createEffect callback).
  if (component?._inRender) {
    if (!component._cleanups) {
      component._cleanups = [];
    }
    component._cleanups.push(fn);

    return () => {
      const index = component._cleanups.indexOf(fn);
      if (index > -1) {
        component._cleanups.splice(index, 1);
      }
    };
  }

  if (effect) {
    if (!effect._cleanups) {
      effect._cleanups = [];
    }
    effect._cleanups.push(fn);

    return () => {
      const index = effect._cleanups.indexOf(fn);
      if (index > -1) {
        effect._cleanups.splice(index, 1);
      }
    };
  }

  if (!component._cleanups) {
    component._cleanups = [];
  }
  component._cleanups.push(fn);

  return () => {
    const index = component._cleanups.indexOf(fn);
    if (index > -1) {
      component._cleanups.splice(index, 1);
    }
  };
}
