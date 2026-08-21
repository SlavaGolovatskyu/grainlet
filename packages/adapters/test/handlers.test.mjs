import assert from 'node:assert/strict';
import { Router } from 'grainlet/route';
import { jsx } from 'grainlet/jsx-runtime';
import {
  createGrainletHandler,
  resolveAssetUrl,
  withAssetPrefix,
} from 'grainlet-adapters';
import { createVercelHandler } from 'grainlet-adapters/vercel';
import { createCloudflareHandler } from 'grainlet-adapters/cloudflare';
import { grainletPlatform } from 'grainlet-adapters/vite';

const routes = [{
  id: 'home',
  path: '/',
  component: () => jsx('h1', {}, 'Cloud'),
  meta: { title: 'Cloud page' },
}];

const App = (props) => jsx(Router, {
  mode: 'nested',
  queryClient: props.queryClient,
  routes,
});

assert.equal(resolveAssetUrl('/client.js', 'https://cdn.example'), 'https://cdn.example/client.js');
assert.deepEqual(
  withAssetPrefix({ scripts: ['/client.js'] }, 'https://cdn.example').scripts,
  ['https://cdn.example/client.js']
);

{
  const handler = createGrainletHandler({ App, routes, streaming: false });
  const response = await handler(new Request('https://example.test/'));
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Cloud page/);
}

{
  const handler = createVercelHandler({ App, routes, streaming: false });
  const context = { waitUntil() {} };
  const response = await handler(new Request('https://example.test/'), context);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Cloud/);
}

{
  const { redirect } = await import('grainlet/route');
  const redirectRoutes = [{
    id: 'old',
    path: '/old',
    loader: () => redirect('/'),
    component: () => null,
  }];
  const RedirectApp = (props) => jsx(Router, {
    mode: 'nested',
    queryClient: props.queryClient,
    routes: redirectRoutes,
  });
  const handler = createVercelHandler({
    App: RedirectApp,
    routes: redirectRoutes,
    streaming: false,
  });
  const response = await handler(new Request('https://example.test/old'));
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/');
}

{
  const Boom = () => {
    throw new Error('boom');
  };
  const handler = createVercelHandler({
    App: Boom,
    routes: [],
    streaming: false,
    errorDocument: () => '<h1>fail</h1>',
  });
  const response = await handler(new Request('https://example.test/'));
  assert.equal(response.status, 500);
  assert.match(await response.text(), /fail/);
}

{
  const handler = createVercelHandler({ App, routes });
  const response = await handler(new Request('https://example.test/'));
  assert.equal(response.status, 200);
  assert.ok(response.body, 'streaming responses expose a body');
}

{
  let seen;
  const worker = createCloudflareHandler({
    App: (props) => {
      seen = props.queryClient ? 'ok' : seen;
      return App(props);
    },
    routes,
    streaming: false,
  });
  const env = { ASSETS: null, FLAG: 'from-worker' };
  const ctx = { waitUntil() {} };
  const response = await worker.fetch(
    new Request('https://example.test/'),
    env,
    ctx
  );
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Cloud/);
}

{
  const worker = createCloudflareHandler({ App, routes, streaming: false });
  const env = {
    ASSETS: {
      fetch: async () => new Response('static-file', { status: 200 }),
    },
  };
  const response = await worker.fetch(
    new Request('https://example.test/client.js'),
    env,
    {}
  );
  assert.equal(await response.text(), 'static-file');
}

{
  const worker = createCloudflareHandler({ App, routes, streaming: false });
  const env = {
    ASSETS: {
      fetch: async () => new Response('missing', { status: 404 }),
    },
  };
  const response = await worker.fetch(
    new Request('https://example.test/'),
    env,
    {}
  );
  assert.match(await response.text(), /Cloud/);
}

assert.throws(
  () => grainletPlatform({}),
  /target "vercel" or "cloudflare"/
);

console.log('adapter handler tests passed');
