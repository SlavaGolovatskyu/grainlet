// API prefixes from the Next public-path allowlist (popular-trip root, trips shared).
const API_POPULAR_TRIPS = '/api/popular-trips';
const API_TRIPS_SHARED = '/api/trips/shared';

export const ROUTE_HOME = '/';
export const ROUTE_EXPLORE = '/explore';
export const ROUTE_QUIZ = '/quiz';
export const ROUTE_TRIPS = '/trips';
export const ROUTE_SETTINGS = '/settings';
export const ROUTE_ADMIN = '/admin';
export const ROUTE_ADMIN_IMAGES = '/admin/images';
export const ROUTE_ADMIN_AI_ENRICHMENT = '/admin/ai-enrichment';
export const ROUTE_ADMIN_ARTICLE_IMPORT = '/admin/article-import';
export const ROUTE_ADMIN_ARTICLE_IMPORT_RUNS = '/admin/article-import/runs';
export const ROUTE_ADMIN_ENTITIES = '/admin/entities';
export const routeAdminArticleImportRun = (runId) =>
  `/admin/article-import/runs/${encodeURIComponent(runId)}`;
export const ROUTE_AUTH_SIGNUP = '/auth/signup';
export const ROUTE_AUTH_SIGNIN = '/auth/signin';
export const ROUTE_AUTH_FORGOT_PASSWORD = '/auth/forgot-password';
export const ROUTE_AUTH_RESET_PASSWORD = '/auth/reset-password';
export const ROUTE_AUTH_VERIFY_PENDING = '/auth/verify-pending';
export const ROUTE_TERMS = '/terms';
export const ROUTE_PRIVACY = '/privacy';
export const ROUTE_CONTACT = '/contact';
export const ROUTE_COOKIES = '/cookies';
export const ROUTE_POPULAR_TRIPS = '/popular-trips';
export const ROUTE_POPULAR_TRIPS_BROWSE_COUNTRIES = '/popular-trips/browse';
export const ROUTE_PLAN_NEW = '/plan/new';
export const ROUTE_AUTH = '/auth';
export const ROUTE_PLAN_SHARED_PREFIX = '/plan/shared/';

export const routePlanNewWithCity = (city, cityId) => {
  const params = new URLSearchParams({ city });
  if (cityId) params.set('cityId', cityId);
  return `/plan/new?${params.toString()}`;
};

export const routeExploreWithCity = (city, cityId) => {
  const params = new URLSearchParams({ city });
  if (cityId) params.set('cityId', cityId);
  return `${ROUTE_EXPLORE}?${params.toString()}`;
};

export const routePlanById = (tripId) => `/plan/${tripId}`;

export const routeAuthVerifyPendingWithEmail = (email) =>
  `/auth/verify-pending?email=${encodeURIComponent(email)}`;

export const routeAuthSignInWithCallback = (callbackUrl) =>
  `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;

export const ROUTE_AUTH_SIGNIN_TRIP_PENDING = '/auth/signin?tripPending=true';
export const ROUTE_AUTH_SIGNIN_QUIZ_PENDING = '/auth/signin?quizPending=true';

const PUBLIC_EXACT_PATHNAMES = [
  ROUTE_HOME,
  ROUTE_TERMS,
  ROUTE_PRIVACY,
  ROUTE_CONTACT,
  ROUTE_COOKIES,
  ROUTE_EXPLORE,
  ROUTE_QUIZ,
  ROUTE_AUTH,
];

const PUBLIC_PREFIX_PATHNAMES = [
  API_POPULAR_TRIPS,
  API_TRIPS_SHARED,
  `${ROUTE_AUTH}/`,
  ROUTE_PLAN_SHARED_PREFIX,
  ROUTE_POPULAR_TRIPS,
  '/plan/',
];

export function isPublicPathname(pathname) {
  if (PUBLIC_EXACT_PATHNAMES.includes(pathname)) return true;
  return PUBLIC_PREFIX_PATHNAMES.some((prefix) => pathname.startsWith(prefix));
}

export const APP_ROUTES = [
  { path: ROUTE_HOME, title: 'Home', access: 'public' },
  { path: ROUTE_EXPLORE, title: 'Explore', access: 'public' },
  { path: ROUTE_QUIZ, title: 'Quiz', access: 'public' },
  { path: ROUTE_TERMS, title: 'Terms', access: 'public' },
  { path: ROUTE_PRIVACY, title: 'Privacy', access: 'public' },
  { path: ROUTE_CONTACT, title: 'Contact', access: 'public' },
  { path: ROUTE_COOKIES, title: 'Cookies', access: 'public' },
  { path: ROUTE_AUTH_SIGNIN, title: 'Sign in', access: 'public' },
  { path: ROUTE_AUTH_SIGNUP, title: 'Sign up', access: 'public' },
  { path: ROUTE_AUTH_FORGOT_PASSWORD, title: 'Forgot password', access: 'public' },
  { path: ROUTE_AUTH_RESET_PASSWORD, title: 'Reset password', access: 'public' },
  { path: '/auth/verify', title: 'Verify', access: 'public' },
  { path: ROUTE_AUTH_VERIFY_PENDING, title: 'Verify pending', access: 'public' },
  { path: ROUTE_POPULAR_TRIPS, title: 'Popular trips', access: 'public' },
  { path: ROUTE_POPULAR_TRIPS_BROWSE_COUNTRIES, title: 'Browse countries', access: 'public' },
  { path: '/popular-trips/*', title: 'Popular trip', access: 'public' },
  { path: ROUTE_PLAN_NEW, title: 'New plan', access: 'public' },
  { path: '/plan/shared/*', title: 'Shared plan', access: 'public' },
  { path: '/plan/:id', title: 'Plan', access: 'public' },
  { path: ROUTE_TRIPS, title: 'Trips', access: 'protected' },
  { path: ROUTE_SETTINGS, title: 'Settings', access: 'protected' },
  { path: ROUTE_ADMIN, title: 'Admin', access: 'protected' },
  { path: ROUTE_ADMIN_IMAGES, title: 'Images', access: 'protected' },
  { path: ROUTE_ADMIN_AI_ENRICHMENT, title: 'AI enrichment', access: 'protected' },
  { path: ROUTE_ADMIN_ARTICLE_IMPORT, title: 'Article import', access: 'protected' },
  { path: ROUTE_ADMIN_ARTICLE_IMPORT_RUNS, title: 'Import runs', access: 'protected' },
  { path: '/admin/article-import/runs/:runId', title: 'Import run', access: 'protected' },
  { path: '/admin/cities/create', title: 'Create city', access: 'protected' },
  { path: '/admin/users', title: 'Users', access: 'protected' },
  { path: ROUTE_ADMIN_ENTITIES, title: 'Entities', access: 'protected' },
  { path: '/admin/entities/:entityKey/new', title: 'New entity', access: 'protected' },
  { path: '/admin/entities/:entityKey', title: 'Entity', access: 'protected' },
  { path: '/admin/entities/:entityKey/:recordId', title: 'Entity record', access: 'protected' },
];
