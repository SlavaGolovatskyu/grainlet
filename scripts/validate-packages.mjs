import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

for (const packagePath of ['packages/grain', 'packages/vite', 'packages/adapters']) {
  const packageJson = JSON.parse(
    await readFile(resolve(packagePath, 'package.json'), 'utf8')
  );
  for (const [subpath, target] of Object.entries(packageJson.exports || {})) {
    if (subpath === './package.json') continue;
    const conditions = typeof target === 'string' ? { default: target } : target;
    for (const [condition, file] of Object.entries(conditions)) {
      assert.equal(typeof file, 'string', `${subpath}:${condition} must be a file`);
      await access(resolve(packagePath, file));
    }
  }
  for (const field of ['main', 'types']) {
    if (packageJson[field]) await access(resolve(packagePath, packageJson[field]));
  }
}

const runtime = await import('../packages/grain/index.js');
const declarations = await readFile(
  new URL('../packages/grain/index.d.ts', import.meta.url),
  'utf8'
);
for (const name of Object.keys(runtime)) {
  assert.match(
    declarations,
    new RegExp(`\\b${name}\\b`),
    `missing declaration export for ${name}`
  );
}

console.log('package exports and declarations are present');
