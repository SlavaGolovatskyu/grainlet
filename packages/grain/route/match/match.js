/**
 * Join parent + child route paths.
 * Absolute child (starts with /) replaces; '*' stays '*'.
 */
export function joinPaths(parent, child) {
  if (child == null || child === '') return parent || '/';
  if (child === '*') return '*';
  if (child.startsWith('/')) return normalizePath(child);

  const base = (parent || '/').replace(/\/+$/, '') || '';
  const leaf = String(child).replace(/^\/+/, '');
  return normalizePath(`${base}/${leaf}`);
}

export function normalizePath(path) {
  if (!path || path === '/') return '/';
  const withSlash = path.startsWith('/') ? path : `/${path}`;
  const cleaned = withSlash.replace(/\/+/g, '/');
  if (cleaned.length > 1 && cleaned.endsWith('/')) {
    return cleaned.slice(0, -1);
  }
  return cleaned;
}

/**
 * Flatten Route descriptors into absolute patterns.
 * @returns {{ path: string, component: Function, params?: object }[]}
 */
export function flattenRoutes(routes, parentPath = '') {
  const out = [];
  if (!routes) return out;

  const list = Array.isArray(routes) ? routes : [routes];
  for (const route of list) {
    if (!route) continue;
    const full = joinPaths(parentPath, route.path ?? '');
    const kids = route.children;
    if (kids && (Array.isArray(kids) ? kids.length : true)) {
      out.push(...flattenRoutes(kids, full === '*' ? parentPath : full));
    }
    if (route.component) {
      out.push({ path: full, component: route.component });
    }
  }
  return out;
}

/**
 * Match pathname against a single pattern.
 * @returns {{ params: Record<string, string>, score: number } | null}
 */
export function matchPath(pattern, pathname) {
  const path = normalizePath(pathname);
  const pat = pattern === '*' ? '*' : normalizePath(pattern);

  if (pat === '*') {
    return { params: {}, score: 1 };
  }

  const patternParts = pat === '/' ? [] : pat.split('/').filter(Boolean);
  const pathParts = path === '/' ? [] : path.split('/').filter(Boolean);

  const lastIsStar =
    patternParts.length > 0 && patternParts[patternParts.length - 1] === '*';
  if (lastIsStar) {
    const base = patternParts.slice(0, -1);
    if (pathParts.length < base.length) return null;
    const params = {};
    let score = 10;
    for (let i = 0; i < base.length; i++) {
      const pp = base[i];
      const vp = pathParts[i];
      if (pp.startsWith(':')) {
        params[pp.slice(1)] = decodeURIComponent(vp);
        score += 5;
      } else if (pp === vp) {
        score += 20;
      } else {
        return null;
      }
    }
    params['*'] = pathParts.slice(base.length).map(decodeURIComponent).join('/');
    return { params, score };
  }

  if (patternParts.length !== pathParts.length) return null;

  const params = {};
  let score = 100;
  for (let i = 0; i < patternParts.length; i++) {
    const pp = patternParts[i];
    const vp = pathParts[i];
    if (pp.startsWith(':')) {
      params[pp.slice(1)] = decodeURIComponent(vp);
      score += 5;
    } else if (pp === vp) {
      score += 20;
    } else {
      return null;
    }
  }
  return { params, score };
}

/**
 * Pick best matching route for pathname.
 */
export function matchRoutes(routes, pathname) {
  const flat = flattenRoutes(routes);
  let best = null;

  for (const route of flat) {
    const result = matchPath(route.path, pathname);
    if (!result) continue;
    if (!best || result.score > best.score) {
      best = {
        route,
        params: result.params,
        score: result.score,
        path: route.path,
        component: route.component,
      };
    }
  }

  return best;
}

function routeList(routes) {
  if (!routes) return [];
  return Array.isArray(routes) ? routes : [routes];
}

function collectBranches(routes, parentPath = '', parents = [], branches = []) {
  routeList(routes).forEach((route, index) => {
    if (!route) return;
    const path = route.index
      ? (parentPath || '/')
      : route.path == null
        ? (parentPath || '/')
        : joinPaths(parentPath, route.path);
    const id = route.id || `${parents.map((item) => item.index).join('-')}${parents.length ? '-' : ''}${index}`;
    const segment = { id, index, path, route };
    const branch = [...parents, segment];
    const children = routeList(route.children);

    if (children.length) {
      collectBranches(children, path === '*' ? parentPath : path, branch, branches);
    }

    if (route.index || route.component || route.element || children.length === 0) {
      branches.push({
        matches: branch,
        path,
        scoreBoost: route.index ? 1000 : 0,
      });
    }
  });
  return branches;
}

/**
 * Match a nested route branch, preserving every parent layout.
 *
 * @returns {Array<{
 *   id: string,
 *   path: string,
 *   pathname: string,
 *   params: Record<string, string>,
 *   route: object,
 *   handle?: unknown,
 * }> | null}
 */
export function matchRouteBranch(routes, pathname) {
  let best = null;
  for (const branch of collectBranches(routes)) {
    const result = matchPath(branch.path, pathname);
    if (!result) continue;
    const score = result.score + branch.scoreBoost + branch.matches.length;
    if (!best || score > best.score) best = { branch, result, score };
  }
  if (!best) return null;
  const normalizedPathname = normalizePath(pathname);
  return best.branch.matches.map((segment) => ({
    id: segment.id,
    path: segment.path,
    pathname: normalizedPathname,
    params: { ...best.result.params },
    route: segment.route,
    handle: segment.route.handle,
  }));
}
