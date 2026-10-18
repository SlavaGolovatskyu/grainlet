import { defineConfig } from 'vite';
import { grainJsx } from 'grainlet-vite';

export default defineConfig({
  plugins: [grainJsx()],
  esbuild: { jsx: 'automatic', jsxImportSource: 'grainlet' },
  server: { port: 5174, strictPort: true },
});
