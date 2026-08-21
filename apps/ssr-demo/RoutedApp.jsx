import {
  Outlet,
  Router,
  Link,
  queryLoader,
  redirect,
  useRouteLoaderData,
} from 'grainlet/route';
import { QueryClientProvider } from 'grainlet/query';
import { Head, Meta } from 'grainlet/ssr';

function Layout() {
  return (
    <main>
      <Head>
        <Meta name="description" content="Nested data routing with SSR" />
      </Head>
      <h1>Nested Router + SSR</h1>
      <nav>
        <Link to="/ssr">Home</Link>{' · '}
        <Link to="/ssr/projects/42">Project</Link>
      </nav>
      <Outlet />
    </main>
  );
}

function Home() {
  return <p>Open <a href="/ssr/projects/42">project 42</a>.</p>;
}

function Project() {
  const project = useRouteLoaderData('project');
  return <p class="badge">{() => project()?.name}</p>;
}

export const routes = [
  {
    id: 'layout',
    path: '/ssr',
    component: Layout,
    meta: { title: 'Grainlet routed SSR' },
    children: [
      { id: 'home', index: true, component: Home },
      {
        id: 'project',
        path: 'projects/:id',
        component: Project,
        loader: queryLoader(({ params }) => ({
          queryKey: ['project', params.id],
          queryFn: async () => ({ id: params.id, name: `Project ${params.id}` }),
        })),
        meta: ({ data }) => ({ title: data?.name || 'Project' }),
      },
      {
        path: 'old',
        loader: () => redirect('/ssr/projects/42'),
      },
    ],
  },
];

export function RoutedApp(props) {
  const queryClient = props.queryClient;
  return (
    <QueryClientProvider client={queryClient}>
      <Router
        mode="nested"
        routes={routes}
        queryClient={queryClient}
      />
    </QueryClientProvider>
  );
}
