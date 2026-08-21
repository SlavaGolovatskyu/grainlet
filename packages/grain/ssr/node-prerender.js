import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { prerenderPaths } from './prerender.js';

function outputPath(root, pathname) {
  const normalized = pathname.replace(/^\/+|\/+$/g, '');
  return normalized
    ? join(root, normalized, 'index.html')
    : join(root, 'index.html');
}

export async function writePrerendered(options) {
  if (!options?.outDir) throw new TypeError('writePrerendered requires outDir');
  const rendered = await prerenderPaths(options);
  const manifest = {};
  for (const [pathname, result] of rendered) {
    const file = outputPath(options.outDir, pathname);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, result.body);
    manifest[pathname] = {
      file,
      headers: result.headers,
      status: result.status,
    };
  }
  const manifestPath = join(options.outDir, 'grainlet-prerender.json');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  return { manifest, manifestPath };
}
