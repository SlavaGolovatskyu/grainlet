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
    sourcemap: true,
    outDir: resolve(import.meta.dirname, 'dist/client'),
    rollupOptions: {
      input: resolve(import.meta.dirname, 'client.js'),
      output: { entryFileNames: 'client.js' },
    },
  },
});
