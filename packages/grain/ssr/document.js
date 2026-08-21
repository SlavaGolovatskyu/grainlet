import { escapeHtml } from './serialize.js';
import { renderHead } from './head.js';

export function serializeDocumentState(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function renderScript(script, nonce) {
  if (typeof script === 'string') {
    return `<script type="module" src="${escapeHtml(script)}"${nonce ? ` nonce="${escapeHtml(nonce)}"` : ''}></script>`;
  }
  const attributes = Object.entries(script || {})
    .filter(([, value]) => value != null && value !== false)
    .map(([name, value]) => `${name}="${escapeHtml(value)}"`)
    .join(' ');
  return `<script${attributes ? ` ${attributes}` : ''}></script>`;
}

/**
 * Wrap a body HTML fragment in a full HTML document for SSR responses.
 */
export function wrapHtmlDocument(body, options = {}) {
  const title = options.title === false ? null : (options.title || 'App');
  const head = options.head ? escapeHtml(options.head) : '';
  const managedHead = options.managedHead || '';
  const unsafeHead = options.unsafeHead || '';
  const scripts = (options.scripts || [])
    .map((src) => {
      if (typeof src === 'string') return renderScript(src, options.nonce);
      return typeof src === 'object'
        ? renderScript({ nonce: options.nonce, ...src })
        : String(src);
    })
    .join('\n    ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${title == null ? '' : `<title>${escapeHtml(title)}</title>`}
  ${managedHead}
  ${head}
  ${unsafeHead}
</head>
<body>
  <div id="app">${body}</div>
  ${scripts}
</body>
</html>`;
}

export function renderDocument(body, options = {}) {
  const managedHead = options.managedHead ?? renderHead(options.context);
  const state = options.state === undefined
    ? ''
    : `<script id="${escapeHtml(options.stateId || '__GRAINLET_STATE__')}" type="application/json"${options.nonce ? ` nonce="${escapeHtml(options.nonce)}"` : ''}>${serializeDocumentState(options.state)}</script>`;
  const document = wrapHtmlDocument(body, {
    ...options,
    title: options.title ?? (managedHead.includes('<title>') ? false : undefined),
    managedHead,
    scripts: options.scripts || [],
  });
  return state ? document.replace('</body>', `  ${state}\n</body>`) : document;
}
