/**
 * Notifications HTTP paths under `/api/notifications/*`
 * (global prefix `/api` is applied at bootstrap).
 */
const encodePathSegment = (segment) => encodeURIComponent(segment);

export const NOTIFICATION_PATHS = {
  list: '/api/notifications',
  unreadCount: '/api/notifications/unread-count',
  readAll: '/api/notifications/read-all',
  stream: '/api/notifications/stream',
  readById: (id) => `/api/notifications/${encodePathSegment(id)}/read`,
};
