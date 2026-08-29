import { render } from 'grainlet';
import {
  Link,
  Outlet,
  Route,
  Router,
  useNavigation,
  useRouteLoaderData,
} from 'grainlet/route';

function Layout() {
  const navigation = useNavigation();
  return (
    <main>
      <nav>
        <Link to="/">Home</Link>{' · '}
        <Link to="/projects/42">Project</Link>
      </nav>
      <p>{() => navigation.state() === 'loading' ? 'Loading…' : ''}</p>
      <Outlet />
    </main>
  );
}

function Home() {
  return <h1>Nested router</h1>;
}

function Project() {
  const project = useRouteLoaderData();
  return <h1>{() => project()?.name}</h1>;
}

function NestedDataRoutingExample() {
  return (
    <Router mode="nested" basename="/nested-routing" fallback={<p>Preparing route…</p>}>
      <Route component={Layout}>
        <Route index component={Home} />
        <Route
          id="project"
          path="projects/:id"
          component={Project}
          loader={async ({ params, signal }) => {
            await new Promise((resolve, reject) => {
              const timer = setTimeout(resolve, 100);
              signal.addEventListener('abort', () => {
                clearTimeout(timer);
                reject(signal.reason);
              }, { once: true });
            });
            return { id: params.id, name: `Project ${params.id}` };
          }}
        />
      </Route>
    </Router>
  );
}

render(NestedDataRoutingExample, document.getElementById('app'));
