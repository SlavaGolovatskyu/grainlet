import { QueryClient } from '../query/core.js';
import {
  renderRouteDocument,
  renderRouteToReadableStream,
} from '../route/ssr/prepare.js';
import { ensureSSRContextStorage } from './context.js';

function mergeHeaders(target, source) {
  source?.forEach?.((value, key) => target.set(key, value));
  return target;
}

export function createRequestHandler(options) {
  if (typeof options?.App !== 'function') {
    throw new TypeError('createRequestHandler requires an App component');
  }
  ensureSSRContextStorage();
  return async function handleRequest(request, platformContext) {
    const queryClient = options.createQueryClient?.({
      platformContext,
      request,
    }) ?? new QueryClient();
    const url = request.url;
    const renderOptions = {
      basename: options.basename,
      context: platformContext,
      document: options.document,
      nonce: options.nonce?.({ platformContext, request }),
      queryClient,
      request,
      routes: options.routes || [],
      signal: request.signal,
      url,
    };
    let deferCleanup = false;
    try {
      const result = options.streaming === false
        ? await renderRouteDocument(
          options.App,
          { ...(options.props || {}), queryClient },
          renderOptions
        )
        : await renderRouteToReadableStream(
          options.App,
          { ...(options.props || {}), queryClient },
          renderOptions
        );
      const headers = mergeHeaders(
        new Headers({ 'content-type': 'text/html; charset=utf-8' }),
        result.headers
      );
      if (result.redirect) {
        headers.set('location', result.redirect);
        return new Response(null, { headers, status: result.status || 302 });
      }
      if (result.stream?.allReady) {
        deferCleanup = true;
        result.stream.allReady.finally(() => queryClient.clear?.());
      }
      return new Response(result.stream ?? result.document, {
        headers,
        status: result.status || 200,
      });
    } catch (error) {
      options.onError?.(error, request);
      const body = options.errorDocument?.(error)
        ?? '<!doctype html><title>Internal Server Error</title><h1>Internal Server Error</h1>';
      return new Response(body, {
        headers: { 'content-type': 'text/html; charset=utf-8' },
        status: error?.status || 500,
      });
    } finally {
      if (!deferCleanup) queryClient.clear?.();
    }
  };
}
