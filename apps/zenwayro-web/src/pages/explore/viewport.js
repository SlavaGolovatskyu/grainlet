/** Bucket zoom so nearby levels share one covered-cities request. */
export function quantizeCoveredCitiesZoom(zoom) {
  return Math.round(Number(zoom) * 2) / 2;
}

/** Bucket bbox edges (~11 km at the equator) while the map is panned. */
export function quantizeCoveredCitiesBbox(bbox) {
  const edge = (value) => Math.round(Number(value) * 10) / 10;
  return {
    south: edge(bbox.south),
    west: edge(bbox.west),
    north: edge(bbox.north),
    east: edge(bbox.east),
  };
}

/** Stable query-key segment. Changes only when the quantized viewport changes. */
export function buildCoveredCitiesCacheKey(zoom, bbox) {
  const quantizedZoom = quantizeCoveredCitiesZoom(zoom);
  const quantizedBbox = quantizeCoveredCitiesBbox(bbox);
  return `${quantizedZoom}|${quantizedBbox.south}|${quantizedBbox.west}|${quantizedBbox.north}|${quantizedBbox.east}`;
}

export function parseCoveredCitiesCacheKey(cacheKey) {
  const [zoom, south, west, north, east] = String(cacheKey).split('|').map(Number);
  return { zoom, bbox: { south, west, north, east } };
}

export const EXPLORE_VIEWPORT_ZOOM_THRESHOLD = 0.15;
export const EXPLORE_VIEWPORT_BBOX_THRESHOLD = 0.25;

export function hasMapViewportChanged(prev, next) {
  if (!prev || !next) return true;
  const zoomChanged = Math.abs(prev.zoom - next.zoom) >= EXPLORE_VIEWPORT_ZOOM_THRESHOLD;
  const bboxChanged =
    Math.abs(prev.bbox.south - next.bbox.south) > EXPLORE_VIEWPORT_BBOX_THRESHOLD ||
    Math.abs(prev.bbox.north - next.bbox.north) > EXPLORE_VIEWPORT_BBOX_THRESHOLD ||
    Math.abs(prev.bbox.west - next.bbox.west) > EXPLORE_VIEWPORT_BBOX_THRESHOLD ||
    Math.abs(prev.bbox.east - next.bbox.east) > EXPLORE_VIEWPORT_BBOX_THRESHOLD;
  return zoomChanged || bboxChanged;
}

/** Camera restored when the user leaves a city and returns to the city map. */
export function viewportToPickerCamera(viewport) {
  return {
    center: [
      (viewport.bbox.west + viewport.bbox.east) / 2,
      (viewport.bbox.south + viewport.bbox.north) / 2,
    ],
    zoom: viewport.zoom,
  };
}

export const EUROPE_MAP_CENTER = [10, 50];
export const EUROPE_MAP_ZOOM = 4;
export const CITY_MAP_ZOOM = 13;
export const PLACE_FOCUS_ZOOM = 15;
export const MAP_MIN_ZOOM = 3;
export const FIT_BOUNDS_PADDING = 60;
export const FIT_BOUNDS_MAX_ZOOM = 15;

/** Same asset base as the source app (`NEXT_PUBLIC_MAP_ASSETS_BASE`). */
export const MAP_ASSETS_BASE = 'https://assets.zenwayro.com';
export const MAP_STYLE_LIGHT_URL = `${MAP_ASSETS_BASE}/styles/light_theme.json`;
export const MAP_STYLE_DARK_URL = `${MAP_ASSETS_BASE}/styles/dark_theme.json`;

export function mapStyleUrl(isDark) {
  return isDark ? MAP_STYLE_DARK_URL : MAP_STYLE_LIGHT_URL;
}
