import { Outlet, Router } from 'grainlet/route';
import { Head, Meta, Title } from 'grainlet/ssr';

function Layout() {
  return (
    <main>
      <Head>
        <Title>__PROJECT_NAME__</Title>
        <Meta name="description" content="Grainlet SSR application" />
      </Head>
      <Outlet />
    </main>
  );
}

function Home() {
  return <h1>Production Grainlet SSR</h1>;
}

export const routes = [{
  id: 'root',
  path: '/',
  component: Layout,
  children: [{ id: 'home', index: true, component: Home }],
}];

export function App(props) {
  return (
    <Router
      mode="nested"
      queryClient={props.queryClient}
      routes={routes}
    />
  );
}
