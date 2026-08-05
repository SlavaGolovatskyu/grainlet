import { createEffect } from '../signals/index.js';
import {
  navigate,
  stripBasename,
} from '../route/navigate/navigate.js';
import { useLocation } from '../route/useLocation/useLocation.js';
import { useSession } from './context.js';

function redirectUrl(target, callbackUrl, callbackParam) {
  const separator = target.includes('?') ? '&' : '?';
  return `${target}${separator}${encodeURIComponent(
    callbackParam
  )}=${encodeURIComponent(callbackUrl)}`;
}

export function ProtectedRoute(props) {
  const auth = props.client ?? useSession();
  const location = useLocation();
  let redirected = false;

  createEffect(() => {
    if (auth.status() !== 'unauthenticated') {
      redirected = false;
      return;
    }
    if (redirected) return;
    const target = props.redirectTo ?? '/auth/signin';
    if (target === false) return;

    const current = location();
    const callbackUrl =
      stripBasename(current.pathname, props.basename) +
      (current.search ?? '') +
      (current.hash ?? '');
    const destination =
      props.preserveCallback === false
        ? target
        : redirectUrl(
            target,
            callbackUrl,
            props.callbackParam ?? 'callbackUrl'
          );

    redirected = true;
    navigate(destination, {
      replace: props.replace !== false,
      basename: props.basename,
    });
  });

  const state = auth.status();
  if (state === 'loading') {
    return props.loadingFallback ?? props.fallback ?? null;
  }
  if (state !== 'authenticated') {
    return props.unauthenticatedFallback ?? props.fallback ?? null;
  }

  return typeof props.children === 'function'
    ? props.children(auth.data())
    : props.children;
}
