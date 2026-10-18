import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PLACE_ENGAGEMENT_PATHS, POI_PATHS } from '../../../api.js';
import {
  citySearchRequest,
  coveredCitiesRequest,
  filterCoveredCitiesBySearch,
  flattenUniquePlaces,
  nextPlacesOffset,
  nextReviewsOffset,
  normalizePoisResponse,
  normalizeReviewsPage,
  parseCoveredCitiesResponse,
  placesRequest,
  poiDetailPath,
  poiReviewsRequest,
  readExploreCityParams,
  resolveCityFromSearchResults,
  savedPlaceIdSet,
  savedPoiIdsRequest,
} from '../normalize.js';
import {
  buildCoveredCitiesCacheKey,
  EUROPE_MAP_CENTER,
  hasMapViewportChanged,
  MAP_STYLE_DARK_URL,
  MAP_STYLE_LIGHT_URL,
  mapStyleUrl,
  parseCoveredCitiesCacheKey,
  quantizeCoveredCitiesBbox,
  quantizeCoveredCitiesZoom,
  viewportToPickerCamera,
} from '../viewport.js';

test('quantizeCoveredCitiesZoom rounds to the nearest half step', () => {
  assert.equal(quantizeCoveredCitiesZoom(4.2), 4);
  assert.equal(quantizeCoveredCitiesZoom(4.3), 4.5);
});

test('covered-cities cache key round-trips through the quantized bbox', () => {
  const bbox = { south: 1.23, west: 2.34, north: 3.45, east: 4.56 };
  const key = buildCoveredCitiesCacheKey(5.2, bbox);
  const parsed = parseCoveredCitiesCacheKey(key);
  assert.equal(parsed.zoom, 5);
  assert.deepEqual(parsed.bbox, quantizeCoveredCitiesBbox(bbox));
});

test('hasMapViewportChanged ignores jitter inside the source thresholds', () => {
  const prev = {
    zoom: 4,
    bbox: { south: 40, west: 0, north: 50, east: 10 },
  };
  assert.equal(
    hasMapViewportChanged(prev, {
      zoom: 4.1,
      bbox: { south: 40.1, west: 0.1, north: 50.1, east: 10.1 },
    }),
    false
  );
  assert.equal(hasMapViewportChanged(prev, { ...prev, zoom: 4.2 }), true);
});

test('viewportToPickerCamera uses the bbox center', () => {
  assert.deepEqual(
    viewportToPickerCamera({
      zoom: 6,
      bbox: { south: 40, west: 0, north: 50, east: 20 },
    }),
    { center: [10, 45], zoom: 6 }
  );
  assert.deepEqual(EUROPE_MAP_CENTER, [10, 50]);
});

test('map style URLs match the source asset base', () => {
  assert.equal(MAP_STYLE_LIGHT_URL, 'https://assets.zenwayro.com/styles/light_theme.json');
  assert.equal(MAP_STYLE_DARK_URL, 'https://assets.zenwayro.com/styles/dark_theme.json');
  assert.equal(mapStyleUrl(false), MAP_STYLE_LIGHT_URL);
  assert.equal(mapStyleUrl(true), MAP_STYLE_DARK_URL);
});

test('normalizePoisResponse keeps arrays and drops soft errors', () => {
  const places = [{ id: '1', name: 'Louvre' }];
  assert.equal(normalizePoisResponse(places), places);
  assert.deepEqual(normalizePoisResponse({ error: 'boom' }), []);
  assert.deepEqual(normalizePoisResponse(null), []);
});

test('parseCoveredCitiesResponse returns arrays and throws error payloads', () => {
  const cities = [{ id: '1', name: 'Paris' }];
  assert.equal(parseCoveredCitiesResponse(cities), cities);
  assert.throws(() => parseCoveredCitiesResponse({ error: 'boom' }), /boom/);
  assert.deepEqual(parseCoveredCitiesResponse(null), []);
  assert.throws(() => parseCoveredCitiesResponse({ error: 1 }), /Failed to load cities/);
});

test('filterCoveredCitiesBySearch matches name and country', () => {
  const cities = [
    { id: '1', name: 'Paris', country: 'France' },
    { id: '2', name: 'Lyon', country: 'France' },
    { id: '3', name: 'Rome', country: 'Italy' },
  ];
  assert.deepEqual(
    filterCoveredCitiesBySearch(cities, '  lyon ').map((city) => city.id),
    ['2']
  );
  assert.equal(filterCoveredCitiesBySearch(cities, 'france').length, 2);
  assert.equal(filterCoveredCitiesBySearch(cities, '').length, 3);
});

test('resolveCityFromSearchResults prefers cityId, then exact name', () => {
  const cities = [
    { id: 'a', name: 'Paris' },
    { id: 'b', name: 'Paris' },
  ];
  assert.equal(resolveCityFromSearchResults(cities, 'Paris', 'b').id, 'b');
  assert.equal(resolveCityFromSearchResults(cities, 'paris').id, 'a');
  assert.equal(resolveCityFromSearchResults(cities, 'Lyon', 'missing'), null);
  assert.equal(resolveCityFromSearchResults(cities, 'P'), null);
});

test('flattenUniquePlaces keeps the first row for each id', () => {
  const places = flattenUniquePlaces([
    [{ id: '1', name: 'A' }, { id: '2', name: 'B' }],
    [{ id: '1', name: 'A again' }],
  ]);
  assert.deepEqual(places.map((place) => place.name), ['A', 'B']);
});

test('nextPlacesOffset stops on short pages and the page cap', () => {
  assert.equal(nextPlacesOffset([{ id: '1' }], [[{ id: '1' }]]), undefined);
  const full = Array.from({ length: 50 }, (_, index) => ({ id: String(index) }));
  assert.equal(nextPlacesOffset(full, [full]), 50);
  assert.equal(nextPlacesOffset(full, Array.from({ length: 20 }, () => full)), undefined);
});

test('covered cities request uses the quantized viewport and source path', () => {
  const request = coveredCitiesRequest(4.3, {
    south: 35.04,
    west: -12.06,
    north: 72.14,
    east: 45.19,
  });
  assert.equal(request.path, POI_PATHS.citiesCovered);
  assert.equal(request.path, '/api/pois/cities/covered');
  assert.deepEqual(request.params, {
    zoom: '4.5',
    south: '35',
    west: '-12.1',
    north: '72.1',
    east: '45.2',
  });
});

test('city search and places requests match the source query params', () => {
  assert.deepEqual(citySearchRequest('Paris'), {
    path: '/api/pois/cities/search',
    params: { q: 'Paris' },
  });
  assert.equal(citySearchRequest('Paris').path, POI_PATHS.citiesSearch);
  assert.deepEqual(placesRequest('city-1', 'museum,park', 50), {
    path: '/api/pois',
    params: {
      cityId: 'city-1',
      categories: 'museum,park',
      limit: '50',
      offset: '50',
    },
  });
  assert.equal(placesRequest('city-1', 'museum', 0).path, POI_PATHS.list);
});

test('detail, reviews, and saved-id requests match the path modules', () => {
  assert.equal(poiDetailPath('poi/1'), POI_PATHS.detail('poi/1'));
  assert.equal(poiDetailPath('poi/1'), '/api/pois/poi%2F1/detail');
  assert.deepEqual(poiReviewsRequest('poi-1', 10), {
    path: '/api/pois/poi-1/reviews',
    params: { limit: '10', offset: '10', sort: 'newest' },
  });
  assert.equal(poiReviewsRequest('poi-1', 0).path, POI_PATHS.reviews('poi-1'));
  assert.deepEqual(savedPoiIdsRequest('Paris'), {
    path: PLACE_ENGAGEMENT_PATHS.savedIds,
    params: { city: 'Paris' },
  });
  assert.equal(savedPoiIdsRequest('Paris').path, '/api/users/me/saved-poi-ids');
});

test('normalizeReviewsPage and nextReviewsOffset follow the reviews contract', () => {
  const page = normalizeReviewsPage({
    items: [{ stars: 5 }],
    offset: 0,
    total: 2,
  });
  assert.equal(nextReviewsOffset(page), 1);
  assert.equal(
    nextReviewsOffset({ items: [{ stars: 4 }, { stars: 5 }], offset: 0, total: 2 }),
    undefined
  );
  assert.throws(() => normalizeReviewsPage({ error: 'nope' }), /nope/);
});

test('savedPlaceIdSet prefers the city saved-id payload', () => {
  const fromCity = savedPlaceIdSet({ poiIds: ['a'] }, [{ poiId: 'b', isSaved: true }]);
  assert.deepEqual([...fromCity], ['a']);
  const fromBatch = savedPlaceIdSet(undefined, [
    { poiId: 'b', isSaved: true },
    { poiId: 'c', isSaved: false },
  ]);
  assert.deepEqual([...fromBatch], ['b']);
});

test('readExploreCityParams trims city and cityId', () => {
  const params = new URLSearchParams('city=%20Paris%20&cityId=%20abc%20');
  assert.deepEqual(readExploreCityParams(params), { city: 'Paris', cityId: 'abc' });
});
