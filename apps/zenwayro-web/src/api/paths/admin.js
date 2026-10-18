/**
 * Admin / contributor POI + article-import HTTP paths
 * (global prefix `/api` is applied at bootstrap).
 *
 * Public POI/city reads stay in `poi/`. Image uploads stay in `images/`.
 */
const encodePathSegment = (segment) => encodeURIComponent(segment);

export const ADMIN_PATHS = {
  createCity: '/api/pois/cities',
  /** AdminGuard covered-cities list (same path string as create; method differs). */
  adminCities: '/api/pois/cities',
  adminCityPois: (cityId) => `/api/pois/admin/cities/${encodePathSegment(cityId)}/pois`,
  createManualPoi: '/api/pois/admin/manual',
  adminPoiById: (poiId) => `/api/pois/admin/${encodePathSegment(poiId)}`,
  aiEnrichmentStats: '/api/pois/admin/ai-enrichment/stats',
  aiEnrichmentPois: '/api/pois/admin/ai-enrichment/pois',
  aiEnrichmentPoiById: (poiId) =>
    `/api/pois/admin/ai-enrichment/pois/${encodePathSegment(poiId)}`,
  articleImportAnalyze: '/api/pois/admin/article-import/analyze',
  articleImportSave: '/api/pois/admin/article-import/save',
  articleImportRuns: '/api/pois/admin/article-import/runs',
  articleImportRunById: (runId) =>
    `/api/pois/admin/article-import/runs/${encodePathSegment(runId)}`,
  articleImportRunSave: (runId) =>
    `/api/pois/admin/article-import/runs/${encodePathSegment(runId)}/save`,
  articleImportDraftById: (draftId) =>
    `/api/pois/admin/article-import/drafts/${encodePathSegment(draftId)}`,
  articleImportDraftDiscard: (draftId) =>
    `/api/pois/admin/article-import/drafts/${encodePathSegment(draftId)}/discard`,
};
