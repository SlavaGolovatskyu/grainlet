import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Router } from 'grainlet/route';
import {
  createNodeHandler,
  createRequestHandler,
  prerenderPaths,
  writePrerendered,
} from 'grainlet/ssr';
import { jsx } from 'grainlet/jsx-runtime';

const routes = [{
  id: 'home',
  path: '/',
  component: () => jsx('h1', {}, 'Adapter'),
  meta: { title: 'Adapter page' },
}];
const App = (props) => jsx(Router, {
  mode: 'nested',
  queryClient: props.queryClient,
  routes,
});

{
  const handler = createRequestHandler({ App, routes, streaming: false });
  const response = await handler(new Request('https://example.test/'));
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Adapter page/);
}

{
  const output = await prerenderPaths({ App, paths: ['/'], routes });
  assert.equal(output.get('/').status, 200);
  assert.match(output.get('/').body, /<h1>Adapter<\/h1>/);

  const outDir = await mkdtemp(join(tmpdir(), 'grainlet-ssg-'));
  const written = await writePrerendered({
    App,
    outDir,
    paths: ['/'],
    routes,
  });
  assert.match(await readFile(join(outDir, 'index.html'), 'utf8'), /Adapter/);
  assert.ok(written.manifest['/']);
  await rm(outDir, { recursive: true, force: true });
}

{
  const nodeHandler = createNodeHandler({ App, routes, streaming: true });
  const server = createServer((request, response) =>
    nodeHandler(request, response)
  );
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/`);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Adapter/);
  await new Promise((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve())
  );
}

console.log('SSR adapters and SSG tests passed');
