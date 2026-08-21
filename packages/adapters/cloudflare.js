import { setSSRContextStorage } from 'grainlet/ssr';
import { createGrainletHandler } from './handler.js';

let storageConfigured = false;

function maybeInstallStorage() {
  if (storageConfigured) return;
  const AsyncLocalStorage = globalThis.AsyncLocalStorage
    ?? globalThis.Cloudflare?.AsyncLocalStorage;
  if (AsyncLocalStorage && typeof AsyncLocalStorage === 'function') {
    setSSRContextStorage(new AsyncLocalStorage());
    storageConfigured = true;
  }
}

async function serveAsset(env, request) {
  if (typeof env?.ASSETS?.fetch !== 'function') return null;
  try {
    const response = await env.ASSETS.fetch(request);
    if (response && response.status !== 404) return response;
  } catch {
    return null;
  }
  return null;
}

export function createCloudflareHandler(options = {}) {
  const handleRequest = createGrainletHandler(options);
  return {
    async fetch(request, env, ctx) {
      maybeInstallStorage();
      const asset = await serveAsset(env, request);
      if (asset) return asset;
      return handleRequest(request, { ctx, env });
    },
  };
}

export { createGrainletHandler } from './handler.js';
