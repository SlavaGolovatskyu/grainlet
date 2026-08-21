import { createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { handler } from './dist/server/server-entry.js';

const port = Number(process.env.SSR_PORT) || 3001;
const clientEntry = resolve(import.meta.dirname, 'dist/client/client.js');

createServer((request, response) => {
  if (request.url === '/client.js') {
    response.setHeader('content-type', 'text/javascript; charset=utf-8');
    createReadStream(clientEntry).pipe(response);
    return;
  }
  if (request.url === '/') {
    response.statusCode = 302;
    response.setHeader('location', '/ssr');
    response.end();
    return;
  }
  handler(request, response).catch((error) => {
    response.statusCode = 500;
    response.end(String(error?.stack || error));
  });
}).listen(port, () => {
  console.log(`Production SSR demo at http://localhost:${port}/ssr`);
});
