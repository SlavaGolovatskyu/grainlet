import { createCloudflareHandler } from 'grainlet-adapters/cloudflare';
import { App, routes } from './App.jsx';

export default createCloudflareHandler({
  App,
  routes,
  document: {
    scripts: ['/client.js'],
  },
});
