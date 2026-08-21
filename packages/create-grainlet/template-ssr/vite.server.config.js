import { defineConfig } from 'vite';
import { grainJsx } from 'grainlet-vite';

export default defineConfig({
  plugins: [grainJsx()],
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'grainlet',
  },
  build: {
    outDir: 'dist/server',
    sourcemap: true,
    rollupOptions: {
      input: 'src/server.jsx',
      output: { entryFileNames: 'server.js' },
    },
    ssr: true,
  },
});
