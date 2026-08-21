import type { GrainletHandlerOptions } from './index.js';

export declare function createVercelHandler(
  options: GrainletHandlerOptions
): (request: Request, context?: unknown) => Promise<Response>;

export { createGrainletHandler } from './index.js';
export type { GrainletHandlerOptions } from './index.js';
