import { once } from 'node:events';
import { createRequestHandler } from './handler.js';

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

export function createNodeHandler(options) {
  const handleRequest = createRequestHandler(options);
  return async function nodeHandler(incoming, response, platformContext) {
    const abortController = new AbortController();
    incoming.once('aborted', () =>
      abortController.abort(new DOMException('Client disconnected', 'AbortError'))
    );
    const protocol = incoming.socket?.encrypted ? 'https' : 'http';
    const host = incoming.headers.host || 'localhost';
    const method = incoming.method || 'GET';
    const headers = new Headers();
    for (const [name, value] of Object.entries(incoming.headers)) {
      if (Array.isArray(value)) {
        for (const item of value) headers.append(name, item);
      } else if (value != null) {
        headers.set(name, value);
      }
    }
    const request = new Request(
      new URL(incoming.url || '/', `${protocol}://${host}`),
      {
        body: method === 'GET' || method === 'HEAD'
          ? undefined
          : await readBody(incoming),
        headers,
        method,
        signal: abortController.signal,
      }
    );
    const webResponse = await handleRequest(request, platformContext);
    response.statusCode = webResponse.status;
    webResponse.headers.forEach((value, key) => response.setHeader(key, value));
    if (!webResponse.body) {
      response.end();
      return;
    }
    const reader = webResponse.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!response.write(Buffer.from(value))) await once(response, 'drain');
      }
      response.end();
    } catch (error) {
      abortController.abort(error);
      if (!response.destroyed) response.destroy(error);
    } finally {
      reader.releaseLock();
    }
  };
}
