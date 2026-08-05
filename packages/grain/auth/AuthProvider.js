import { onCleanup } from '../signals/index.js';
import { jsx } from '../core/jsx-compiler-new/jsx-runtime.js';
import { createAuth } from './createAuth.js';
import { AuthContext } from './context.js';

export function AuthProvider(props) {
  const auth = props.client ?? createAuth(props.config ?? {});
  auth.initialize().catch(() => {});
  onCleanup(() => auth.dispose());

  const children = props.children;
  const content =
    typeof children === 'function' ? children(auth) : children;

  return jsx(AuthContext.Provider, { value: auth }, content);
}
