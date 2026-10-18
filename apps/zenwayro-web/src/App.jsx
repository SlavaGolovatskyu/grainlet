import { Route, Link, Router } from 'grainlet/route';
import { ProtectedRoute } from 'grainlet/auth';
import { Placeholder } from './pages/Placeholder.jsx';
import {
  APP_ROUTES,
  ROUTE_AUTH_SIGNIN,
  ROUTE_EXPLORE,
  ROUTE_HOME,
  ROUTE_POPULAR_TRIPS,
  ROUTE_QUIZ,
  ROUTE_SETTINGS,
  ROUTE_TRIPS,
} from './routes.js';

function page(title, access) {
  return function Page() {
    if (access === 'protected') {
      return (
        <ProtectedRoute
          redirectTo="/"
          preserveCallback={false}
          loadingFallback={<p>Loading session…</p>}
        >
          <Placeholder title={title} />
        </ProtectedRoute>
      );
    }
    return <Placeholder title={title} />;
  };
}

const routePages = APP_ROUTES.map((route) => ({
  path: route.path,
  component: page(route.title, route.access),
}));

export function App() {
  return (
    <div class="shell">
      <header class="header">
        <Link class="brand" href="/">Zenwayro</Link>
        <nav class="nav">
          <Link href={ROUTE_HOME}>Home</Link>
          <Link href={ROUTE_EXPLORE}>Explore</Link>
          <Link href={ROUTE_QUIZ}>Quiz</Link>
          <Link href={ROUTE_POPULAR_TRIPS}>Popular trips</Link>
          <Link href={ROUTE_TRIPS}>Trips</Link>
          <Link href={ROUTE_SETTINGS}>Settings</Link>
          <Link href={ROUTE_AUTH_SIGNIN}>Sign in</Link>
        </nav>
      </header>
      <main class="main">
        <Router>
          {routePages.map((route) => {
            const path = route.path;
            const component = route.component;
            return <Route path={path} component={component} />;
          })}
        </Router>
      </main>
    </div>
  );
}
