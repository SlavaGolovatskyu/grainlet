import { createEffect, createSignal, onCleanup, untrack } from 'grainlet';
import maplibre from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { finiteCoord } from './normalize.js';
import {
  CITY_MAP_ZOOM,
  EUROPE_MAP_CENTER,
  EUROPE_MAP_ZOOM,
  FIT_BOUNDS_MAX_ZOOM,
  FIT_BOUNDS_PADDING,
  MAP_MIN_ZOOM,
  PLACE_FOCUS_ZOOM,
  mapStyleUrl,
} from './viewport.js';

const CATEGORY_COLORS = {
  museum: '#8B5CF6',
  park: '#22C55E',
  restaurant: '#F97316',
  cafe: '#A16207',
  bar: '#EC4899',
  gallery: '#6366F1',
  attraction: '#0EA5E9',
  historic: '#B45309',
  viewpoint: '#0EA5E9',
  nightlife: '#D946EF',
  shopping: '#14B8A6',
  beach: '#FBBF24',
  religious: '#6B7280',
};

const CATEGORY_ICONS = {
  museum: '🏛️',
  park: '🌳',
  restaurant: '🍴',
  cafe: '☕',
  bar: '🍸',
  gallery: '🎨',
  attraction: '⭐',
  historic: '🏰',
  viewpoint: '👁️',
  nightlife: '🎶',
  shopping: '🛍️',
  beach: '🏖️',
  religious: '⛪',
};

const MARKER_SIZE = 28;
const CITY_PILL = {
  paddingX: 10,
  paddingY: 6,
  gap: 4,
  fontSize: 12,
  shadow: '0 4px 14px rgba(0, 0, 0, 0.18)',
  defaultBackground: '#ffffff',
  defaultText: '#0f1b3d',
  selectedText: '#ffffff',
  coralGradient: 'linear-gradient(135deg, #ff6b4a 0%, #ff8a70 100%)',
};

const PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;

let pmtilesRegistered = false;

function ensurePmtilesProtocol() {
  if (pmtilesRegistered || typeof maplibre.addProtocol !== 'function') return;
  const protocol = new Protocol();
  maplibre.addProtocol('pmtiles', protocol.tile.bind(protocol));
  pmtilesRegistered = true;
}

function applyCityPillState(pill, isSelected) {
  pill.style.transform = isSelected ? 'scale(1.12)' : 'scale(1)';
  pill.style.transformOrigin = 'center center';
  if (isSelected) {
    pill.style.background = CITY_PILL.coralGradient;
    pill.style.color = CITY_PILL.selectedText;
    pill.style.boxShadow = '0 6px 18px rgba(255, 107, 74, 0.45)';
    return;
  }
  pill.style.background = CITY_PILL.defaultBackground;
  pill.style.color = CITY_PILL.defaultText;
  pill.style.boxShadow = CITY_PILL.shadow;
}

function buildCityPill(label, isSelected) {
  const root = document.createElement('div');
  root.style.cssText = 'cursor:pointer;line-height:0;';
  const pill = document.createElement('div');
  pill.setAttribute('role', 'button');
  pill.setAttribute('aria-label', label);
  pill.style.cssText = `
    display:inline-flex;align-items:center;gap:${CITY_PILL.gap}px;
    padding:${CITY_PILL.paddingY}px ${CITY_PILL.paddingX}px;border-radius:9999px;
    font-size:${CITY_PILL.fontSize}px;font-weight:700;line-height:1;white-space:nowrap;
    transition:transform .15s ease,background .15s ease,color .15s ease,box-shadow .15s ease;
  `;
  const icon = document.createElement('span');
  icon.style.cssText = 'display:inline-flex;flex-shrink:0;align-items:center;';
  icon.innerHTML = PIN_SVG;
  const text = document.createElement('span');
  text.setAttribute('data-city-label', 'true');
  text.textContent = label;
  pill.append(icon, text);
  applyCityPillState(pill, isSelected);
  root.append(pill);
  return { root, pill };
}

function buildPlaceMarker(place) {
  const color = CATEGORY_COLORS[place.category] ?? '#6366F1';
  const el = document.createElement('div');
  el.style.cssText = `
    width:${MARKER_SIZE}px;height:${MARKER_SIZE}px;border-radius:50%;
    background:${color};color:white;font-weight:700;font-size:15px;
    display:flex;align-items:center;justify-content:center;
    border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3);
    cursor:pointer;line-height:1;position:relative;overflow:visible;
  `;
  el.textContent = CATEGORY_ICONS[place.category] ?? String(place.category || '?').charAt(0).toUpperCase();
  const badge = document.createElement('div');
  badge.textContent = '♥';
  badge.style.cssText = `
    display:none;position:absolute;top:-8px;right:-8px;width:18px;height:18px;
    border-radius:50%;background:#f43f5e;border:1.5px solid white;color:white;
    font-size:13px;align-items:center;justify-content:center;line-height:1;pointer-events:none;
  `;
  el.append(badge);
  return { el, badge };
}

export function ExploreMap(props) {
  let map;
  let resizeObserver;
  const markers = new Map();
  const pills = new Map();
  const badges = new Map();
  const popups = new Map();
  const placeById = new Map();
  let activeVariant = null;
  let lastFlownId = null;
  let activePopup = null;
  const [host, setHost] = createSignal(null);
  const [loaded, setLoaded] = createSignal(false);

  function clearMarkers() {
    for (const marker of markers.values()) marker.remove();
    markers.clear();
    pills.clear();
    badges.clear();
    for (const popup of popups.values()) popup.remove();
    popups.clear();
    placeById.clear();
    activePopup = null;
  }

  function emitViewport() {
    if (!map || typeof props.onViewportChange !== 'function') return;
    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    props.onViewportChange({
      zoom: map.getZoom(),
      bbox: {
        south: sw.lat,
        west: sw.lng,
        north: ne.lat,
        east: ne.lng,
      },
    });
  }

  // Init from a host signal so MapLibre outlives parent-driven re-renders.
  // Ignore null refs (Grainlet re-applies a new ref fn each patch); only tear
  // down when this effect is disposed on unmount.
  createEffect(() => {
    const container = host();
    if (!container) return;

    ensurePmtilesProtocol();
    const isDark = document.documentElement.classList.contains('dark');
    const center = untrack(() => props.center?.() ?? EUROPE_MAP_CENTER);
    const zoom = untrack(() => props.zoom?.() ?? EUROPE_MAP_ZOOM);
    map = new maplibre.Map({
      container,
      style: mapStyleUrl(isDark),
      center,
      zoom,
      minZoom: MAP_MIN_ZOOM,
    });
    map.addControl(new maplibre.NavigationControl(), 'bottom-right');
    map.addControl(new maplibre.ScaleControl(), 'bottom-left');
    map.on('load', () => {
      setLoaded(true);
      emitViewport();
    });
    map.on('moveend', emitViewport);
    map.on('click', () => {
      if (activePopup) {
        activePopup.remove();
        activePopup = null;
      }
      props.onMapClick?.();
    });
    map.on('error', (event) => {
      const message = event?.error?.message || event;
      console.error('MapLibre error:', message);
    });
    resizeObserver = new ResizeObserver(() => map?.resize());
    resizeObserver.observe(container);

    onCleanup(() => {
      resizeObserver?.disconnect();
      clearMarkers();
      map?.remove();
      map = null;
      setLoaded(false);
    });
  });

  createEffect(() => {
    const ready = loaded();
    const sync = props.syncCamera?.() ?? true;
    const center = props.center?.();
    const zoom = props.zoom?.() ?? CITY_MAP_ZOOM;
    if (!map || !ready || !sync || !center || center.length < 2) return;
    if (!Number.isFinite(Number(center[0])) || !Number.isFinite(Number(center[1]))) return;
    map.flyTo({ center, zoom });
  });

  createEffect(() => {
    const ready = loaded();
    const places = props.places?.() ?? [];
    const variant = props.variant?.() ?? 'default';
    const savedIds = props.savedIds?.();
    const selectedId = props.selectedId?.() ?? null;
    if (!map || !ready) return;

    if (activeVariant !== variant) {
      clearMarkers();
      activeVariant = variant;
      lastFlownId = null;
    }

    const nextIds = new Set();
    const isCityPill = variant === 'city-pill';

    for (const place of places) {
      const coord = finiteCoord(place);
      if (!coord) continue;
      nextIds.add(place.id);
      placeById.set(place.id, place);
      const existing = markers.get(place.id);
      if (existing) {
        existing.setLngLat(coord);
        if (isCityPill) {
          const label = pills.get(place.id)?.querySelector('[data-city-label]');
          if (label && label.textContent !== place.name) label.textContent = place.name;
        }
        continue;
      }

      let element;
      if (isCityPill) {
        const built = buildCityPill(place.name, selectedId === place.id);
        element = built.root;
        pills.set(place.id, built.pill);
      } else {
        const built = buildPlaceMarker(place);
        element = built.el;
        badges.set(place.id, built.badge);
        const popup = new maplibre.Popup({
          offset: MARKER_SIZE / 2 + 4,
          closeButton: false,
          closeOnClick: false,
        }).setText(place.name);
        element.addEventListener('mouseenter', () => {
          const latest = placeById.get(place.id);
          const latestCoord = finiteCoord(latest);
          if (!latestCoord || !map) return;
          popup.setLngLat(latestCoord).addTo(map);
        });
        element.addEventListener('mouseleave', () => {
          if (props.selectedId?.() === place.id) return;
          popup.remove();
        });
        popups.set(place.id, popup);
      }

      element.addEventListener('click', (event) => {
        event.stopPropagation();
        const latest = placeById.get(place.id);
        if (latest) props.onPlaceClick?.(latest);
      });

      const marker = new maplibre.Marker({ element, anchor: 'center' })
        .setLngLat(coord)
        .addTo(map);
      markers.set(place.id, marker);
    }

    for (const [placeId, marker] of markers) {
      if (nextIds.has(placeId)) continue;
      marker.remove();
      markers.delete(placeId);
      pills.delete(placeId);
      badges.delete(placeId);
      popups.get(placeId)?.remove();
      popups.delete(placeId);
      placeById.delete(placeId);
    }

    for (const [placeId, badge] of badges) {
      badge.style.display = savedIds?.has(placeId) ? 'flex' : 'none';
    }

    for (const [placeId, pill] of pills) {
      applyCityPillState(pill, placeId === selectedId);
    }

    if (activePopup) {
      activePopup.remove();
      activePopup = null;
    }
    if (!isCityPill && selectedId) {
      const popup = popups.get(selectedId);
      const place = placeById.get(selectedId);
      const coord = finiteCoord(place);
      if (popup && coord) {
        popup.setLngLat(coord).addTo(map);
        activePopup = popup;
      }
      if (coord && selectedId !== lastFlownId) {
        lastFlownId = selectedId;
        map.flyTo({ center: coord, zoom: PLACE_FOCUS_ZOOM });
      }
    } else if (!selectedId) {
      lastFlownId = null;
    }
  });

  createEffect(() => {
    const ready = loaded();
    const places = props.places?.() ?? [];
    const fit = props.fitBounds?.() ?? false;
    if (!map || !ready || !fit || places.length === 0) return;
    const bounds = new maplibre.LngLatBounds();
    let extended = false;
    for (const place of places) {
      const coord = finiteCoord(place);
      if (!coord) continue;
      bounds.extend(coord);
      extended = true;
    }
    if (!extended) return;
    map.fitBounds(bounds, { padding: FIT_BOUNDS_PADDING, maxZoom: FIT_BOUNDS_MAX_ZOOM });
  });

  return (
    <div class="absolute inset-0" data-explore-map>
      <div
        ref={(node) => {
          if (node) setHost(node);
        }}
        class="map-view-raise-bottom-controls absolute inset-0 h-full w-full"
      />
    </div>
  );
}
