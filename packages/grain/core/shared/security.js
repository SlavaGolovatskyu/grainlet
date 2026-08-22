const NON_EVENT_ON_ATTRS = new Set(['once']);

const URL_ATTRS = new Set([
  'action',
  'background',
  'cite',
  'data',
  'formaction',
  'href',
  'poster',
  'src',
  'srcset',
  'xlink:href',
]);

const DATA_URL_TAGS = new Set(['audio', 'img', 'input', 'source', 'track', 'video']);

const SAFE_TAG_RE = /^[a-zA-Z][a-zA-Z0-9-]*$/;
const SAFE_ATTR_RE = /^[a-zA-Z_:][\w:.-]*$/;
const HOST_RE =
  /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*|localhost|\[[0-9a-fA-F:.]+\])(?::\d{1,5})?$/;

const JSON_SCRIPT_TYPES = new Set([
  'application/json',
  'application/ld+json',
]);

export function isEventProp(key) {
  if (typeof key !== 'string' || key.length < 3) return false;
  if (!/^on[a-z]/i.test(key)) return false;
  return !NON_EVENT_ON_ATTRS.has(key.toLowerCase());
}

export function eventName(key) {
  if (!isEventProp(key)) return null;
  return key.slice(2).toLowerCase();
}

export function isSafeTagName(tag) {
  return typeof tag === 'string' && SAFE_TAG_RE.test(tag);
}

export function isSafeAttributeName(name) {
  return typeof name === 'string' && SAFE_ATTR_RE.test(name);
}

export function isUrlAttribute(name) {
  return URL_ATTRS.has(String(name).toLowerCase());
}

export function isScriptTag(tag) {
  return String(tag).toLowerCase() === 'script';
}

export function isJsonScriptType(type) {
  if (type == null || type === false) return false;
  return JSON_SCRIPT_TYPES.has(String(type).trim().toLowerCase());
}

function compactUrl(value) {
  return String(value).replace(/[\u0000-\u001F\u007F\\\s]/g, '');
}

function isDangerousDataUrl(value, attrName, tagName) {
  const attr = String(attrName).toLowerCase();
  const tag = String(tagName || '').toLowerCase();
  const allowData =
    (attr === 'src' || attr === 'poster') && DATA_URL_TAGS.has(tag);
  if (!allowData) return true;
  return /data:(?:text\/html|application\/xhtml|application\/xml|image\/svg\+xml|text\/xml|application\/javascript|text\/javascript)/i.test(
    value
  );
}

export function sanitizeUrl(value, attrName, tagName) {
  if (value == null) return null;
  const raw = String(value);
  if (String(attrName).toLowerCase() === 'srcset') {
    const parts = raw.split(',');
    for (const part of parts) {
      const url = part.trim().split(/\s+/, 1)[0];
      if (url && sanitizeUrl(url, 'src', tagName) == null) return null;
    }
    return raw;
  }

  const compact = compactUrl(raw);
  const protocolMatch = compact.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (!protocolMatch) return raw;

  const protocol = protocolMatch[1].toLowerCase();
  if (protocol === 'javascript' || protocol === 'vbscript') return null;
  if (protocol === 'data' && isDangerousDataUrl(compact, attrName, tagName)) {
    return null;
  }
  return raw;
}

export function sanitizeStyleValue(value) {
  const css = String(value);
  if (/url\s*\(\s*['"]?\s*(?:javascript|vbscript|data\s*:\s*text\/html)/i.test(css)) {
    return '';
  }
  return css;
}

export function sanitizeRequestHost(host, options = {}) {
  let fallback = 'localhost';
  if (options.origin) {
    try {
      fallback = new URL(options.origin).host || fallback;
    } catch {
      // Keep the localhost fallback when origin is invalid.
    }
  }

  if (typeof host !== 'string' || !HOST_RE.test(host)) return fallback;

  if (options.allowedHosts?.length) {
    const candidates = new Set([host]);
    if (host.startsWith('[')) {
      const end = host.indexOf(']');
      if (end !== -1) candidates.add(host.slice(1, end));
    } else {
      const colon = host.lastIndexOf(':');
      if (colon !== -1 && /^\d+$/.test(host.slice(colon + 1))) {
        candidates.add(host.slice(0, colon));
      }
    }
    const allowed = options.allowedHosts.some((value) => candidates.has(value));
    if (!allowed) return fallback;
  }

  return host;
}

export function sanitizeRequestPath(url) {
  const raw = url == null ? '/' : String(url);
  if (raw.startsWith('//') || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) {
    return '/';
  }
  return raw.startsWith('/') ? raw : `/${raw}`;
}

export function resolveNodeRequestOrigin(incoming, options = {}) {
  if (options.origin) {
    try {
      return new URL(options.origin).origin;
    } catch {
      // Fall through to the request host.
    }
  }
  const protocol = incoming?.socket?.encrypted ? 'https' : 'http';
  const host = sanitizeRequestHost(incoming?.headers?.host, options);
  return `${protocol}://${host}`;
}
