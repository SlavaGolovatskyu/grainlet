import assert from 'node:assert/strict';
import { createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { handler } from '../dist/server/server-entry.js';

const server = createServer((request, response) => {
  if (request.url === '/client.js') {
    response.setHeader('content-type', 'text/javascript');
    createReadStream(resolve('dist/client/client.js')).pipe(response);
    return;
  }
  handler(request, response);
});
await new Promise((resolveListen) =>
  server.listen(0, '127.0.0.1', resolveListen)
);
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage();
  page.setDefaultTimeout(15_000);
  page.setDefaultNavigationTimeout(15_000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error));
  await page.goto(`${origin}/ssr/projects/42`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Project 42');
  assert.equal(await page.title(), 'Project 42');
  await page.getByText('Home', { exact: true }).click();
  await page.waitForURL(`${origin}/ssr`);
  assert.match(await page.textContent('body'), /Open project 42/);
  await page.getByText('Project', { exact: true }).click();
  await page.waitForURL(`${origin}/ssr/projects/42`);
  assert.equal(await page.title(), 'Project 42');
  assert.deepEqual(errors, []);

  const noScript = await browser.newContext({ javaScriptEnabled: false });
  const noScriptPage = await noScript.newPage();
  await noScriptPage.goto(`${origin}/ssr/projects/42`);
  assert.match(await noScriptPage.textContent('body'), /Project 42/);
  await noScript.close();
} finally {
  await browser.close();
  await new Promise((resolveClose, reject) =>
    server.close((error) => error ? reject(error) : resolveClose())
  );
}

console.log('production browser SSR test passed');
