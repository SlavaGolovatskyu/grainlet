import { createNodeHandler } from 'grainlet/ssr';
import { RoutedApp, routes } from './RoutedApp.jsx';

export const handler = createNodeHandler({
  App: RoutedApp,
  routes,
  streaming: true,
  document: {
    scripts: ['/client.js'],
    unsafeHead: `<style>
      body { font-family: system-ui, sans-serif; max-width: 40rem; margin: 2rem auto; padding: 0 1rem; }
      .badge { display: inline-block; padding: .25rem .5rem; background: #eee; border-radius: 4px; }
    </style>`,
  },
});
