import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const directory = await mkdtemp(join(tmpdir(), 'create-grainlet-'));
const cli = resolve('bin/create-grainlet.js');
const result = spawnSync(process.execPath, [cli, 'ssr-app', '--ssr'], {
  cwd: directory,
  encoding: 'utf8',
});
assert.equal(result.status, 0, result.stderr);
const target = join(directory, 'ssr-app');
await access(join(target, 'src/server.jsx'));
await access(join(target, 'src/vercel.js'));
await access(join(target, 'src/cloudflare.js'));
await access(join(target, 'vite.server.config.js'));
const packageJson = JSON.parse(await readFile(join(target, 'package.json')));
assert.equal(packageJson.name, 'ssr-app');
assert.ok(packageJson.dependencies['grainlet-adapters']);
assert.ok(packageJson.scripts['build:server']);
assert.doesNotMatch(
  await readFile(join(target, 'src/App.jsx'), 'utf8'),
  /__PROJECT_NAME__/
);
await rm(directory, { recursive: true, force: true });

console.log('create-grainlet SSR scaffold test passed');
