import { hydrate } from 'grainlet';
import { QueryClient } from 'grainlet/query';
import { hydrateRouterState } from 'grainlet/route';
import { RoutedApp } from './RoutedApp.jsx';

const stateNode = document.getElementById('__GRAINLET_STATE__');
const state = stateNode ? JSON.parse(stateNode.textContent) : undefined;
const queryClient = new QueryClient();
hydrateRouterState(state, queryClient);
hydrate(RoutedApp, document.getElementById('app'), { queryClient });
