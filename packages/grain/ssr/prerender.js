import { createRequestHandler } from './handler.js';

function pathFromRoute(route, params = {}, parent = '') {
  const segment = route.index ? '' : (route.path || '');
  const joined = segment.startsWith('/')
    ? segment
    : `${parent.replace(/\/$/, '')}/${segment}`;
  return joined.replace(/:([^/]+)/g, (_, name) =>
    encodeURIComponent(params[name] ?? '')
  ).replace(/\/+/g, '/') || '/';
}

async function discoverRoutePaths(routes, parent = '', output = []) {
  for (const route of routes || []) {
    const base = pathFromRoute(route, {}, parent);
    if (typeof route.getStaticPaths === 'function') {
      const values = await route.getStaticPaths();
      for (const value of values || []) {
        output.push(
          typeof value === 'string'
            ? value
            : pathFromRoute(route, value.params || value, parent)
        );
      }
    } else if (!String(route.path || '').includes(':')
      && !String(route.path || '').includes('*')) {
      output.push(base);
    }
    await discoverRoutePaths(route.children, base, output);
  }
  return output;
}

export async function prerenderPaths(options) {
  const configured = typeof options.paths === 'function'
    ? await options.paths()
    : options.paths;
  const paths = configured?.length
    ? configured
    : await discoverRoutePaths(options.routes);
  const uniquePaths = [...new Set(paths || ['/'])];
  const handleRequest = createRequestHandler({
    ...options,
    streaming: false,
  });
  const output = new Map();
  for (const path of uniquePaths) {
    const url = new URL(path, options.origin || 'http://localhost');
    const response = await handleRequest(new Request(url));
    output.set(url.pathname, {
      body: await response.text(),
      headers: Object.fromEntries(response.headers),
      status: response.status,
    });
  }
  return output;
}
