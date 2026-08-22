import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function posixPath(path) {
  return String(path).replace(/\\/g, '/');
}

function htmlOutputPath(pathname) {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  if (normalized === '/') return 'index.html';
  return `${normalized.replace(/^\//, '')}/index.html`;
}

async function pathExists(path) {
  try {
    await readFile(path);
    return true;
  } catch {
    try {
      const { stat } = await import('node:fs/promises');
      await stat(path);
      return true;
    } catch {
      return false;
    }
  }
}

async function copyDir(from, to) {
  await mkdir(to, { recursive: true });
  await cp(from, to, { recursive: true, force: true });
}

async function findServerEntry(serverOutDir, explicit) {
  if (explicit) return resolve(explicit);
  const candidates = ['server.js', 'server-entry.js', 'index.js'];
  for (const name of candidates) {
    const file = join(serverOutDir, name);
    if (await pathExists(file)) return file;
  }
  return join(serverOutDir, 'server.js');
}

async function writePrerenderedStatic(staticDir, options) {
  const { prerenderPaths } = await import('grainlet/ssr');
  const rendered = await prerenderPaths({
    App: options.App,
    routes: options.routes,
    basename: options.basename,
    document: options.document,
    origin: options.origin || 'http://localhost',
    paths: Array.isArray(options.prerender) ? options.prerender : options.paths,
    streaming: false,
  });
  const routes = [];
  for (const [pathname, result] of rendered) {
    if (result.status >= 300) continue;
    const file = join(staticDir, htmlOutputPath(pathname));
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, result.body);
    routes.push(pathname);
  }
  return routes;
}

function vercelConfig(prerendered = []) {
  const routes = [
    { handle: 'filesystem' },
    ...prerendered
      .filter((path) => path !== '/')
      .map((path) => ({
        src: path.replace(/\/+$/, '') || '/',
        dest: `${path.replace(/\/+$/, '')}/index.html`,
      })),
    { src: '/(.*)', dest: '/ssr' },
  ];
  return { version: 3, routes };
}

function vercelFunctionConfig() {
  return {
    runtime: 'edge',
    entrypoint: 'index.js',
  };
}

function vercelWrapper(serverFileName) {
  return `import * as server from './${serverFileName}';

const impl = server.default || server.handler || server.fetch;

export default function handler(request, context) {
  if (typeof impl === 'function') return impl(request, context);
  if (typeof impl?.fetch === 'function') return impl.fetch(request, context);
  throw new Error('Grainlet Vercel adapter: server entry must export default, handler, or fetch');
}
`;
}

function cloudflareWrapper(serverFileName) {
  return `import * as server from './${serverFileName}';

const impl = server.default || server.handler || server.fetch;

export default {
  async fetch(request, env, ctx) {
    if (typeof impl?.fetch === 'function') return impl.fetch(request, env, ctx);
    if (typeof impl === 'function') return impl(request, { ctx, env });
    throw new Error('Grainlet Cloudflare adapter: server entry must export default, handler, or fetch');
  },
};
`;
}

function wranglerConfig(options) {
  return {
    name: options.name || 'grainlet-app',
    main: 'worker.js',
    compatibility_date: options.compatibilityDate || '2024-09-23',
    compatibility_flags: options.compatibilityFlags || ['nodejs_compat'],
    assets: {
      directory: './assets',
      binding: 'ASSETS',
    },
  };
}

export async function emitPlatformOutput(options = {}) {
  const target = options.target;
  if (target !== 'vercel' && target !== 'cloudflare') {
    throw new TypeError('emitPlatformOutput requires target "vercel" or "cloudflare"');
  }
  const root = resolve(options.root || process.cwd());
  const clientOutDir = resolve(root, options.clientOutDir || 'dist/client');
  const serverOutDir = resolve(root, options.serverOutDir || 'dist/server');
  const serverEntry = await findServerEntry(serverOutDir, options.serverEntry);
  const serverFileName = basename(serverEntry);

  const outDir = resolve(
    root,
    options.outDir || (target === 'vercel' ? '.vercel/output' : 'dist/cloudflare')
  );

  const staticDir = target === 'vercel'
    ? join(outDir, 'static')
    : join(outDir, 'assets');

  await mkdir(staticDir, { recursive: true });
  if (await pathExists(clientOutDir)) {
    await copyDir(clientOutDir, staticDir);
  }

  let prerendered = [];
  if (options.prerender) {
    prerendered = await writePrerenderedStatic(staticDir, options);
  }

  if (target === 'vercel') {
    const funcDir = join(outDir, 'functions', 'ssr.func');
    await mkdir(funcDir, { recursive: true });
    await copyDir(serverOutDir, funcDir);
    await writeFile(join(funcDir, 'index.js'), vercelWrapper(serverFileName));
    await writeFile(
      join(funcDir, '.vc-config.json'),
      `${JSON.stringify(vercelFunctionConfig(), null, 2)}\n`
    );
    await writeFile(
      join(outDir, 'config.json'),
      `${JSON.stringify(vercelConfig(prerendered), null, 2)}\n`
    );
  } else {
    await mkdir(outDir, { recursive: true });
    await copyDir(serverOutDir, outDir);
    await writeFile(join(outDir, 'worker.js'), cloudflareWrapper(serverFileName));
    await writeFile(
      join(outDir, 'wrangler.json'),
      `${JSON.stringify(wranglerConfig(options), null, 2)}\n`
    );
  }

  return {
    outDir,
    prerendered,
    staticDir,
    target,
  };
}

export { htmlOutputPath, posixPath, vercelConfig, wranglerConfig };
