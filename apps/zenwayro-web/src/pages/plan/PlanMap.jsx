import { createEffect, createSignal, onCleanup } from 'grainlet';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';

const ROUTE_SOURCE_ID = 'route';
const ROUTE_LAYER_ID = 'route-line';
const DEFAULT_CENTER = [7.4246, 43.7384];

let protocolRegistered = false;

function ensurePmtilesProtocol() {
  if (protocolRegistered) return;
  const protocol = new Protocol();
  maplibregl.addProtocol('pmtiles', protocol.tile.bind(protocol));
  protocolRegistered = true;
}

function mapAssetsBase() {
  try {
    const value = import.meta.env?.VITE_MAP_ASSETS_BASE;
    if (typeof value === 'string' && value.trim()) return value.replace(/\/$/, '');
  } catch {
    /* import.meta is absent outside Vite */
  }
  return 'https://assets.zenwayro.com';
}

function mapStyleUrl() {
  const dark =
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  return `${mapAssetsBase()}/styles/${dark ? 'dark' : 'light'}_theme.json`;
}

function finitePoint(place) {
  if (!place || typeof place.lng !== 'number' || typeof place.lat !== 'number') return null;
  if (!Number.isFinite(place.lng) || !Number.isFinite(place.lat)) return null;
  return [place.lng, place.lat];
}

function markerElement(index, selected) {
  const el = document.createElement('button');
  el.type = 'button';
  el.textContent = String(index + 1);
  el.setAttribute(
    'class',
    selected
      ? 'flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-indigo-600 text-xs font-bold text-white shadow'
      : 'flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gray-900 text-xs font-bold text-white shadow'
  );
  return el;
}

function syncRoute(map, coordinates) {
  const line = Array.isArray(coordinates)
    ? coordinates.filter((pair) => Array.isArray(pair) && pair.length >= 2 && finitePoint({ lng: pair[0], lat: pair[1] }))
    : [];
  const existing = map.getSource(ROUTE_SOURCE_ID);
  if (line.length < 2) {
    if (map.getLayer(ROUTE_LAYER_ID)) map.removeLayer(ROUTE_LAYER_ID);
    if (existing) map.removeSource(ROUTE_SOURCE_ID);
    return;
  }
  const data = {
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates: line },
  };
  if (existing && typeof existing.setData === 'function') {
    existing.setData(data);
    return;
  }
  if (map.getLayer(ROUTE_LAYER_ID)) map.removeLayer(ROUTE_LAYER_ID);
  if (map.getSource(ROUTE_SOURCE_ID)) map.removeSource(ROUTE_SOURCE_ID);
  map.addSource(ROUTE_SOURCE_ID, { type: 'geojson', data });
  map.addLayer({
    id: ROUTE_LAYER_ID,
    type: 'line',
    source: ROUTE_SOURCE_ID,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': '#3b82f6', 'line-width': 5, 'line-opacity': 0.85 },
  });
}

function fitPlaces(map, places, route) {
  const bounds = new maplibregl.LngLatBounds();
  let extended = false;
  for (const place of places) {
    const point = finitePoint(place);
    if (!point) continue;
    bounds.extend(point);
    extended = true;
  }
  if (Array.isArray(route)) {
    for (const pair of route) {
      if (!Array.isArray(pair) || pair.length < 2) continue;
      const point = finitePoint({ lng: pair[0], lat: pair[1] });
      if (!point) continue;
      bounds.extend(point);
      extended = true;
    }
  }
  if (!extended) return;
  if (places.length < 2 && (!route || route.length < 2)) {
    const point = finitePoint(places[0]);
    if (point) map.flyTo({ center: point, zoom: 14 });
    return;
  }
  map.fitBounds(bounds, { padding: 60, maxZoom: 15 });
}

export function PlanMap(props) {
  let map;
  const markers = [];
  const [host, setHost] = createSignal(null);
  const [ready, setReady] = createSignal(false);
  let fittedKey = '';

  function clearMarkers() {
    while (markers.length) markers.pop().remove();
  }

  createEffect(() => {
    const container = host();
    if (!container) return;

    ensurePmtilesProtocol();
    map = new maplibregl.Map({
      container,
      style: mapStyleUrl(),
      center: DEFAULT_CENTER,
      zoom: 6,
      minZoom: 3,
    });
    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
    map.addControl(new maplibregl.ScaleControl(), 'bottom-left');
    map.on('load', () => setReady(true));
    map.on('error', (event) => {
      console.error('MapLibre error:', event?.error?.message || event);
    });

    onCleanup(() => {
      clearMarkers();
      map?.remove();
      map = null;
      setReady(false);
    });
  });

  createEffect(() => {
    if (!ready() || !map) return;
    const places = props.places?.() ?? [];
    const route = props.route?.() ?? [];
    const selectedId = props.selectedId?.() ?? null;
    clearMarkers();
    places.forEach((place, index) => {
      const point = finitePoint(place);
      if (!point) return;
      const element = markerElement(index, place.id === selectedId);
      element.addEventListener('click', (event) => {
        event.stopPropagation();
        props.onSelect?.(place);
      });
      const marker = new maplibregl.Marker({ element, anchor: 'center' })
        .setLngLat(point)
        .addTo(map);
      markers.push(marker);
    });
    syncRoute(map, route);
    const fitKey = places.map((place) => place?.id ?? '').join(',');
    if (fitKey !== fittedKey) {
      fittedKey = fitKey;
      fitPlaces(map, places, route);
    }
  });

  return (
    <div
      ref={(node) => {
        if (node) setHost(node);
      }}
      class="map-view-raise-bottom-controls absolute inset-0 h-full w-full"
    />
  );
}
