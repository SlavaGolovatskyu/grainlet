import type { GrainletHandlerOptions } from './index.js';

export interface CloudflareHandler {
  fetch(
    request: Request,
    env?: unknown,
    ctx?: unknown
  ): Promise<Response>;
}

export declare function createCloudflareHandler(
  options: GrainletHandlerOptions
): CloudflareHandler;

export { createGrainletHandler } from './index.js';
export type { GrainletHandlerOptions } from './index.js';
