import { useRouteContext, useOutletContext } from '../context/context.js';
import { useLocation } from '../useLocation/useLocation.js';
import { navigate, getNavigateBasename, stripBasename } from '../navigate/navigate.js';
import { getRouteState } from '../navigation/navigation.js';

export function useMatches() {
  const context = useRouteContext();
  const state = getRouteState();
  return () => context?.matches ?? state().matches;
}

export function useRouteLoaderData(routeId) {
  const context = useRouteContext();
  const id = routeId ?? context?.match?.id;
  const state = getRouteState();
  return () => context?.loaderData?.get(id) ?? state().loaderData.get(id);
}

export function useRouteActionData(routeId) {
  const context = useRouteContext();
  const id = routeId ?? context?.match?.id;
  const state = getRouteState();
  return () => context?.actionData?.get(id) ?? state().actionData.get(id);
}

export function useRouteError(routeId) {
  const context = useRouteContext();
  const id = routeId ?? context?.match?.id;
  const state = getRouteState();
  return () => context?.errors?.get(id) ?? state().errors.get(id) ?? null;
}

export function useSearchParams() {
  const location = useLocation();
  const read = () => new URLSearchParams(location().search);
  const set = (next, options = {}) => {
    const current = read();
    const value = typeof next === 'function' ? next(current) : next;
    let params;
    if (value instanceof URLSearchParams) params = value;
    else if (typeof value === 'string') {
      params = new URLSearchParams(value.startsWith('?') ? value.slice(1) : value);
    } else {
      params = new URLSearchParams();
      for (const [key, item] of Object.entries(value || {})) {
        if (Array.isArray(item)) {
          for (const entry of item) params.append(key, String(entry));
        } else if (item != null) params.set(key, String(item));
      }
    }
    const search = params.toString();
    const currentLocation = location();
    const pathname = stripBasename(
      currentLocation.pathname,
      getNavigateBasename()
    );
    return navigate(
      `${pathname}${search ? `?${search}` : ''}${currentLocation.hash}`,
      options
    );
  };
  return [read, set];
}

export { useOutletContext };
