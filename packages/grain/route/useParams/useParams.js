import { createSignal } from '../../signals/createSignal/createSignal.js';
import {
  getCurrentRouteMatch,
  useRouteContext,
} from '../context/context.js';

const [getParams, setParams] = createSignal({});

/** Sync params signal when Router updates the active match. */
export function publishParams(params) {
  setParams(params && typeof params === 'object' ? params : {});
}

/**
 * @returns {() => Record<string, string>}
 */
export function useParams() {
  const context = useRouteContext();
  return () => {
    if (context?.match?.params) return context.match.params;
    const current = getCurrentRouteMatch()?.params;
    if (current) return current;
    const fromSignal = getParams();
    if (fromSignal && Object.keys(fromSignal).length > 0) return fromSignal;
    return {};
  };
}
