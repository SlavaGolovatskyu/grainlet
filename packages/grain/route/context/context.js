import { onCleanup } from '../../signals/onCleanup/onCleanup.js';
import { getSSRContext } from '../../ssr/context.js';

export let currentRouteMatch = null;
const routeStack = [];
const outletStack = [];

function createRouteContext(name, fallback, clientStack) {
  const context = {
    Provider(props) {
      const ssr = getSSRContext();
      const stack = ssr
        ? (ssr[name] ||= [])
        : clientStack;
      stack.push(props.value);
      onCleanup(() => stack.pop());
      return props.children;
    },
    fallback,
    name,
    stack: clientStack,
  };
  return context;
}

function readContext(context) {
  const ssr = getSSRContext();
  const stack = ssr?.[context.name] ?? context.stack;
  return stack.length ? stack[stack.length - 1] : context.fallback;
}

export const RouteContext =
  createRouteContext('routeContextStack', null, routeStack);
export const OutletContext =
  createRouteContext('outletContextStack', { value: undefined }, outletStack);

export function setCurrentRouteMatch(match) {
  const ssr = getSSRContext();
  if (ssr) {
    ssr.currentRouteMatch = match;
    return;
  }
  currentRouteMatch = match;
}

export function getCurrentRouteMatch() {
  const ssr = getSSRContext();
  if (ssr) return ssr.currentRouteMatch ?? null;
  return currentRouteMatch;
}

export function useRouteContext() {
  return readContext(RouteContext);
}

export function useOutletContext() {
  return readContext(OutletContext)?.value;
}
