import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { grainJsx } from 'grainlet-vite';

export default defineConfig({
  plugins: [grainJsx()],
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'grainlet',
  },
  build: {
    emptyOutDir: true,
    outDir: resolve(import.meta.dirname, 'dist/server'),
    sourcemap: true,
    rollupOptions: {
      input: resolve(import.meta.dirname, 'server-entry.jsx'),
      output: { entryFileNames: 'server-entry.js' },
    },
    ssr: true,
  },
});
