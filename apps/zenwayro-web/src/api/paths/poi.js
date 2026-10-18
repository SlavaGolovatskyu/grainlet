/**
 * POI + Cities HTTP paths (global prefix `/api` is applied at bootstrap).
 *
 * Admin/article-import/image-upload paths are intentionally omitted from this
 * domain slice (pair #2 public/city read surface + FE-critical detail/reviews).
 */
const encodePathSegment = (segment) => encodeURIComponent(segment);

export const POI_PATHS = {
  list: '/api/pois',
  search: '/api/pois/search',
  suggestions: '/api/pois/suggestions',
  detail: (poiId) => `/api/pois/${encodePathSegment(poiId)}/detail`,
  reviews: (poiId) => `/api/pois/${encodePathSegment(poiId)}/reviews`,
  citiesAll: '/api/pois/cities/all',
  citiesCovered: '/api/pois/cities/covered',
  citiesSearch: '/api/pois/cities/search',
  citiesTrending: '/api/pois/cities/trending',
};
