import { createRequestHandler } from 'grainlet/ssr';
import { withAssetPrefix } from './assets.js';

const DEFAULT_SCRIPTS = ['/client.js'];

export function createGrainletHandler(options = {}) {
  if (typeof options.App !== 'function') {
    throw new TypeError('createGrainletHandler requires an App component');
  }
  const document = {
    scripts: DEFAULT_SCRIPTS,
    ...(options.document || {}),
  };
  return createRequestHandler({
    ...options,
    document: withAssetPrefix(document, options.assetPrefix),
  });
}
