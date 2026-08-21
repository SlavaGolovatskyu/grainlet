import {
  isAccessor,
  isComponentType,
  isFragmentType,
  isStructuredChild,
  mergeComponentProps,
  normalizeChildren,
  toText,
} from '../core/shared/vnode.js';
import {
  popSuspenseContext,
  pushSuspenseContext,
} from '../core/flow/context.js';
import { runWithSSR } from './context.js';
import { renderDocument, serializeDocumentState } from './document.js';
import {
  escapeHtml,
  resolvePropValue,
  serializeAttrs,
  VOID_TAGS,
} from './serialize.js';
import { renderComponentForSSR } from './render-to-string.js';

function wrapContents(inner, marker) {
  return `<span ${marker} style="display:contents">${inner}</span>`;
}

function promiseFromEntry(entry) {
  if (entry?.then) return entry;
  if (typeof entry?.promise === 'function') return entry.promise();
  return entry?._promise;
}

function serializeStreamingVnode(vdom, renderComponent, environment) {
  if (vdom == null || vdom === false || vdom === true) return '';
  if (typeof vdom === 'string' || typeof vdom === 'number') {
    return escapeHtml(vdom);
  }
  if (isAccessor(vdom)) {
    const value = resolvePropValue(vdom);
    let inner;
    if (isStructuredChild(value)) {
      inner = serializeStreamingVnode(value, renderComponent, environment);
    } else {
      inner = escapeHtml(toText(value));
    }
    return wrapContents(inner, 'data-fg="dynamic"');
  }
  if (Array.isArray(vdom)) {
    const inner = normalizeChildren(vdom)
      .map((child) =>
        serializeStreamingVnode(child, renderComponent, environment)
      )
      .join('');
    return wrapContents(inner, 'data-fg="fragment"');
  }
  if (typeof vdom !== 'object') return escapeHtml(String(vdom));

  const { type, props, children } = vdom;
  if (isFragmentType(type)) {
    const inner = normalizeChildren(children)
      .map((child) =>
        serializeStreamingVnode(child, renderComponent, environment)
      )
      .join('');
    return wrapContents(inner, 'data-fg="fragment"');
  }
  if (isComponentType(type)) {
    const childProps = mergeComponentProps(props, children);
    if (type.$$streamSuspense) {
      const id = `g${environment.nextBoundary++}`;
      const pending = new Set();
      const context = {
        track(entry) {
          const promise = promiseFromEntry(entry);
          if (promise?.then) pending.add(Promise.resolve(promise));
        },
      };
      pushSuspenseContext(context);
      let content;
      try {
        content = serializeStreamingVnode(
          childProps.children,
          renderComponent,
          environment
        );
      } finally {
        popSuspenseContext();
      }
      const resolved = () => {
        pushSuspenseContext({ track() {} });
        try {
          const inner = serializeStreamingVnode(
            childProps.children,
            renderComponent,
            environment
          );
          return wrapContents(
            wrapContents(inner, 'data-component=""'),
            'data-component=""'
          );
        } finally {
          popSuspenseContext();
        }
      };
      if (pending.size) {
        environment.schedule(id, [...pending], resolved);
        const fallback = serializeStreamingVnode(
          childProps.fallback,
          renderComponent,
          environment
        );
        return `<span data-grainlet-stream-boundary="${id}" style="display:contents">${fallback}</span>`;
      }
      return wrapContents(
        wrapContents(content, 'data-component=""'),
        'data-component=""'
      );
    }
    const result = renderComponent(type, childProps);
    const inner = serializeStreamingVnode(
      result,
      renderComponent,
      environment
    );
    if (type.$$ssrPopSuspense) popSuspenseContext();
    return wrapContents(inner, 'data-component=""');
  }

  const tag = String(type);
  const key = vdom.key ?? props?.key;
  const keyAttr = key != null ? ` data-key="${escapeHtml(key)}"` : '';
  const attrs = serializeAttrs(props);
  if (VOID_TAGS.has(tag)) return `<${tag}${attrs}${keyAttr} />`;
  const inner = normalizeChildren(children)
    .map((child) =>
      serializeStreamingVnode(child, renderComponent, environment)
    )
    .join('');
  return `<${tag}${attrs}${keyAttr}>${inner}</${tag}>`;
}

function patchChunk(id, html, nonce) {
  const nonceAttribute = nonce ? ` nonce="${escapeHtml(nonce)}"` : '';
  const encodedId = serializeDocumentState(id);
  const encodedHtml = serializeDocumentState(html);
  return `<script${nonceAttribute}>(globalThis.__grainletPatch||=(id,html)=>{const n=document.querySelector('[data-grainlet-stream-boundary=\"'+id+'\"]');if(!n)return;const t=document.createElement('template');t.innerHTML=html;n.replaceWith(t.content)} )(${encodedId},${encodedHtml});</script>`;
}

export function renderToReadableStream(Component, props = {}, options = {}) {
  const encoder = new TextEncoder();
  let resolveShell;
  let rejectShell;
  let resolveAll;
  let rejectAll;
  const shellReady = new Promise((resolve, reject) => {
    resolveShell = resolve;
    rejectShell = reject;
  });
  const allReady = new Promise((resolve, reject) => {
    resolveAll = resolve;
    rejectAll = reject;
  });
  let streamController;
  let aborted = false;
  const drainResolvers = [];

  const waitForCapacity = async () => {
    if (!streamController || streamController.desiredSize > 0) return;
    await new Promise((resolve) => drainResolvers.push(resolve));
  };
  const emit = async (value) => {
    await waitForCapacity();
    if (!aborted) streamController.enqueue(encoder.encode(value));
  };

  const stream = new ReadableStream({
    start(controller) {
      streamController = controller;
      runWithSSR(async () => {
        const tasks = new Set();
        const environment = {
          nextBoundary: 0,
          schedule(id, promises, render) {
            const task = Promise.allSettled(promises)
              .then(() => render())
              .then(async (html) => {
                if (!aborted) {
                  await emit(patchChunk(id, html, options.nonce));
                }
              })
              .catch((error) => {
                options.onError?.(error);
              })
              .finally(() => tasks.delete(task));
            tasks.add(task);
          },
        };
        const vnode = renderComponentForSSR(Component, props);
        const body = serializeStreamingVnode(
          vnode,
          renderComponentForSSR,
          environment
        );
        const document = renderDocument(body, {
          ...options.document,
          nonce: options.nonce,
          state: undefined,
        });
        const close = '</body>\n</html>';
        const splitAt = document.lastIndexOf(close);
        const shell = splitAt >= 0 ? document.slice(0, splitAt) : document;
        await emit(shell);
        options.onShellReady?.();
        resolveShell();

        while (tasks.size && !aborted) {
          await Promise.allSettled([...tasks]);
        }
        if (aborted) return;
        const state = typeof options.state === 'function'
          ? options.state()
          : options.state;
        if (state !== undefined) {
          await emit(
            `<script id="${escapeHtml(options.stateId || '__GRAINLET_STATE__')}" type="application/json"${options.nonce ? ` nonce="${escapeHtml(options.nonce)}"` : ''}>${serializeDocumentState(state)}</script>`
          );
        }
        await emit(close);
        controller.close();
        options.onAllReady?.();
        resolveAll();
      }, {
        ...options.context,
        request: options.request,
        queryState: options.queryState,
        routeState: options.routeState,
        url: options.url || '/',
      }).catch((error) => {
        rejectShell(error);
        rejectAll(error);
        options.onError?.(error);
        controller.error(error);
      });
    },
    cancel(reason) {
      aborted = true;
      while (drainResolvers.length) drainResolvers.shift()();
      options.onError?.(reason);
      rejectShell(reason);
      rejectAll(reason);
    },
    pull() {
      while (drainResolvers.length) drainResolvers.shift()();
    },
  });
  stream.shellReady = shellReady;
  stream.allReady = allReady;
  if (options.signal) {
    const abort = () => {
      aborted = true;
      while (drainResolvers.length) drainResolvers.shift()();
      const reason = options.signal.reason
        ?? new DOMException('Streaming render aborted', 'AbortError');
      try {
        streamController?.error(reason);
      } catch {
        // The stream may already be closed or cancelled.
      }
      rejectShell(reason);
      rejectAll(reason);
    };
    if (options.signal.aborted) abort();
    else options.signal.addEventListener('abort', abort, { once: true });
  }
  return stream;
}
