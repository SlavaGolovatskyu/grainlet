const UUID_PARAM_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const LEGACY_SHARE_SLUG_RE = /^[0-9a-f]{12}$/i;

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export const POPULAR_TRIPS_PAGE_SIZE = 12;
export const POPULAR_TRIPS_FIRST_PAGE = 1;
export const POPULAR_TRIPS_DEFAULT_SORT = 'likes';
export const POPULAR_TRIP_SORT_VALUES = ['rating', 'likes', 'newest', 'oldest'];
/** Align with Next.js PopularTripsPage.constants (TanStack stale/gc). */
export const POPULAR_TRIPS_STALE_MS = 5 * 60 * 1000;
export const POPULAR_TRIPS_GC_MS = 30 * 60 * 1000;
export const CITY_HUB_PAGE_SIZE = 50;
export const MAX_COPY_TRIP_DAYS = 14;
export const COUNTRY_LINK_LIMIT = 24;

export const DURATION_CHIPS = ['all', '1-3', '4-5', '1-week', '2-weeks'];
export const RATING_CHIPS = ['top', '4.5', '4.0', 'new'];

const DURATION_RANGES = {
  all: {},
  '1-3': { minDurationDays: 1, maxDurationDays: 3 },
  '4-5': { minDurationDays: 4, maxDurationDays: 5 },
  '1-week': { minDurationDays: 6, maxDurationDays: 7 },
  '2-weeks': { minDurationDays: 8 },
};

const RATING_MIN = {
  top: undefined,
  '4.5': 4.5,
  '4.0': 4.0,
  new: undefined,
};

const RATING_SORT = {
  top: 'rating',
  '4.5': 'rating',
  '4.0': 'rating',
  new: 'newest',
};

export function isUuidParam(value) {
  return typeof value === 'string' && UUID_PARAM_RE.test(value);
}

export function isLegacyShareSlugParam(value) {
  return typeof value === 'string' && LEGACY_SHARE_SLUG_RE.test(value);
}

export function routePopularTripsCountry(countrySlug) {
  return `/popular-trips/${countrySlug}`;
}

export function routePopularTripsCity(countrySlug, citySlug) {
  return `/popular-trips/${countrySlug}/${citySlug}`;
}

export function routePopularTrip(trip) {
  if (!trip || typeof trip !== 'object') return '/popular-trips';
  return (
    trip.canonicalPath ??
    `/popular-trips/${trip.countrySlug}/${trip.citySlug}/${trip.tripSlug}`
  );
}

export function popularTripSegments(splat) {
  if (splat == null) return [];
  return String(splat)
    .split('/')
    .filter((part) => part.length > 0);
}

/**
 * Same branch order as the Next `[...segments]` resolver:
 * 1 segment + UUID → redirect target (detail lookup by id)
 * 1 other segment → country hub
 * 2 segments → city hub
 * 3 segments → trip detail keyed by tripSlug
 * anything else → not found
 *
 * Segments are used as the router already decoded them. Do not decode again.
 */
export function parsePopularTripSplat(splat) {
  const segments = popularTripSegments(splat);
  if (segments.length === 1) {
    const segment = segments[0];
    if (isUuidParam(segment)) {
      return { kind: 'uuid', id: segment, segments };
    }
    return { kind: 'country', countrySlug: segment, segments };
  }
  if (segments.length === 2) {
    return {
      kind: 'city',
      countrySlug: segments[0],
      citySlug: segments[1],
      segments,
    };
  }
  if (segments.length === 3) {
    return {
      kind: 'trip',
      countrySlug: segments[0],
      citySlug: segments[1],
      tripSlug: segments[2],
      segments,
    };
  }
  return { kind: 'notFound', segments };
}

export function popularTripTitle(city) {
  const value = String(city ?? '');
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function cityLabelFromSlug(citySlug) {
  return String(citySlug ?? '').replace(/-/g, ' ');
}

export function countryLabelFromSlug(countrySlug, cities) {
  const slug = String(countrySlug ?? '');
  const hasCityName = Array.isArray(cities) && cities.some((entry) => entry?.city);
  if (!hasCityName) return slug;
  return popularTripTitle(slug);
}

export function popularTripHeroSrc(url, width = '768w') {
  const trimmed = typeof url === 'string' ? url.trim() : '';
  if (!trimmed) return '';
  return trimmed.replace(/\/\d+w\//, `/${width}/`);
}

export function matchesPopularTripSearch(trip, query) {
  const normalized = String(query ?? '').trim().toLowerCase();
  if (!normalized) return true;
  const city = String(trip?.city ?? '').toLowerCase();
  const country = String(trip?.country ?? '').toLowerCase();
  return city.includes(normalized) || country.includes(normalized);
}

export function communityQueryFilters(filterType, durationChip, ratingChip) {
  if (filterType === 'duration') {
    return { ...(DURATION_RANGES[durationChip] ?? {}) };
  }
  const minRating = RATING_MIN[ratingChip];
  return minRating == null ? {} : { minRating };
}

export function sortForCommunityChip(filterType, ratingChip) {
  if (filterType === 'rating') return RATING_SORT[ratingChip] ?? 'rating';
  return POPULAR_TRIPS_DEFAULT_SORT;
}

export function listPopularTripsParams({
  sort = POPULAR_TRIPS_DEFAULT_SORT,
  page = POPULAR_TRIPS_FIRST_PAGE,
  limit = POPULAR_TRIPS_PAGE_SIZE,
  countrySlug,
  citySlug,
  cityId,
  minDurationDays,
  maxDurationDays,
  minRating,
} = {}) {
  const params = {
    sort,
    page: String(page),
    limit: String(limit),
  };
  if (countrySlug) params.countrySlug = countrySlug;
  if (citySlug) params.citySlug = citySlug;
  if (cityId) params.cityId = cityId;
  if (minDurationDays != null) params.minDurationDays = String(minDurationDays);
  if (maxDurationDays != null) params.maxDurationDays = String(maxDurationDays);
  if (minRating != null) params.minRating = String(minRating);
  return params;
}

export function uniqueCityLinks(items) {
  const seen = new Set();
  const links = [];
  for (const trip of items ?? []) {
    if (!trip?.countrySlug || !trip?.citySlug) continue;
    const key = `${trip.countrySlug}/${trip.citySlug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({
      key,
      city: trip.city,
      countrySlug: trip.countrySlug,
      citySlug: trip.citySlug,
      href: routePopularTripsCity(trip.countrySlug, trip.citySlug),
    });
  }
  return links;
}

export function popularTripsPageNumbers(current, total) {
  const page = Number(current);
  const pageCount = Number(total);
  if (!Number.isFinite(page) || !Number.isFinite(pageCount) || pageCount <= 1) return [];
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => ({
      key: `page-${index + 1}`,
      page: index + 1,
    }));
  }

  const near = [1, 2, page - 1, page, page + 1, pageCount - 1, pageCount]
    .filter((value, index, all) => value >= 1 && value <= pageCount && all.indexOf(value) === index)
    .sort((a, b) => a - b);

  const pages = [];
  let prev = 0;
  for (const value of near) {
    if (value - prev > 1) pages.push({ key: `gap-${value}`, gap: true });
    pages.push({ key: `page-${value}`, page: value });
    prev = value;
  }
  return pages;
}

export function sortedTripDays(trip) {
  const days = Array.isArray(trip?.days) ? trip.days : [];
  return [...days].sort((a, b) => (a?.dayNumber ?? 0) - (b?.dayNumber ?? 0));
}

export function formatPlanDuration(minutes) {
  const value = Number(minutes);
  if (!Number.isFinite(value)) return '';
  if (value < 60) return `${value} min`;
  const hrs = Math.floor(value / 60);
  const mins = value % 60;
  if (mins === 0) return `${hrs} hr`;
  return `${hrs} hr ${mins} min`;
}

export function inclusiveTripDays(startDate, endDate) {
  if (!YMD_RE.test(String(startDate ?? '')) || !YMD_RE.test(String(endDate ?? ''))) return null;
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return Math.round((end - start) / 86400000) + 1;
}

export function todayYmd(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function copyDatesAreValid(startDate, endDate, maxDays = MAX_COPY_TRIP_DAYS, today = todayYmd()) {
  const days = inclusiveTripDays(startDate, endDate);
  if (days == null || days < 1 || days > maxDays) return false;
  return String(startDate) >= String(today) && String(endDate) >= String(today);
}

export function asArray(value) {
  return Array.isArray(value) ? value : [];
}
