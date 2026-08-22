import assert from 'node:assert/strict';
import { AsyncLocalStorage } from 'node:async_hooks';
import { JSDOM } from 'jsdom';
import { jsx } from '../core/jsx-compiler-new/jsx-runtime.js';
import { createDom } from '../core/dom/dom.js';
import {
  resolveNodeRequestOrigin,
  sanitizeRequestHost,
  sanitizeRequestPath,
  sanitizeUrl,
} from '../core/shared/security.js';
import {
  getSSRContext,
  renderToString,
  runWithSSR,
  setSSRContextStorage,
} from '../ssr/index.js';
import { serializeVnode } from '../ssr/serialize.js';

function html(type, props, ...children) {
  return renderToString(() => jsx(type, props, ...children));
}

{
  const markup = html('img', {
    src: 'x',
    onerror: 'alert(1)',
    ONCLICK: 'alert(1)',
    onLoad: 'alert(1)',
  });
  assert.doesNotMatch(markup, /onerror/i);
  assert.doesNotMatch(markup, /onclick/i);
  assert.doesNotMatch(markup, /onload/i);
  assert.match(markup, /<img src="x"/);
}

{
  assert.equal(serializeVnode({
    type: 'img src=x onerror=alert(1)',
    props: {},
    children: [],
  }, () => null), '');
  assert.doesNotMatch(
    html('div><img', { src: 'x' }),
    /<div><img/
  );
}

{
  const markup = html('iframe', { srcdoc: '<script>alert(1)</script>' });
  assert.doesNotMatch(markup, /srcdoc/);
  assert.doesNotMatch(markup, /alert\(1\)/);
}

{
  const markup = html('a', { href: 'javascript:alert(1)' }, 'Go');
  assert.doesNotMatch(markup, /javascript:/i);
  assert.match(markup, /<a>Go<\/a>/);

  const dataHtml = html('iframe', { src: 'data:text/html,<script>alert(1)</script>' });
  assert.doesNotMatch(dataHtml, /data:/i);

  const image = html('img', { src: 'data:image/png;base64,aaaa' });
  assert.match(image, /data:image\/png;base64,aaaa/);

  const spaced = html('a', { href: ' java\nscript:alert(1)' });
  assert.doesNotMatch(spaced, /script:alert/i);
}

{
  const executable = html('script', {}, 'alert(1)');
  assert.match(executable, /<script><\/script>/);
  assert.doesNotMatch(executable, /alert\(1\)/);

  const json = html(
    'script',
    { type: 'application/json' },
    '</script><script>alert(1)</script>'
  );
  assert.match(json, /type="application\/json"/);
  assert.match(json, /\\u003c\/script/);
  assert.doesNotMatch(json, /<\/script><script>alert/);
}

{
  assert.equal(sanitizeUrl('javascript:alert(1)', 'href', 'a'), null);
  assert.equal(sanitizeUrl('/ok', 'href', 'a'), '/ok');
  assert.equal(
    sanitizeRequestHost('evil.com\r\nX-Injected: 1'),
    'localhost'
  );
  assert.equal(sanitizeRequestHost('evil.com:80/foo'), 'localhost');
  assert.equal(
    sanitizeRequestHost('good.example:443', {
      allowedHosts: ['good.example'],
    }),
    'good.example:443'
  );
  assert.equal(
    sanitizeRequestHost('evil.example', {
      origin: 'https://app.test',
      allowedHosts: ['app.test'],
    }),
    'app.test'
  );
  assert.equal(sanitizeRequestPath('//evil.test/steal'), '/');
  assert.equal(sanitizeRequestPath('https://evil.test/'), '/');
  assert.equal(sanitizeRequestPath('/projects/7?x=1'), '/projects/7?x=1');
  assert.equal(
    resolveNodeRequestOrigin({
      headers: { host: 'evil.test/admin' },
      socket: { encrypted: true },
    }),
    'https://localhost'
  );
  assert.equal(
    resolveNodeRequestOrigin(
      { headers: { host: 'cdn.test' }, socket: {} },
      { origin: 'https://app.test' }
    ),
    'https://app.test'
  );
}

{
  setSSRContextStorage(new AsyncLocalStorage());
  await Promise.all([
    runWithSSR(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      assert.equal(getSSRContext().url, '/a');
    }, { url: '/a' }),
    runWithSSR(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      assert.equal(getSSRContext().url, '/b');
    }, { url: '/b' }),
  ]);
}

{
  const dom = new JSDOM('<!doctype html><div id="root"></div>');
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  const owner = {
    _effects: [],
    _cleanups: [],
    _effectsInitialized: true,
    _renderCount: 1,
    _children: new Map(),
    _bindings: [],
    _mountChild() {
      return document.createElement('span');
    },
  };

  const img = createDom({
    type: 'img',
    props: { src: 'x', onerror: 'alert(1)', ONCLICK: 'alert(1)' },
    children: [],
  }, owner);
  assert.equal(img.getAttribute('onerror'), null);
  assert.equal(img.getAttribute('onclick'), null);

  const link = createDom({
    type: 'a',
    props: { href: 'javascript:alert(1)' },
    children: ['Go'],
  }, owner);
  assert.equal(link.getAttribute('href'), null);

  const script = createDom({
    type: 'script',
    props: {},
    children: ['alert(1)'],
  }, owner);
  assert.equal(script.textContent, '');

  const injected = createDom({
    type: 'img src=x onerror=alert(1)',
    props: {},
    children: [],
  }, owner);
  assert.equal(injected.nodeType, dom.window.Node.TEXT_NODE);
}

console.log('security tests passed');
