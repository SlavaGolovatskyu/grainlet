export function resolveAssetUrl(path, prefix = '') {
  if (path == null || path === '') return path;
  if (typeof path !== 'string') return path;
  if (
    path.startsWith('http://')
    || path.startsWith('https://')
    || path.startsWith('//')
    || path.startsWith('data:')
  ) {
    return path;
  }
  const base = String(prefix || '').replace(/\/$/, '');
  const file = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${file}` : file;
}

export function detectAssetPrefix(explicit) {
  if (explicit != null && explicit !== '') return String(explicit).replace(/\/$/, '');
  const env = globalThis.process?.env;
  if (env?.GRAINLET_ASSET_PREFIX) {
    return String(env.GRAINLET_ASSET_PREFIX).replace(/\/$/, '');
  }
  return '';
}

export function withAssetPrefix(document = {}, prefix) {
  const resolved = detectAssetPrefix(prefix);
  if (!resolved) return document;
  const scripts = (document.scripts || []).map((script) => {
    if (typeof script === 'string') return resolveAssetUrl(script, resolved);
    if (script && typeof script === 'object' && typeof script.src === 'string') {
      return { ...script, src: resolveAssetUrl(script.src, resolved) };
    }
    return script;
  });
  return { ...document, scripts };
}
