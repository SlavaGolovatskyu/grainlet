import type { EmitPlatformOutputOptions } from './index.js';

export interface GrainJsxLikePlugin {
  name: string;
  apply?: 'build' | 'serve';
  configResolved?(config: { root: string; build?: { outDir?: string } }): void;
  closeBundle?(): void | Promise<void>;
}

export declare function grainletPlatform(
  options: EmitPlatformOutputOptions
): GrainJsxLikePlugin;

export { emitPlatformOutput } from './index.js';
export type { EmitPlatformOutputOptions } from './index.js';
