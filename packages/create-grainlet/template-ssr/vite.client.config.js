import { defineConfig } from 'vite';
import { grainJsx } from 'grainlet-vite';

export default defineConfig({
  plugins: [grainJsx()],
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'grainlet',
  },
  build: {
    outDir: 'dist/client',
    sourcemap: true,
    rollupOptions: {
      input: 'src/client.jsx',
      output: { entryFileNames: 'client.js' },
    },
  },
});
