import { PLACE_ENGAGEMENT_PATHS, POI_PATHS } from '../../api.js';
import { buildCoveredCitiesCacheKey, parseCoveredCitiesCacheKey } from './viewport.js';

export const EXPLORE_PLACES_PAGE_SIZE = 50;
export const EXPLORE_PLACES_MAX_PAGES = 20;
export const EXPLORE_PLACES_QUERY_KEY = 'pois';
export const COVERED_CITIES_DEBOUNCE_MS = 300;
export const COVERED_CITIES_STALE_MS = 5 * 60 * 1000;
export const COVERED_CITIES_GC_MS = 30 * 60 * 1000;
export const CITY_SEARCH_DEBOUNCE_MS = 300;
export const CITY_SEARCH_MIN_QUERY_LENGTH = 2;
export const POI_REVIEWS_PAGE_SIZE = 10;
export const POI_REVIEWS_SORT = 'newest';

export const POI_CATEGORIES = [
  'museum',
  'park',
  'restaurant',
  'cafe',
  'bar',
  'gallery',
  'attraction',
  'historic',
  'viewpoint',
  'nightlife',
  'shopping',
  'beach',
  'religious',
];

export const POI_CATEGORY_LABELS = {
  museum: 'Museum',
  park: 'Park',
  restaurant: 'Restaurant',
  cafe: 'Cafe',
  bar: 'Bar',
  gallery: 'Gallery',
  attraction: 'Attraction',
  historic: 'Historic',
  viewpoint: 'Viewpoint',
  nightlife: 'Nightlife',
  shopping: 'Shopping',
  beach: 'Beach',
  religious: 'Religious',
};

const URL_CITY = 'city';
const URL_CITY_ID = 'cityId';

export const EXPLORE_URL_PARAM_CITY = URL_CITY;
export const EXPLORE_URL_PARAM_CITY_ID = URL_CITY_ID;

function isErrorPayload(data) {
  return (
    data !== null &&
    typeof data === 'object' &&
    'error' in data &&
    typeof data.error === 'string'
  );
}

/** GET /api/pois — array, or legacy soft `{ error }` on HTTP 200. */
export function normalizePoisResponse(data) {
  if (Array.isArray(data)) return data;
  if (isErrorPayload(data)) return [];
  return [];
}

/** GET /api/pois/cities/covered — array, or throw on a soft error body. */
export function parseCoveredCitiesResponse(data) {
  if (Array.isArray(data)) return data;
  if (isErrorPayload(data)) throw new Error(data.error);
  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error('Failed to load cities');
  }
  return [];
}

export function normalizeReviewsPage(data) {
  if (data && typeof data === 'object' && Array.isArray(data.items)) {
    return {
      items: data.items,
      offset: Number(data.offset) || 0,
      total: Number(data.total) || 0,
    };
  }
  if (isErrorPayload(data)) throw new Error(data.error);
  return { items: [], offset: 0, total: 0 };
}

export function filterCoveredCitiesBySearch(cities, searchValue) {
  const query = String(searchValue ?? '').trim().toLowerCase();
  if (!query) return cities;
  return cities.filter(
    (city) =>
      city.name.toLowerCase().includes(query) ||
      city.country.toLowerCase().includes(query)
  );
}

export function resolveCityFromSearchResults(data, cityName, cityId) {
  const trimmed = String(cityName ?? '').trim();
  if (trimmed.length < CITY_SEARCH_MIN_QUERY_LENGTH) return null;
  const cities = Array.isArray(data) ? data : [];
  if (cities.length === 0) return null;
  if (cityId) {
    const byId = cities.find((city) => city.id === cityId);
    if (byId) return byId;
  }
  const normalized = trimmed.toLowerCase();
  return cities.find((city) => city.name.toLowerCase() === normalized) ?? null;
}

export function flattenUniquePlaces(pages) {
  const seen = new Set();
  const places = [];
  for (const page of pages ?? []) {
    if (!Array.isArray(page)) continue;
    for (const place of page) {
      if (!place || seen.has(place.id)) continue;
      seen.add(place.id);
      places.push(place);
    }
  }
  return places;
}

export function nextPlacesOffset(
  lastPage,
  allPages,
  pageSize = EXPLORE_PLACES_PAGE_SIZE,
  maxPages = EXPLORE_PLACES_MAX_PAGES
) {
  if (!Array.isArray(lastPage) || lastPage.length === 0) return undefined;
  if (lastPage.length < pageSize) return undefined;
  if (allPages.length >= maxPages) return undefined;
  return allPages.length * pageSize;
}

export function nextReviewsOffset(lastPage) {
  if (!lastPage || !Array.isArray(lastPage.items)) return undefined;
  const next = Number(lastPage.offset) + lastPage.items.length;
  if (!Number.isFinite(Number(lastPage.total)) || next >= Number(lastPage.total)) {
    return undefined;
  }
  return next;
}

export function cityToMapPoi(city) {
  return {
    id: city.id,
    name: city.name,
    category: 'attraction',
    lat: city.centerLat,
    lng: city.centerLng,
    city: city.name,
    country: city.country,
    photoUrl: city.imageCdnUrl,
    imageCdnUrl: city.imageCdnUrl,
  };
}

export function finiteCoord(place) {
  const lng = Number(place?.lng);
  const lat = Number(place?.lat);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return [lng, lat];
}

export function coveredCitiesRequest(zoom, bbox) {
  const cacheKey = buildCoveredCitiesCacheKey(zoom, bbox);
  const parsed = parseCoveredCitiesCacheKey(cacheKey);
  return {
    path: POI_PATHS.citiesCovered,
    cacheKey,
    params: {
      zoom: String(parsed.zoom),
      south: String(parsed.bbox.south),
      west: String(parsed.bbox.west),
      north: String(parsed.bbox.north),
      east: String(parsed.bbox.east),
    },
  };
}

export function citySearchRequest(query) {
  return {
    path: POI_PATHS.citiesSearch,
    params: { q: query },
  };
}

export function placesRequest(cityId, categories, offset) {
  return {
    path: POI_PATHS.list,
    params: {
      cityId: String(cityId),
      categories: String(categories),
      limit: String(EXPLORE_PLACES_PAGE_SIZE),
      offset: String(offset),
    },
  };
}

export function poiDetailPath(poiId) {
  return POI_PATHS.detail(poiId);
}

export function poiReviewsRequest(poiId, offset) {
  return {
    path: POI_PATHS.reviews(poiId),
    params: {
      limit: String(POI_REVIEWS_PAGE_SIZE),
      offset: String(offset),
      sort: POI_REVIEWS_SORT,
    },
  };
}

export function savedPoiIdsRequest(cityName) {
  return {
    path: PLACE_ENGAGEMENT_PATHS.savedIds,
    params: { city: cityName },
  };
}

export function savedPlaceIdSet(savedResponse, engagementRows) {
  if (savedResponse && Array.isArray(savedResponse.poiIds)) {
    return new Set(savedResponse.poiIds);
  }
  if (!Array.isArray(engagementRows)) return undefined;
  const ids = new Set();
  for (const row of engagementRows) {
    if (row?.isSaved && row.poiId) ids.add(row.poiId);
  }
  return ids;
}

export function exploreCitySearchParams(cityName, cityId) {
  const params = new URLSearchParams();
  params.set(URL_CITY, cityName);
  if (cityId) params.set(URL_CITY_ID, cityId);
  return params;
}

export function readExploreCityParams(searchParams) {
  return {
    city: searchParams.get(URL_CITY)?.trim() ?? '',
    cityId: searchParams.get(URL_CITY_ID)?.trim() ?? '',
  };
}
