import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { Suspense, createResource } from 'grainlet';
import { renderToReadableStream } from 'grainlet/ssr';
import { jsx } from 'grainlet/jsx-runtime';

function AsyncValue(props) {
  const [value] = createResource(async () => {
    await new Promise((resolve) => setTimeout(resolve, props.delay));
    return props.value;
  });
  return jsx('strong', { 'data-value': props.value }, value);
}

function App() {
  return jsx(
    'main',
    {},
    jsx(
      Suspense,
      { fallback: jsx('i', {}, 'slow fallback') },
      jsx(AsyncValue, { delay: 15, value: 'slow' })
    ),
    jsx(
      Suspense,
      { fallback: jsx('i', {}, 'fast fallback') },
      jsx(AsyncValue, { delay: 1, value: 'fast' })
    )
  );
}

const stream = renderToReadableStream(App, {}, {
  document: { title: 'Stream' },
  nonce: 'test-nonce',
  state: { safe: '</script>' },
});
const reader = stream.getReader();
const decoder = new TextDecoder();
const chunks = [];
const first = await reader.read();
chunks.push(decoder.decode(first.value));
await stream.shellReady;
assert.match(chunks[0], /slow fallback/);
assert.match(chunks[0], /fast fallback/);

while (true) {
  const result = await reader.read();
  if (result.done) break;
  chunks.push(decoder.decode(result.value));
}
await stream.allReady;
const html = chunks.join('');
assert.ok(
  html.indexOf(')("g1"') < html.indexOf(')("g0"'),
  'resolved boundaries flush out of order'
);
assert.match(html, /nonce="test-nonce"/);
assert.doesNotMatch(html, /<\/script><script>/);

const dom = new JSDOM(html, { runScripts: 'dangerously' });
assert.equal(dom.window.document.querySelector('[data-value="fast"]').textContent, 'fast');
assert.equal(dom.window.document.querySelector('[data-value="slow"]').textContent, 'slow');
assert.equal(
  dom.window.document.querySelectorAll('[data-grainlet-stream-boundary]').length,
  0
);
dom.window.close();

{
  const controller = new AbortController();
  const aborted = renderToReadableStream(App, {}, {
    document: { title: 'Abort' },
    signal: controller.signal,
  });
  const expected = Promise.all([
    assert.rejects(aborted.shellReady),
    assert.rejects(aborted.allReady),
  ]);
  controller.abort();
  await expected;
}

console.log('streaming SSR tests passed');
