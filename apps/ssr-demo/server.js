/**
 * SSR demo server with Vite middleware (JSX transform for both SSR and client).
 *
 *   npm run ssr:demo
 *   open http://localhost:3001/ssr
 *   open http://localhost:3001/ssr/async  (lazy + createResource)
 */
import http from 'node:http';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { grainJsx } from 'grainlet-vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');
const port = Number(process.env.SSR_PORT) || 3001;

const vite = await createViteServer({
  root,
  server: { middlewareMode: true },
  appType: 'custom',
  plugins: [grainJsx()],
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'grainlet',
  },
});

async function renderPage(url) {
  const { renderToStringAsync, wrapHtmlDocument } =
    await vite.ssrLoadModule('grainlet/ssr');
  const path = new URL(url, 'http://localhost').pathname;

  const isAsync = path === '/ssr/async' || path === '/ssr/async/';
  if (isAsync) {
    const mod = await vite.ssrLoadModule('/apps/ssr-demo/AsyncApp.jsx');
    const body = await renderToStringAsync(mod.AsyncApp, {}, { url });
    return {
      document: wrapHtmlDocument(body, {
        title: 'SSR async demo',
        scripts: ['/apps/ssr-demo/async-client.js'],
      }),
      headers: new Headers(),
      status: 200,
    };
  }

  const { QueryClient } = await vite.ssrLoadModule('grainlet/query');
  const { renderRouteDocument } = await vite.ssrLoadModule('grainlet/route');
  const mod = await vite.ssrLoadModule('/apps/ssr-demo/RoutedApp.jsx');
  const queryClient = new QueryClient();
  return renderRouteDocument(mod.RoutedApp, { queryClient }, {
    queryClient,
    routes: mod.routes,
    url,
    document: {
    unsafeHead: `<style>
      body { font-family: system-ui, sans-serif; max-width: 40rem; margin: 2rem auto; padding: 0 1rem; }
      .count { font-size: 2rem; }
      .badge { display: inline-block; margin: 0.5rem 0; padding: 0.2rem 0.5rem; background: #eee; border-radius: 4px; }
      .actions button { margin-right: 0.5rem; padding: 0.4rem 0.8rem; }
      .hint { color: #666; font-size: 0.9rem; }
      .fallback { color: #999; font-style: italic; }
    </style>`,
      scripts: ['/apps/ssr-demo/client.js'],
    },
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = req.url || '/';
    const path = url.split('?')[0];

    if (path === '/') {
      res.statusCode = 302;
      res.setHeader('Location', '/ssr');
      res.end();
      return;
    }

    if (
      path === '/ssr' ||
      path === '/ssr/' ||
      path === '/ssr/async' ||
      path === '/ssr/async/' ||
      path.startsWith('/ssr/projects/') ||
      path === '/ssr/old'
    ) {
      const result = await renderPage(`http://localhost:${port}${url}`);
      if (result.redirect) {
        res.statusCode = result.status;
        res.setHeader('Location', result.redirect);
        res.end();
        return;
      }
      const transformed = await vite.transformIndexHtml(url, result.document);
      res.statusCode = result.status;
      result.headers?.forEach?.((value, name) => res.setHeader(name, value));
      res.setHeader('Content-Type', 'text/html');
      res.end(transformed);
      return;
    }

    vite.middlewares(req, res, () => {
      res.statusCode = 404;
      res.end('Not found');
    });
  } catch (error) {
    vite.ssrFixStacktrace?.(error);
    console.error(error);
    res.statusCode = 500;
    res.end(String(error?.stack || error));
  }
});

server.listen(port, () => {
  console.log(`SSR demo at http://localhost:${port}/ssr`);
  console.log(`SSR async at http://localhost:${port}/ssr/async`);
});
