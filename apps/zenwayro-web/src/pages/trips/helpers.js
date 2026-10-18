import { TRIP_PATHS } from '../../api/paths/trip.js';

export const PAGE_SIZE = 12;

export const TRIP_LIST_STATUS = {
  ALL: 'all',
  UPCOMING: 'upcoming',
  PAST: 'past',
  PLANNING: 'planning',
};

export const TRIP_FILTERS = [
  { key: TRIP_LIST_STATUS.ALL, labelKey: 'trips.filterAll' },
  { key: TRIP_LIST_STATUS.UPCOMING, labelKey: 'trips.filterFuture' },
  { key: TRIP_LIST_STATUS.PAST, labelKey: 'trips.filterPast' },
  { key: TRIP_LIST_STATUS.PLANNING, labelKey: 'trips.filterPlanning' },
];

export const STATUS_LABEL_KEYS = {
  [TRIP_LIST_STATUS.UPCOMING]: 'trips.filterFuture',
  [TRIP_LIST_STATUS.PAST]: 'trips.filterPast',
  [TRIP_LIST_STATUS.PLANNING]: 'trips.filterPlanning',
};

export const SCOPE_TABS = [
  { key: 'mine', labelKey: 'trips.scopeMine' },
  { key: 'shared', labelKey: 'trips.scopeSharedShort' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WIDTH_SEGMENT_PATTERN = /\/\d+w\//;

export function tripsListPath(scope) {
  return scope === 'shared' ? TRIP_PATHS.sharedWithMe : TRIP_PATHS.root;
}

export function tripsListParams(page, status) {
  return {
    page: String(page),
    limit: String(PAGE_SIZE),
    status,
  };
}

export function tripListQueryKey(scope, page, status) {
  return [tripsListPath(scope), scope, page, status];
}

export function todayIso(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function dateOnly(value) {
  if (value == null || value === '') return null;
  const text = String(value);
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(text);
  return match ? match[1] : text;
}

export function toTripCard(raw) {
  return {
    id: raw.id,
    city: raw.city,
    durationDays: raw.durationDays,
    startDate: dateOnly(raw.startDate),
    endDate: dateOnly(raw.endDate),
    notes: raw.notes ?? null,
    coverPhoto: raw.coverPhoto ?? null,
    sharedBy: raw.sharedBy,
    createdAt: raw.createdAt ?? null,
  };
}

export function tripStatus(trip, today) {
  if (!trip.startDate || !trip.endDate) return null;
  if (today < trip.startDate) return 'future';
  if (today > trip.endDate) return 'past';
  return 'ongoing';
}

export function tripDashboardStatus(trip, today) {
  if (!trip.startDate || !trip.endDate) return TRIP_LIST_STATUS.PLANNING;
  const status = tripStatus(trip, today);
  if (status === 'past') return TRIP_LIST_STATUS.PAST;
  return TRIP_LIST_STATUS.UPCOMING;
}

export function matchesDashboardFilter(trip, filter, today) {
  if (filter === TRIP_LIST_STATUS.ALL) return true;
  return tripDashboardStatus(trip, today) === filter;
}

export function filterTrips(trips, filter, today) {
  if (filter === TRIP_LIST_STATUS.ALL) return trips;
  return trips.filter((trip) => matchesDashboardFilter(trip, filter, today));
}

export function sortTrips(trips) {
  return trips
    .map((trip, index) => ({ trip, index }))
    .sort((left, right) => {
      const leftTime = Date.parse(left.trip.createdAt ?? '');
      const rightTime = Date.parse(right.trip.createdAt ?? '');
      const leftValid = Number.isFinite(leftTime);
      const rightValid = Number.isFinite(rightTime);
      if (leftValid && rightValid && leftTime !== rightTime) return rightTime - leftTime;
      if (leftValid !== rightValid) return leftValid ? -1 : 1;
      return left.index - right.index;
    })
    .map((entry) => entry.trip);
}

export function prepareTripList(items, filter, today) {
  const cards = (Array.isArray(items) ? items : []).map(toTripCard);
  return sortTrips(filterTrips(cards, filter, today));
}

export function tripsEmptyState({ scope, count, isLoading, hasError }) {
  if (isLoading || hasError || count > 0) {
    return {
      visible: false,
      titleKey: null,
      subtitleKey: null,
      showAction: false,
      actionKey: 'trips.emptyAction',
    };
  }
  const mine = scope === 'mine';
  return {
    visible: true,
    titleKey: mine ? 'trips.noTripsTitle' : 'trips.emptyShared',
    subtitleKey: mine ? 'trips.noTripsSubtitle' : null,
    showAction: mine,
    actionKey: 'trips.emptyAction',
  };
}

export function showAddTripCta({ scope, count, isLoading, hasError }) {
  return !isLoading && !hasError && scope === 'mine' && count > 0;
}

export function showPendingInvitations({ scope, count, isLoading, hasError }) {
  return scope === 'shared' && !isLoading && !hasError && count > 0;
}

function parseDay(value) {
  if (!value || typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

export function formatDashboardTripDates(start, end) {
  if (!start && !end) return '';
  if (!start || !end) {
    const single = start ?? end;
    if (!single) return '';
    const parsed = parseDay(String(single));
    if (!parsed) return String(single);
    return `${MONTHS[parsed.month - 1]} ${parsed.year}`;
  }

  const startDate = parseDay(String(start));
  const endDate = parseDay(String(end));
  if (!startDate || !endDate) return `${start} — ${end}`;

  if (startDate.year === endDate.year && startDate.month === endDate.month) {
    return `${startDate.day}–${endDate.day} ${MONTHS[startDate.month - 1]} ${startDate.year}`;
  }
  if (startDate.year === endDate.year) {
    return `${startDate.day} ${MONTHS[startDate.month - 1]} – ${endDate.day} ${MONTHS[endDate.month - 1]} ${endDate.year}`;
  }
  return `${startDate.day} ${MONTHS[startDate.month - 1]} ${startDate.year} – ${endDate.day} ${MONTHS[endDate.month - 1]} ${endDate.year}`;
}

export function coverPhotoSrc(url) {
  if (!url) return null;
  return String(url).replace(WIDTH_SEGMENT_PATTERN, '/480w/');
}

export function pageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const pages = [];
  const near = new Set([1, 2, current - 1, current, current + 1, total - 1, total]);
  let prev = 0;
  for (const page of [...near].sort((left, right) => left - right)) {
    if (page < 1 || page > total) continue;
    if (page - prev > 1) pages.push(null);
    pages.push(page);
    prev = page;
  }
  return pages;
}

export function tripTitle(city) {
  if (!city) return '';
  return city.charAt(0).toUpperCase() + city.slice(1);
}

export function sharedByLabel(sharedBy) {
  if (!sharedBy) return '';
  return sharedBy.name?.trim() || sharedBy.email || '';
}
