/**
 * Place engagement HTTP paths under `/api/users/me/*`
 * (global prefix `/api` is applied at bootstrap).
 */
const encodePathSegment = (segment) => encodeURIComponent(segment);

export const PLACE_ENGAGEMENT_PATHS = {
  batch: '/api/users/me/poi-engagement/batch',
  ratings: '/api/users/me/poi-ratings',
  ratingByPoi: (poiId) => `/api/users/me/poi-ratings/${encodePathSegment(poiId)}`,
  savedToggle: '/api/users/me/saved-pois/toggle',
  savedByPoi: (poiId) => `/api/users/me/saved-pois/${encodePathSegment(poiId)}`,
  savedIds: '/api/users/me/saved-poi-ids',
  savedList: '/api/users/me/saved-pois',
};
