import { createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import { resolve } from 'node:path';

const production = process.env.NODE_ENV === 'production';
let vite;
let handler;
if (production) {
  ({ handler } = await import('./dist/server/server.js'));
} else {
  const { createServer: createViteServer } = await import('vite');
  const { grainJsx } = await import('grainlet-vite');
  vite = await createViteServer({
    appType: 'custom',
    plugins: [grainJsx()],
    server: { middlewareMode: true },
  });
}

createServer(async (request, response) => {
  if (production && request.url === '/client.js') {
    createReadStream(resolve('dist/client/client.js')).pipe(response);
    return;
  }
  if (!production && request.url?.startsWith('/src/')) {
    vite.middlewares(request, response, () => {});
    return;
  }
  const activeHandler = handler
    ?? (await vite.ssrLoadModule('/src/server.jsx')).handler;
  await activeHandler(request, response);
}).listen(3000, () => {
  console.log('http://localhost:3000');
});
