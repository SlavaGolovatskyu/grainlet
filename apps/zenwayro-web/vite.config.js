import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { grainJsx } from 'grainlet-vite';
import jsxConstAccessors from './vite/jsx-const-accessors.js';

function constJsxAccessors() {
  return {
    name: 'const-jsx-accessors',
    enforce: 'pre',
    async transform(code, id) {
      if (!/\.[jt]sx$/.test(id) || id.includes('node_modules')) return null;
      const babel = await import('@babel/core');
      const syntaxJsx = (await import('@babel/plugin-syntax-jsx')).default;
      const result = await babel.transformAsync(code, {
        filename: id,
        babelrc: false,
        configFile: false,
        sourceMaps: true,
        parserOpts: { sourceType: 'module', plugins: ['jsx'] },
        plugins: [syntaxJsx, jsxConstAccessors],
      });
      if (!result?.code) return null;
      return { code: result.code, map: result.map };
    },
  };
}

export default defineConfig({
  plugins: [constJsxAccessors(), grainJsx(), tailwindcss()],
  esbuild: { jsx: 'automatic', jsxImportSource: 'grainlet' },
  server: { port: 5174, strictPort: true },
});
