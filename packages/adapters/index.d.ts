import type { Component } from 'grainlet';
import type { RequestHandlerOptions } from 'grainlet/ssr';

export interface GrainletHandlerOptions extends RequestHandlerOptions {
  App: Component<Record<string, unknown>>;
  assetPrefix?: string;
}

export declare function createGrainletHandler(
  options: GrainletHandlerOptions
): (request: Request, platformContext?: unknown) => Promise<Response>;

export declare function resolveAssetUrl(
  path: string,
  prefix?: string
): string;
export declare function detectAssetPrefix(explicit?: string): string;
export declare function withAssetPrefix<T extends { scripts?: unknown[] }>(
  document: T,
  prefix?: string
): T;

export interface EmitPlatformOutputOptions extends GrainletHandlerOptions {
  target: 'vercel' | 'cloudflare';
  root?: string;
  clientOutDir?: string;
  serverOutDir?: string;
  serverEntry?: string;
  outDir?: string;
  prerender?: boolean | string[];
  paths?: string[];
  origin?: string;
  name?: string;
  compatibilityDate?: string;
}

export declare function emitPlatformOutput(
  options: EmitPlatformOutputOptions
): Promise<{
  outDir: string;
  prerendered: string[];
  staticDir: string;
  target: 'vercel' | 'cloudflare';
}>;
