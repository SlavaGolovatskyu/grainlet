/**
 * Popular trips HTTP paths under `/api/popular-trips/*`
 * (global prefix `/api` is applied at bootstrap).
 *
 * SEO-sensitive: list/detail/directory slug surfaces power ISR + sitemap.
 * Do not rename path segments without a versioned break.
 *
 * `byId` accepts either a UUID or an SEO `tripSlug` key (detail GET only).
 * Mutation paths (`copy` / `like` / `rating` / DELETE) require a UUID id.
 */
const encodePathSegment = (segment) => encodeURIComponent(segment);

export const POPULAR_TRIP_PATHS = {
  root: '/api/popular-trips',
  directoryCountries: '/api/popular-trips/directory/countries',
  directoryCities: (countrySlug) =>
    `/api/popular-trips/directory/countries/${encodePathSegment(countrySlug)}/cities`,
  byOriginalTrip: (tripId) => `/api/popular-trips/by-trip/${encodePathSegment(tripId)}`,
  adminGenerationPreview: '/api/popular-trips/admin/generation-preview',
  adminGenerate: '/api/popular-trips/admin/generate',
  adminGenerateJob: (jobId) =>
    `/api/popular-trips/admin/generate/${encodePathSegment(jobId)}`,
  /** UUID id or SEO `tripSlug` key (detail GET). */
  byId: (idOrTripSlug) => `/api/popular-trips/${encodePathSegment(idOrTripSlug)}`,
  /** UUID popular-trip id. */
  copy: (id) => `/api/popular-trips/${encodePathSegment(id)}/copy`,
  /** UUID popular-trip id. */
  like: (id) => `/api/popular-trips/${encodePathSegment(id)}/like`,
  /** UUID popular-trip id. */
  rating: (id) => `/api/popular-trips/${encodePathSegment(id)}/rating`,
};
