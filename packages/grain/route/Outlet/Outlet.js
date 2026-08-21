import { jsx } from '../../core/jsx-compiler-new/jsx-runtime.js';
import {
  OutletContext,
  useRouteContext,
} from '../context/context.js';

export function Outlet(props = {}) {
  const context = useRouteContext();
  if (!context?.outlet) return null;
  return jsx(
    OutletContext.Provider,
    { value: { value: props.context } },
    context.outlet
  );
}
