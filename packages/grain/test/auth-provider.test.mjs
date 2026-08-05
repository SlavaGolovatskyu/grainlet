import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM(
  '<!DOCTYPE html><html><body><div id="app"></div><div id="guard"></div></body></html>',
  { url: 'https://example.test/private?tab=profile' }
);
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.HTMLElement = dom.window.HTMLElement;

const { createComponent } = await import('../core/component/component.js');
const { jsx } = await import('../core/jsx-compiler-new/jsx-runtime.js');
const { render } = await import('../core/render/render.js');
const {
  AuthProvider,
  ProtectedRoute,
  createAuth,
  createMemoryStorage,
  useSession,
} = await import('../auth/index.js');

assert.throws(
  () => useSession(),
  /no AuthProvider found/,
  'useSession requires a provider'
);

const client = createAuth({
  storage: createMemoryStorage({
    user: { id: 'context-user', name: 'Grain User' },
    provider: 'credentials',
  }),
  autoRefresh: false,
});
await client.initialize();

const SessionView = createComponent(() => {
  const session = useSession();
  return jsx(
    'p',
    { 'data-testid': 'session' },
    `${session.status()}:${session.data()?.user.name}`
  );
});
const App = createComponent(() =>
  jsx(AuthProvider, {
    client,
    children: jsx(SessionView, {}),
  })
);

render(App, document.getElementById('app'));
assert.equal(
  document.querySelector('[data-testid="session"]').textContent,
  'authenticated:Grain User'
);

const unauthenticatedClient = {
  status: () => 'unauthenticated',
  data: () => null,
};
const Guard = createComponent(() =>
  jsx(ProtectedRoute, {
    client: unauthenticatedClient,
    redirectTo: '/auth/signin',
    fallback: jsx('span', { 'data-testid': 'blocked' }, 'Redirecting'),
    children: jsx('span', { 'data-testid': 'private' }, 'Private'),
  })
);

render(Guard, document.getElementById('guard'));
assert.equal(
  document.querySelector('[data-testid="blocked"]').textContent,
  'Redirecting'
);
assert.equal(document.querySelector('[data-testid="private"]'), null);
assert.equal(window.location.pathname, '/auth/signin');
assert.equal(
  new URLSearchParams(window.location.search).get('callbackUrl'),
  '/private?tab=profile'
);

console.log('auth-provider tests passed');
