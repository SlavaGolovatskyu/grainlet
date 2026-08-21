import { hydrate } from 'grainlet';
import { QueryClient } from 'grainlet/query';
import { hydrateRouterState } from 'grainlet/route';
import { App } from './App.jsx';

const state = JSON.parse(
  document.getElementById('__GRAINLET_STATE__')?.textContent || 'null'
);
const queryClient = new QueryClient();
hydrateRouterState(state, queryClient);
hydrate(App, document.getElementById('app'), { queryClient });
