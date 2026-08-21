import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readJson = async (path) =>
  JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));

const grain = await readJson('../packages/grain/package.json');
const vite = await readJson('../packages/vite/package.json');
const adapters = await readJson('../packages/adapters/package.json');
const root = await readJson('../package.json');
const bench = await readJson('../apps/bench/package.json');
const template = await readJson('../packages/create-grainlet/template/package.json');
const ssrTemplate =
  await readJson('../packages/create-grainlet/template-ssr/package.json');

assert.equal(root.dependencies.grainlet, '*', 'root must use workspace grainlet');
assert.equal(bench.dependencies.grainlet, '*', 'bench must use workspace grainlet');
assert.equal(
  template.dependencies.grainlet,
  `^${grain.version}`,
  'create-grainlet template grainlet version drifted'
);
assert.equal(
  template.devDependencies['grainlet-vite'],
  `^${vite.version}`,
  'create-grainlet template plugin version drifted'
);
assert.equal(ssrTemplate.dependencies.grainlet, `^${grain.version}`);
assert.equal(ssrTemplate.devDependencies['grainlet-vite'], `^${vite.version}`);
assert.equal(
  ssrTemplate.dependencies['grainlet-adapters'],
  `^${adapters.version}`,
  'create-grainlet SSR template grainlet-adapters version drifted'
);

console.log('workspace versions are consistent');
