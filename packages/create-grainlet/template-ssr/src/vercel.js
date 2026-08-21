import { createVercelHandler } from 'grainlet-adapters/vercel';
import { App, routes } from './App.jsx';

export default createVercelHandler({
  App,
  routes,
  document: {
    scripts: ['/client.js'],
  },
});
