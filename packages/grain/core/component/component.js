import {
  setCurrentComponent,
  currentComponent,
} from '../../signals/reactive-context/reactive-context.js';
import { createEffect } from '../../signals/createEffect/createEffect.js';
import { componentSignalRegistry } from '../../signals/createSignal/createSignal.js';
import { createDom, patchDom, adoptDom, unmountDomTree } from '../dom/dom.js';
import { createContentsHost } from '../dom/hosts.js';
import { getErrorBoundary } from '../flow/context.js';
import { componentStack } from '../dev/diagnostics.js';
import { emitDevtools } from '../../devtools/hook.js';

/** Ensure `type` is a createComponent factory (caches on `type.$$wrapped`). */
export function asComponentFactory(type) {
  if (type.$$component) return type;
  if (!type.$$wrapped) {
    type.$$wrapped = createComponent(type);
  }
  return type.$$wrapped;
}

const componentProto = {
  registerComponent() {
    // No-op: JSX passes function types directly
  },

  update(nextProps) {
    this._props = nextProps;
    if (this._mounted && this._renderEffect) {
      this._renderEffect();
    }
  },

  _mountChild(path, type, childProps, options = {}) {
    const factory = asComponentFactory(type);
    const existing = this._children.get(path);

    if (existing && existing.factory === factory) {
      // Same props object — skip; otherwise update.
      if (existing.instance._props !== childProps) {
        existing.instance.update(childProps);
      }
      return existing.host;
    }

    if (existing) {
      existing.instance.unmount();
      this._children.delete(path);
    }

    let host = options.host;
    if (!host) {
      host = createContentsHost('data-component', '');
    }

    const child = factory(childProps);
    child._source = options.source;
    child.mount(host, { hydrate: !!options.hydrate });
    this._children.set(path, { instance: child, factory, host });
    return host;
  },

  mount(parentElement, options = {}) {
    if (this._mounted) return;

    this._parentElement = parentElement;
    this._mounted = true;
    this._hydrate = !!options.hydrate;
    emitDevtools('owner:mount', { owner: this, name: this._displayName });

    const previousComponent = currentComponent;
    setCurrentComponent(this);

    const effect = () => {
      if (!this._mounted) return;

      const prev = currentComponent;
      setCurrentComponent(this);

      try {
        this._renderCount++;
        if (componentSignalRegistry.has(this)) {
          componentSignalRegistry.get(this).index = 0;
        }

        const isFirstRender = !this._effectsInitialized;
        const result = this._componentFn(this._props);

        // Keep owner as currentComponent while building DOM so text/prop
        // bindings can register and track signals without re-running this fn.
        if (!this._element) {
          if (this._hydrate) {
            const existing = parentElement.firstChild;
            this._element = adoptDom(existing, result, this, '0');
            this._hydrate = false;
          } else {
            this._element = createDom(result, this, '0');
            parentElement.appendChild(this._element);
          }
        } else {
          this._element = patchDom(
            parentElement,
            this._element,
            result,
            this,
            '0'
          );
        }

        if (isFirstRender) {
          this._effectsInitialized = true;
          const callbacks = this._mountCallbacks.splice(0);
          for (const callback of callbacks) {
            const cleanup = callback();
            if (typeof cleanup === 'function') this._cleanups.push(cleanup);
          }
        }
      } catch (err) {
        const boundary = getErrorBoundary();
        if (boundary) {
          // Defer so the current mount/patch stack can unwind before fallback remount.
          queueMicrotask(() => boundary.catch(err));
          return;
        }
        if (err && typeof err === 'object' && !err.componentStack) {
          err.componentStack = componentStack(this, this._source);
        }
        console.error('Uncaught render error:', err);
        throw err;
      } finally {
        setCurrentComponent(prev);
      }
    };

    // createEffect registers on this (currentComponent) and runs immediately
    createEffect(effect);
    // Same function reference subscribers invoke (do not use _effects.at(-1);
    // nested createEffects are also pushed during the first run).
    this._renderEffect = effect;

    setCurrentComponent(previousComponent);
  },

  unmount() {
    if (!this._mounted) return;

    if (this._cleanups) {
      this._cleanups.forEach((cleanup) => {
        try {
          cleanup();
        } catch (error) {
          console.error('Error in component cleanup:', error);
        }
      });
      this._cleanups = [];
    }

    this._effects.forEach((effect) => {
      if (typeof effect._dispose === 'function') {
        effect._dispose();
      } else {
        effect._disabled = true;
      }
    });
    this._effects = [];

    unmountDomTree(this);

    if (this._element && this._element.parentNode) {
      this._element.parentNode.removeChild(this._element);
    }

    this._mounted = false;
    this._element = null;
    this._renderEffect = null;
    emitDevtools('owner:unmount', { owner: this, name: this._displayName });
  },
};

export function createComponent(ComponentFn) {
  function Component(props = {}) {
    const instance = Object.create(componentProto);
    instance._effects = [];
    instance._cleanups = [];
    instance._mounted = false;
    instance._element = null;
    instance._parentElement = null;
    instance._componentFn = ComponentFn;
    instance._props = props;
    instance._renderCount = 0;
    instance._effectsInitialized = false;
    instance._children = new Map();
    instance._renderEffect = null;
    instance._bindings = [];
    instance._hydrate = false;
    instance._mountCallbacks = [];
    instance._parentOwner = currentComponent;
    instance._displayName =
      Component.displayName || ComponentFn.displayName || ComponentFn.name;
    emitDevtools('owner:create', {
      owner: instance,
      name: instance._displayName,
    });
    return instance;
  }

  Component.$$component = true;
  Component.displayName = ComponentFn.displayName || ComponentFn.name || 'Anonymous';
  Component._ssrFn = ComponentFn;
  return Component;
}
