import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import {
  Outlet,
  Router,
  matchRouteBranch,
  matchRoutes,
  navigate,
  prepareRoutes,
  queryLoader,
  renderRouteDocument,
  redirect,
  submitRoute,
  useNavigation,
  useSearchParams,
  useRouteLoaderData,
} from 'grainlet/route';
import { QueryClient } from 'grainlet/query';
import {
  getSSRContext,
  renderDocument,
  renderToString,
  runWithSSR,
} from 'grainlet/ssr';
import { jsx } from 'grainlet/jsx-runtime';

const nestedRoutes = [
  {
    id: 'layout',
    path: '/',
    component: () => jsx('main', {}, jsx(Outlet, {})),
    children: [
      {
        id: 'project',
        path: 'projects/:id',
        component: () => {
          const data = useRouteLoaderData();
          return jsx('h1', {}, () => data()?.name);
        },
      },
    ],
  },
];

{
  const flat = matchRoutes(
    [{ path: '/users/:id', component: () => null }],
    '/users/7'
  );
  assert.equal(flat.params.id, '7');

  const branch = matchRouteBranch(nestedRoutes, '/projects/7');
  assert.deepEqual(branch.map((match) => match.id), ['layout', 'project']);
  assert.equal(branch[0].params.id, '7');
}

{
  const html = renderToString(
    () => jsx(Router, { mode: 'nested', routes: nestedRoutes }),
    {},
    { url: '/projects/7' }
  );
  assert.match(html, /<main>/);
  assert.match(html, /<h1>/);
}

{
  const dom = new JSDOM('<!doctype html><div id="app"></div>', {
    url: 'https://example.test/start',
  });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  window.scrollTo = () => {};
  const { configureNavigation } =
    await import('../route/navigation/navigation.js');
  const { readWindowLocation, setLocationState } =
    await import('../route/location/location.js');
  setLocationState(readWindowLocation());

  const aborted = [];
  const routes = [
    { path: '/start' },
    {
      path: '/final',
      loader: () => 'done',
      meta: { title: 'Final route' },
    },
    { path: '/redirect', loader: () => redirect('/final') },
    {
      path: '/slow/:id',
      loader: ({ params, signal }) => new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve(params.id), 15);
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          aborted.push(params.id);
          reject(signal.reason);
        }, { once: true });
      }),
    },
    {
      path: '/action',
      action: async ({ formData }) => ({ value: formData.get('value') }),
      loader: () => 'revalidated',
    },
  ];
  configureNavigation({ basename: '', routes });

  const first = navigate('/slow/1');
  const second = navigate('/slow/2');
  await Promise.all([first, second]);
  assert.deepEqual(aborted, ['1']);
  assert.equal(window.location.pathname, '/slow/2');

  await navigate('/redirect');
  assert.equal(window.location.pathname, '/final');
  assert.equal(document.title, 'Final route');

  const formData = new FormData();
  formData.set('value', 'saved');
  await submitRoute('/action', { formData });
  assert.equal(window.location.pathname, '/action');
  assert.equal(useNavigation().state(), 'idle');

  const [search, setSearch] = useSearchParams();
  await setSearch({ page: 2 });
  assert.equal(search().get('page'), '2');
  dom.window.close();
  delete globalThis.window;
  delete globalThis.document;
}

{
  const queryClient = new QueryClient();
  const routes = [{
    id: 'query',
    path: '/query/:id',
    component: nestedRoutes[0].children[0].component,
    loader: queryLoader(({ params }) => ({
      queryKey: ['item', params.id],
      queryFn: () => ({ name: `Item ${params.id}` }),
    })),
    meta: ({ data }) => ({ title: data.name }),
  }];
  const prepared = await prepareRoutes(routes, '/query/9', { queryClient });
  assert.equal(prepared.routeState.loaderData[0][1].name, 'Item 9');
  assert.equal(queryClient.getQueryData(['item', '9']).name, 'Item 9');
  assert.ok(prepared.queryState.queries.length > 0);

  const result = await renderRouteDocument(
    () => jsx(Router, { mode: 'nested', queryClient, routes }),
    {},
    { queryClient, routes, url: '/query/9' }
  );
  assert.equal(result.status, 200);
  assert.match(result.document, /<title>Item 9<\/title>/);
  assert.match(result.document, /__GRAINLET_STATE__/);
}

{
  const document = renderDocument('<p>safe</p>', {
    head: '<script>alert("head")</script>',
    state: { value: '</script><script>alert(1)</script>' },
    title: '<unsafe>',
  });
  assert.match(document, /&lt;unsafe&gt;/);
  assert.match(document, /&lt;script&gt;alert/);
  assert.doesNotMatch(document, /<script>alert\\("head"\\)/);
  assert.doesNotMatch(document, /<\/script><script>alert/);
  assert.match(document, /\\u003c\/script/);
}

{
  const values = await Promise.all([
    runWithSSR(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      return getSSRContext().url;
    }, { url: '/one' }),
    runWithSSR(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return getSSRContext().url;
    }, { url: '/two' }),
  ]);
  assert.deepEqual(values, ['/one', '/two']);
}

{
  const { setNavigateBasename, getNavigateBasename } =
    await import('../route/navigate/navigate.js');
  const [first, second] = await Promise.all([
    runWithSSR(async () => {
      setNavigateBasename('/one');
      await new Promise((resolve) => setTimeout(resolve, 5));
      return getNavigateBasename();
    }, { url: '/one' }),
    runWithSSR(async () => {
      setNavigateBasename('/two');
      await new Promise((resolve) => setTimeout(resolve, 1));
      return getNavigateBasename();
    }, { url: '/two' }),
  ]);
  assert.equal(first, '/one');
  assert.equal(second, '/two');
}

console.log('router + SSR integration tests passed');
