import { createNodeHandler } from 'grainlet/ssr';
import { App, routes } from './App.jsx';

export const handler = createNodeHandler({
  App,
  routes,
  document: {
    scripts: [import.meta.env?.PROD ? '/client.js' : '/src/client.jsx'],
  },
});
