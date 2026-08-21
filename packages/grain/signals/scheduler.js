let batchDepth = 0;
let transitionDepth = 0;
let flushing = false;
let transitionScheduled = false;

const urgentQueue = new Set();
const transitionQueue = new Set();
const transitionListeners = new Set();
const transitionResolvers = [];

function notifyTransition(pending) {
  for (const listener of [...transitionListeners]) listener(pending);
}

function runQueue(queue) {
  if (flushing) return;
  flushing = true;
  try {
    while (queue.size) {
      const effects = [...queue];
      queue.clear();
      for (const effect of effects) {
        if (!effect._disabled) effect();
      }
    }
  } finally {
    flushing = false;
  }
}

function flushTransitions() {
  transitionScheduled = false;
  runQueue(transitionQueue);
  runQueue(urgentQueue);
  notifyTransition(false);
  while (transitionResolvers.length) transitionResolvers.shift()();
}

function requestTransitionFlush() {
  if (transitionScheduled) return;
  transitionScheduled = true;
  notifyTransition(true);
  const schedule =
    typeof requestAnimationFrame === 'function'
      ? (fn) => requestAnimationFrame(() => fn())
      : queueMicrotask;
  schedule(flushTransitions);
}

export function scheduleEffect(effect) {
  if (!effect || effect._disabled) return;
  if (transitionDepth > 0) {
    transitionQueue.add(effect);
    requestTransitionFlush();
    return;
  }
  transitionQueue.delete(effect);
  if (batchDepth > 0 || flushing) {
    urgentQueue.add(effect);
    return;
  }
  effect();
}

export function batch(fn) {
  batchDepth += 1;
  try {
    return fn();
  } finally {
    batchDepth -= 1;
    if (batchDepth === 0) runQueue(urgentQueue);
  }
}

export function startTransition(fn) {
  transitionDepth += 1;
  try {
    batch(fn);
  } finally {
    transitionDepth -= 1;
    if (transitionQueue.size) requestTransitionFlush();
  }
  if (!transitionQueue.size && !transitionScheduled) return Promise.resolve();
  return new Promise((resolve) => transitionResolvers.push(resolve));
}

export function subscribeTransition(listener) {
  transitionListeners.add(listener);
  listener(transitionScheduled || transitionQueue.size > 0);
  return () => transitionListeners.delete(listener);
}

export function isTransitionPending() {
  return transitionScheduled || transitionQueue.size > 0;
}
