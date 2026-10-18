const WEEKDAY_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MONTH_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const ORDINAL_SUFFIXES = {
  1: 'st',
  2: 'nd',
  3: 'rd',
  21: 'st',
  22: 'nd',
  23: 'rd',
  31: 'st',
};

const LEGACY_SHARE_SLUG_RE = /^[0-9a-f]{12}$/i;

export const PLACE_SUMMARY_SEPARATOR = ' \u2022 ';

export const MAX_DURATION_DAYS = 14;
export const MIN_POIS_PER_DAY = 1;
export const MAX_POIS_PER_DAY = 15;
export const TRENDING_CITIES_LIMIT = 12;
export const CITY_SEARCH_MIN_QUERY_LENGTH = 2;
export const PLACE_SEARCH_MIN_QUERY_LENGTH = 3;

export const MONTH_KEYS = MONTH_LONG;

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

export const PACE_PRESETS = {
  relaxed: { poisPerDay: 3, selectionStrategy: 'nearby' },
  balanced: { poisPerDay: 5, selectionStrategy: 'nearby' },
  intense: { poisPerDay: 7, selectionStrategy: 'popularity' },
};

export const PACE_OPTIONS = [
  {
    id: 'relaxed',
    emoji: '🌅',
    titleKey: 'planGenerate.v2PaceRelaxed',
    descKey: 'planGenerate.v2PaceRelaxedDesc',
    activitiesKey: 'planGenerate.v2PaceRelaxedActivities',
  },
  {
    id: 'balanced',
    emoji: '⚖️',
    titleKey: 'planGenerate.v2PaceBalanced',
    descKey: 'planGenerate.v2PaceBalancedDesc',
    activitiesKey: 'planGenerate.v2PaceBalancedActivities',
  },
  {
    id: 'intense',
    emoji: '⚡',
    titleKey: 'planGenerate.v2PaceIntense',
    descKey: 'planGenerate.v2PaceIntenseDesc',
    activitiesKey: 'planGenerate.v2PaceIntenseActivities',
  },
  {
    id: 'custom',
    emoji: '✏️',
    titleKey: 'planGenerate.v2PaceCustom',
    descKey: 'planGenerate.v2PaceCustomDesc',
  },
];

export const READ_ONLY_EDIT_MESSAGE =
  'You can view this trip, but only the owner can edit it.';

const PENDING_TRIP_STORAGE_KEY = 'pendingTripGeneration';
const PENDING_TRIP_RESUME_STORAGE_KEY = 'pendingTripGenerationResume';
const PENDING_TRIP_RESUME_LOCK_TTL_MS = 30 * 60 * 1000;

function ordinal(day) {
  const suffix = ORDINAL_SUFFIXES[day] ?? 'th';
  return `${day}${suffix}`;
}

export function formatPlanDayHeading(dayNumber, startDate, short = false) {
  if (!startDate) return '';
  const date = new Date(startDate);
  if (Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + dayNumber - 1);
  const weekday = short ? WEEKDAY_SHORT[date.getDay()] : WEEKDAY_LONG[date.getDay()];
  const month = MONTH_LONG[date.getMonth()];
  return `${weekday}, ${month} ${ordinal(date.getDate())}`;
}

export function getPlaceSummary(places) {
  if (!Array.isArray(places)) return '';
  return places.map((place) => place?.name ?? '').join(PLACE_SUMMARY_SEPARATOR);
}

function decodeSegment(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * Shared splat → API key.
 * `/plan/shared/:country/:city/:trip` uses the trip segment.
 * A single 12-hex segment is the legacy share slug (redirect or 404).
 */
export function sharedRedirectPath(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  if (value.startsWith('/')) return value;
  try {
    const url = new URL(value);
    return `${url.pathname}${url.search}`;
  } catch {
    return '';
  }
}

export function parseSharedPlanSlug(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/^\/+|\/+$/g, '');
  if (!trimmed) return null;
  const segments = trimmed.split('/').filter(Boolean).map(decodeSegment);
  if (segments.length === 3) {
    const [countrySlug, citySlug, tripSlug] = segments;
    if (!countrySlug || !citySlug || !tripSlug) return null;
    return {
      kind: 'canonical',
      key: tripSlug,
      countrySlug,
      citySlug,
      tripSlug,
    };
  }
  if (segments.length === 1 && LEGACY_SHARE_SLUG_RE.test(segments[0])) {
    return { kind: 'legacy', key: segments[0] };
  }
  return null;
}

export function formatPlanDuration(minutes) {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes)) return '';
  if (minutes < 60) return `${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hrs} hr`;
  return `${hrs} hr ${mins} min`;
}

export function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function tripDurationDays(startDate, endDate) {
  const from = parseLocalDate(startDate);
  const to = parseLocalDate(endDate);
  if (!from || !to) return null;
  const days = Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
  return days;
}

export function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isMonthSelectable(year, monthIndex, today) {
  const lastDay = new Date(year, monthIndex + 1, 0);
  return lastDay >= startOfLocalDay(today);
}

export function monthDateBounds(year, monthIndex, today) {
  const monthStart = startOfLocalDay(new Date(year, monthIndex, 1));
  const monthEnd = startOfLocalDay(new Date(year, monthIndex + 1, 0));
  const todayStart = startOfLocalDay(today);
  const minSelectable = monthStart < todayStart ? todayStart : monthStart;
  return { monthStart, monthEnd, minSelectable };
}

export function resolvePace(preset, customPoisPerDay, customStrategy) {
  if (!preset) return null;
  if (preset !== 'custom') return PACE_PRESETS[preset] ?? null;
  const parsed = Number.parseInt(customPoisPerDay, 10);
  if (!Number.isInteger(parsed) || parsed < MIN_POIS_PER_DAY || parsed > MAX_POIS_PER_DAY) {
    return null;
  }
  if (customStrategy !== 'nearby' && customStrategy !== 'popularity') return null;
  return { poisPerDay: parsed, selectionStrategy: customStrategy };
}

export function buildGeneratePayload({
  city,
  cityId,
  startDate,
  endDate,
  poisPerDay,
  selectionStrategy,
}) {
  const payload = {
    city,
    durationDays: tripDurationDays(startDate, endDate) ?? undefined,
    startDate,
    endDate,
    poisPerDay,
    creationMode: 'automatic',
    selectionStrategy,
  };
  if (cityId) payload.cityId = cityId;
  return payload;
}

function isRouteCosting(value) {
  return value === 'pedestrian' || value === 'auto';
}

function mapPlace(place) {
  if (!place || typeof place !== 'object' || place.id == null) return null;
  return place;
}

function mapDay(day) {
  const places = Array.isArray(day.places)
    ? day.places.map(mapPlace).filter(Boolean)
    : [];
  return {
    day: day.dayNumber,
    places,
    routeGeometry: Array.isArray(day.routeGeometry) ? day.routeGeometry : undefined,
    distanceKm: typeof day.distanceKm === 'number' ? day.distanceKm : undefined,
    durationMin: typeof day.durationMin === 'number' ? day.durationMin : undefined,
    routeCosting: isRouteCosting(day.routeCosting) ? day.routeCosting : undefined,
    routeOptimizeOrder: day.routeOptimizeOrder === true,
  };
}

export function toTripPlan(data) {
  if (!data || typeof data !== 'object') return null;
  const days = Array.isArray(data.days)
    ? data.days.filter((day) => day && typeof day.dayNumber === 'number')
    : [];
  return {
    id: data.id,
    city: typeof data.city === 'string' ? data.city : '',
    ...(typeof data.cityId === 'string' && data.cityId ? { cityId: data.cityId } : {}),
    durationDays: typeof data.durationDays === 'number' ? data.durationDays : 0,
    startDate: typeof data.startDate === 'string' ? data.startDate : undefined,
    isPublic: data.isPublic === true,
    shareSlug: data.shareSlug,
    shareUrl: data.shareUrl,
    canonicalPath: typeof data.canonicalPath === 'string' ? data.canonicalPath : undefined,
    publishedCanonicalPath:
      typeof data.publishedCanonicalPath === 'string' ? data.publishedCanonicalPath : undefined,
    canEdit: data.canEdit === true,
    collaborators: Array.isArray(data.collaborators) ? data.collaborators : [],
    days: [...days].sort((a, b) => a.dayNumber - b.dayNumber).map(mapDay),
  };
}

export function canEditTrip(plan, sessionStatus) {
  return plan?.canEdit === true && sessionStatus === 'authenticated';
}

export function moveItem(list, index, direction) {
  if (!Array.isArray(list)) return null;
  const next = index + direction;
  if (index < 0 || next < 0 || index >= list.length || next >= list.length) return null;
  const copy = list.slice();
  const [item] = copy.splice(index, 1);
  copy.splice(next, 0, item);
  return copy;
}

export function parseCityList(data) {
  if (Array.isArray(data)) {
    return data.filter((city) => city && typeof city.name === 'string' && city.id != null);
  }
  if (data && typeof data === 'object' && typeof data.error === 'string') {
    throw new Error(data.error);
  }
  return [];
}

export function parsePoiList(data) {
  if (!Array.isArray(data)) return [];
  return data.filter((place) => place && place.id != null && typeof place.name === 'string');
}

export function emptyPlanDocument() {
  return {
    id: '',
    city: '',
    durationDays: 0,
    canEdit: false,
    days: [],
    ready: false,
  };
}

function storageGet(key) {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function storageSet(key, value) {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    /* storage full or unavailable */
  }
}

function storageRemove(key) {
  try {
    globalThis.localStorage?.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function savePendingTripGeneration(payload) {
  storageSet(PENDING_TRIP_STORAGE_KEY, JSON.stringify(payload));
}

export function loadPendingTripGeneration() {
  const raw = storageGet(PENDING_TRIP_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.city !== 'string' || !parsed.city) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingTripGeneration() {
  storageRemove(PENDING_TRIP_STORAGE_KEY);
}

function loadPendingResume() {
  const raw = storageGet(PENDING_TRIP_RESUME_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.payload || typeof parsed.startedAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function beginPendingTripGenerationResume(now = Date.now()) {
  const pending = loadPendingTripGeneration();
  if (!pending) return null;
  const active = loadPendingResume();
  if (active && now - active.startedAt < PENDING_TRIP_RESUME_LOCK_TTL_MS) return null;
  storageSet(
    PENDING_TRIP_RESUME_STORAGE_KEY,
    JSON.stringify({ payload: pending, startedAt: now })
  );
  return pending;
}

export function completePendingTripGenerationResume() {
  clearPendingTripGeneration();
  storageRemove(PENDING_TRIP_RESUME_STORAGE_KEY);
}

export function failPendingTripGenerationResume() {
  storageRemove(PENDING_TRIP_RESUME_STORAGE_KEY);
}
