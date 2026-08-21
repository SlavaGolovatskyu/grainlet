/** Global SSR mode flag — set by ssr/context.js to avoid circular imports. */
let serverModeDepth = 0;

export function setServerMode(value) {
  if (value) serverModeDepth += 1;
  else serverModeDepth = Math.max(0, serverModeDepth - 1);
}

export function isServer() {
  return serverModeDepth > 0;
}
