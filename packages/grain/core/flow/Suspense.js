import { createSignal, createEffect, onCleanup } from '../../signals/index.js';
import { jsx, Fragment } from '../jsx-compiler-new/jsx-runtime.js';
import {
  pushSuspenseContext,
  popSuspenseContext,
} from './context.js';
import { trackSSRThenables } from '../../ssr/context.js';

/**
 * Show fallback while any createResource / lazy under children is pending.
 * Children stay mounted (hidden) so in-flight work keeps running.
 *
 *   <Suspense fallback={<div class="loader">Loading...</div>}>
 *     <Child />
 *   </Suspense>
 */
export function Suspense(props) {
  const [showFallback, setShowFallback] = createSignal(false);
  const pending = new Set();

  const refresh = () => {
    let busy = false;
    for (const entry of pending) {
      if (typeof entry?.loading === 'function') {
        if (entry.loading()) busy = true;
      } else if (entry != null && typeof entry.then === 'function') {
        busy = true;
      }
    }
    if (!busy) {
      pending.clear();
      setShowFallback(false);
    } else {
      setShowFallback(true);
    }
  };

  const ctx = {
    track(entry) {
      if (entry == null) return;
      pending.add(entry);
      setShowFallback(true);

      if (typeof entry.then === 'function') {
        trackSSRThenables(entry);
        entry.then(
          () => {
            pending.delete(entry);
            refresh();
          },
          () => {
            pending.delete(entry);
            refresh();
          }
        );
        return;
      }

      if (typeof entry.promise === 'function') {
        const p = entry.promise();
        if (p && typeof p.then === 'function') {
          trackSSRThenables(p);
        }
      } else if (entry._promise && typeof entry._promise.then === 'function') {
        trackSSRThenables(entry._promise);
      }
    },
  };

  createEffect(() => {
    if (!showFallback()) return;
    refresh();
  });

  return jsx(SuspenseBoundary, {
    ctx,
    showFallback,
    fallback: props.fallback,
    children: props.children,
  });
}

Suspense.$$streamSuspense = true;

function SuspenseBoundary(props) {
  pushSuspenseContext(props.ctx);
  onCleanup(() => popSuspenseContext());

  const suspended = props.showFallback();

  // Keep children mounted while showing fallback so resources are not remounted.
  if (suspended) {
    return jsx(
      Fragment,
      null,
      props.fallback ?? null,
      jsx(
        'span',
        {
          style: 'display:none',
          'aria-hidden': 'true',
          'data-suspense-pending': '',
        },
        props.children
      )
    );
  }

  return props.children;
}

/** SSR serialize pops suspense after this component's subtree is walked. */
SuspenseBoundary.$$ssrPopSuspense = true;
