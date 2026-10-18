/**
 * Users HTTP paths (global prefix `/api` is applied at bootstrap).
 */
const encodePathSegment = (segment) => encodeURIComponent(segment);

export const USERS_PATHS = {
  me: '/api/users/me',
  adminCleanupExpired: '/api/users/admin/cleanup-expired',
  adminList: '/api/users/admin/list',
  adminStats: '/api/users/admin/stats',
  adminRoles: (userId) => `/api/users/admin/${encodePathSegment(userId)}/roles`,
  adminDelete: (userId) => `/api/users/admin/${encodePathSegment(userId)}`,
  adminTrips: (userId) => `/api/users/admin/${encodePathSegment(userId)}/trips`,
  adminPopularTrips: (userId) =>
    `/api/users/admin/${encodePathSegment(userId)}/popular-trips`,
  adminPoiReviews: (userId) =>
    `/api/users/admin/${encodePathSegment(userId)}/poi-reviews`,
};
