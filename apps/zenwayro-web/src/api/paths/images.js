/**
 * Image upload HTTP paths (global prefix `/api` is applied at bootstrap).
 *
 * Multipart: field `file` (required); POI upload also requires `poiId`;
 * optional `variants` JSON array; city upload requires `cityId`.
 */
export const IMAGE_PATHS = {
  profileUpload: '/api/profile-images/upload',
  cityUpload: '/api/city-images/upload',
  poiUpload: '/api/poi-images/upload',
};
