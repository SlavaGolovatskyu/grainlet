import { createGrainletHandler } from './handler.js';
import './ssr-storage.js';

export function createVercelHandler(options = {}) {
  const handleRequest = createGrainletHandler(options);
  return async function vercelHandler(request, context) {
    return handleRequest(request, context);
  };
}

export { createGrainletHandler } from './handler.js';
