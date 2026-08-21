export class Subscribable {
  constructor() {
    this.listeners = new Set();
  }

  subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('subscribe requires a listener function');
    }
    const added = !this.listeners.has(listener);
    if (added) {
      this.listeners.add(listener);
      this.onSubscribe?.();
    }
    let active = added;
    return () => {
      if (!active) return;
      active = false;
      this.listeners.delete(listener);
      this.onUnsubscribe?.();
    };
  }

  notify(value) {
    for (const listener of [...this.listeners]) listener(value);
  }
}

export class FocusManager extends Subscribable {
  constructor() {
    super();
    this.focused = undefined;
    this.cleanup = null;
  }

  onSubscribe() {
    if (this.listeners.size !== 1 || typeof window === 'undefined') return;
    const handler = () => this.notify(this.isFocused());
    window.addEventListener('visibilitychange', handler, false);
    this.cleanup = () =>
      window.removeEventListener('visibilitychange', handler, false);
  }

  onUnsubscribe() {
    if (this.listeners.size === 0) {
      this.cleanup?.();
      this.cleanup = null;
    }
  }

  setFocused(focused) {
    if (focused !== undefined && typeof focused !== 'boolean') {
      throw new TypeError('focused must be a boolean or undefined');
    }
    if (this.focused === focused) return;
    this.focused = focused;
    this.notify(this.isFocused());
  }

  isFocused() {
    if (typeof this.focused === 'boolean') return this.focused;
    return typeof document === 'undefined'
      || document.visibilityState !== 'hidden';
  }
}

export class OnlineManager extends Subscribable {
  constructor() {
    super();
    this.online = typeof navigator === 'undefined' || navigator.onLine !== false;
    this.cleanup = null;
  }

  onSubscribe() {
    if (this.listeners.size !== 1 || typeof window === 'undefined') return;
    const online = () => this.setOnline(true);
    const offline = () => this.setOnline(false);
    window.addEventListener('online', online, false);
    window.addEventListener('offline', offline, false);
    this.cleanup = () => {
      window.removeEventListener('online', online, false);
      window.removeEventListener('offline', offline, false);
    };
  }

  onUnsubscribe() {
    if (this.listeners.size === 0) {
      this.cleanup?.();
      this.cleanup = null;
    }
  }

  setOnline(online) {
    if (typeof online !== 'boolean') {
      throw new TypeError('online must be a boolean');
    }
    if (this.online === online) return;
    this.online = online;
    this.notify(online);
  }

  isOnline() {
    return this.online;
  }
}

export const focusManager = new FocusManager();
export const onlineManager = new OnlineManager();
