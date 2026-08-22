import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Router } from 'grainlet/route';
import { jsx } from 'grainlet/jsx-runtime';
import { emitPlatformOutput } from 'grainlet-adapters/vite';

const routes = [{
  id: 'home',
  path: '/',
  component: () => jsx('h1', {}, 'Static'),
  meta: { title: 'Static page' },
}];
const App = (props) => jsx(Router, {
  mode: 'nested',
  queryClient: props.queryClient,
  routes,
});

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'grainlet-adapters-'));
  const clientOutDir = join(root, 'dist/client');
  const serverOutDir = join(root, 'dist/server');
  await mkdir(clientOutDir, { recursive: true });
  await mkdir(serverOutDir, { recursive: true });
  await writeFile(join(clientOutDir, 'client.js'), 'console.log("client")');
  await writeFile(join(serverOutDir, 'server.js'), 'export const handler = () => new Response("ok")');
  return { clientOutDir, root, serverOutDir };
}

{
  const { root } = await fixture();
  const result = await emitPlatformOutput({
    App,
    clientOutDir: 'dist/client',
    prerender: ['/'],
    root,
    routes,
    serverOutDir: 'dist/server',
    target: 'vercel',
  });
  const config = JSON.parse(await readFile(join(result.outDir, 'config.json'), 'utf8'));
  assert.equal(config.version, 3);
  assert.equal(config.routes.at(-1).dest, '/ssr');
  assert.match(
    await readFile(join(result.outDir, 'static/client.js'), 'utf8'),
    /client/
  );
  assert.match(
    await readFile(join(result.outDir, 'static/index.html'), 'utf8'),
    /Static/
  );
  assert.match(
    await readFile(join(result.outDir, 'functions/ssr.func/index.js'), 'utf8'),
    /export default function handler/
  );
  const vc = JSON.parse(
    await readFile(join(result.outDir, 'functions/ssr.func/.vc-config.json'), 'utf8')
  );
  assert.equal(vc.runtime, 'edge');
  await rm(root, { recursive: true, force: true });
}

{
  const { root } = await fixture();
  const result = await emitPlatformOutput({
    name: 'demo-worker',
    root,
    target: 'cloudflare',
  });
  const wrangler = JSON.parse(await readFile(join(result.outDir, 'wrangler.json'), 'utf8'));
  assert.equal(wrangler.main, 'worker.js');
  assert.equal(wrangler.assets.binding, 'ASSETS');
  assert.equal(wrangler.name, 'demo-worker');
  assert.deepEqual(wrangler.compatibility_flags, ['nodejs_compat']);
  assert.match(
    await readFile(join(result.outDir, 'assets/client.js'), 'utf8'),
    /client/
  );
  assert.match(
    await readFile(join(result.outDir, 'worker.js'), 'utf8'),
    /async fetch/
  );
  await rm(root, { recursive: true, force: true });
}

console.log('adapter output tests passed');
