/**
 * Trips + Plan HTTP paths under `/api/trips/*`
 * (global prefix `/api` is applied at bootstrap).
 *
 * Path helpers that take a day index use the param name `dayNumber` in the
 * URL (`/days/:dayNumber/...`). That is independent of JSON body/response
 * field naming (`dayNumber` vs `day`).
 */
const encodePathSegment = (segment) => encodeURIComponent(segment);

export const TRIP_PATHS = {
  root: '/api/trips',
  generateFromQuiz: '/api/trips/generate-from-quiz',
  sharedWithMe: '/api/trips/shared-with-me',
  stats: '/api/trips/stats',
  invitationsPendingMe: '/api/trips/invitations/pending-me',
  acceptInvitation: (invitationId) =>
    `/api/trips/invitations/${encodePathSegment(invitationId)}/accept`,
  byId: (tripId) => `/api/trips/${encodePathSegment(tripId)}`,
  reorder: (tripId) => `/api/trips/${encodePathSegment(tripId)}/reorder`,
  days: (tripId) => `/api/trips/${encodePathSegment(tripId)}/days`,
  dayByNumber: (tripId, dayNumber) =>
    `/api/trips/${encodePathSegment(tripId)}/days/${dayNumber}`,
  dayAutofill: (tripId, dayNumber) =>
    `/api/trips/${encodePathSegment(tripId)}/days/${dayNumber}/autofill`,
  dayRoute: (tripId, dayNumber) =>
    `/api/trips/${encodePathSegment(tripId)}/days/${dayNumber}/route`,
  dayAddPlace: (tripId) => `/api/trips/${encodePathSegment(tripId)}/days/add-place`,
  dayMovePlace: (tripId) => `/api/trips/${encodePathSegment(tripId)}/days/move-place`,
  dayRemovePlace: (tripId, dayNumber, poiId) =>
    `/api/trips/${encodePathSegment(tripId)}/days/${dayNumber}/places/${encodePathSegment(poiId)}`,
  share: (tripId) => `/api/trips/${encodePathSegment(tripId)}/share`,
  unshare: (tripId) => `/api/trips/${encodePathSegment(tripId)}/unshare`,
  collaborators: (tripId) => `/api/trips/${encodePathSegment(tripId)}/collaborators`,
  collaboratorByUserId: (tripId, collaboratorUserId) =>
    `/api/trips/${encodePathSegment(tripId)}/collaborators/${encodePathSegment(collaboratorUserId)}`,
  invitationById: (tripId, invitationId) =>
    `/api/trips/${encodePathSegment(tripId)}/invitations/${encodePathSegment(invitationId)}`,
  shared: '/api/trips/shared',
  sharedSitemap: '/api/trips/shared/sitemap',
  sharedBySlug: (slug) => `/api/trips/shared/${encodePathSegment(slug)}`,
};
