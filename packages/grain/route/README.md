# Grainlet Router

Flat routing remains the default. Enable nested layouts, data loading, actions,
and route hydration with `mode="nested"`.

```jsx
import {
  Link,
  Outlet,
  Route,
  Router,
  useRouteLoaderData,
} from 'grainlet/route';

function Layout() {
  return <main><Link to="/">Home</Link><Outlet /></main>;
}

function Project() {
  const project = useRouteLoaderData();
  return <h1>{() => project().name}</h1>;
}

export function App({ queryClient, routeState }) {
  return (
    <Router
      mode="nested"
      queryClient={queryClient}
      hydrationState={routeState}
    >
      <Route element={Layout}>
        <Route
          path="projects/:id"
          id="project"
          component={Project}
          loader={({ params }) => fetch(`/api/projects/${params.id}`).then(r => r.json())}
        />
      </Route>
    </Router>
  );
}
```

Use `useNavigation`, `useSubmit`, `useRouteActionData`, `useRouteError`,
`useMatches`, `useParams`, `useOutletContext`, and `useSearchParams` from route
components. `queryLoader(options)` loads through the Router's `queryClient`, so
route data and `useQuery` use the same cache.

For servers, `prepareRoutes`, `renderRoute`, and `renderRouteDocument` run
loaders before rendering and return status, redirect, headers, and serializable
route/query state. Call `hydrateRouterState(state, queryClient)` before client
mount when hydration state is not passed directly to `Router`.

`renderRouteToReadableStream` preserves the same status/redirect/header contract
while streaming Suspense boundaries. Route `meta` entries are applied on both
SSR and successful client navigation; child entries replace parent entries with
the same title/name/property key.
