import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const cli = resolve('bin/create-grainlet.js');

async function scaffold(args, cwd) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

const spaDir = await mkdtemp(join(tmpdir(), 'create-grainlet-spa-'));
await scaffold(['spa-app'], spaDir);
const spaTarget = join(spaDir, 'spa-app');
await access(join(spaTarget, '.cursor/rules/grainlet-overview.mdc'));
await access(join(spaTarget, '.cursor/rules/grainlet-core.mdc'));
await access(join(spaTarget, '.cursor/rules/grainlet-auth-sdk.mdc'));
await access(join(spaTarget, '.cursor/rules/grainlet-store.mdc'));
await access(join(spaTarget, '.cursor/rules/grainlet-utils.mdc'));
await access(join(spaTarget, '.cursor/rules/grainlet-testing.mdc'));
await access(join(spaTarget, '.cursor/rules/grainlet-devtools.mdc'));
await assert.rejects(
  () => access(join(spaTarget, '.cursor/rules/grainlet-ssr.mdc'))
);
const spaPkg = JSON.parse(await readFile(join(spaTarget, 'package.json'), 'utf8'));
assert.equal(spaPkg.name, 'spa-app');
assert.doesNotMatch(
  await readFile(join(spaTarget, 'src/App.jsx'), 'utf8'),
  /__PROJECT_NAME__/
);
await rm(spaDir, { recursive: true, force: true });

const ssrDir = await mkdtemp(join(tmpdir(), 'create-grainlet-ssr-'));
await scaffold(['ssr-app', '--ssr'], ssrDir);
const ssrTarget = join(ssrDir, 'ssr-app');
await access(join(ssrTarget, 'src/server.jsx'));
await access(join(ssrTarget, 'src/vercel.js'));
await access(join(ssrTarget, 'src/cloudflare.js'));
await access(join(ssrTarget, 'vite.server.config.js'));
await access(join(ssrTarget, '.cursor/rules/grainlet-overview.mdc'));
await access(join(ssrTarget, '.cursor/rules/grainlet-ssr.mdc'));
const packageJson = JSON.parse(await readFile(join(ssrTarget, 'package.json')));
assert.equal(packageJson.name, 'ssr-app');
assert.ok(packageJson.dependencies['grainlet-adapters']);
assert.ok(packageJson.scripts['build:server']);
assert.doesNotMatch(
  await readFile(join(ssrTarget, 'src/App.jsx'), 'utf8'),
  /__PROJECT_NAME__/
);
await rm(ssrDir, { recursive: true, force: true });

console.log('create-grainlet SPA and SSR scaffold tests passed');
