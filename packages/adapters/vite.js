import { resolve } from 'node:path';
import { emitPlatformOutput } from './output.js';

export function grainletPlatform(userOptions = {}) {
  if (userOptions.target !== 'vercel' && userOptions.target !== 'cloudflare') {
    throw new TypeError('grainletPlatform requires target "vercel" or "cloudflare"');
  }

  let config;

  return {
    name: 'grainlet-platform',
    apply: 'build',
    configResolved(resolved) {
      config = resolved;
    },
    async closeBundle() {
      const root = config?.root || process.cwd();
      const ssrOutDir = config?.build?.outDir
        ? resolve(root, config.build.outDir)
        : undefined;
      await emitPlatformOutput({
        ...userOptions,
        root,
        serverOutDir: userOptions.serverOutDir || ssrOutDir,
      });
    },
  };
}

export { emitPlatformOutput } from './output.js';
