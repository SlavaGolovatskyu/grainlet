import { createGrainletHandler } from './handler.js';
import './ssr-storage.js';

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
      const asset = await serveAsset(env, request);
      if (asset) return asset;
      return handleRequest(request, { ctx, env });
    },
  };
}

export { createGrainletHandler } from './handler.js';
