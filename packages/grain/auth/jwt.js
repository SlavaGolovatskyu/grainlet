export const ACCESS_TOKEN_EXPIRY_FALLBACK_MS = 14 * 60 * 1000;
export const ACCESS_TOKEN_EXPIRY_SAFETY_BUFFER_MS = 60 * 1000;

export function decodeJwtPayload(token) {
  try {
    const parts = String(token).split('.');
    if (parts.length < 2) return null;

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    let decoded;

    if (typeof Buffer !== 'undefined') {
      decoded = Buffer.from(padded, 'base64').toString('utf8');
    } else if (typeof atob === 'function') {
      const binary = atob(padded);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      decoded = new TextDecoder().decode(bytes);
    } else {
      return null;
    }

    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function getAccessTokenExpiry(
  accessToken,
  options = {}
) {
  const now = options.now?.() ?? Date.now();
  const fallbackMs =
    options.fallbackMs ?? ACCESS_TOKEN_EXPIRY_FALLBACK_MS;
  const safetyBufferMs =
    options.safetyBufferMs ?? ACCESS_TOKEN_EXPIRY_SAFETY_BUFFER_MS;
  const payload = decodeJwtPayload(accessToken);

  if (typeof payload?.exp === 'number') {
    return payload.exp * 1000 - safetyBufferMs;
  }
  return now + fallbackMs;
}
