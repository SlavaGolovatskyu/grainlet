import { POPULAR_TRIP_PATHS } from '../../api/paths/popular-trip.js';
import { ROUTE_PLAN_NEW, ROUTE_QUIZ } from '../../routes.js';

/** Same asset path as HomePageV2 `HOME_HERO_IMAGE`. */
export const HOME_HERO_IMAGE = '/images/home_bg.webp';

/**
 * Home preview matches `page.tsx`: PopularTripsPage sort `likes`
 * (not the omitted-query contract default `newest`), page 1, limit 10.
 */
export const HOME_POPULAR_TRIPS_SORT = 'likes';
export const HOME_POPULAR_TRIPS_PAGE = 1;
export const HOME_POPULAR_TRIPS_LIMIT = 10;

export const HOME_QUIZ_STYLE_TAG_KEYS = [
  'home.quizTagFoodie',
  'home.quizTagCulture',
  'home.quizTagAdventure',
  'home.quizTagRelaxed',
];

export const HOME_PLAN_STYLE_TAG_KEYS = [
  'home.planTagWalking',
  'home.planTagDayByDay',
  'home.planTagLocal',
  'home.planTagShare',
];

export const HOME_LANDING_FEATURES = [
  {
    id: 'plan',
    iconKey: 'plan',
    titleKey: 'home.landingFeaturePlanTitle',
    descKey: 'home.landingFeaturePlanDesc',
    iconClass: 'bg-[#0f1b3d]',
  },
  {
    id: 'explore',
    iconKey: 'explore',
    titleKey: 'home.landingFeatureExploreTitle',
    descKey: 'home.landingFeatureExploreDesc',
    iconClass: 'bg-[#1e3a5f]',
  },
  {
    id: 'share',
    iconKey: 'share',
    titleKey: 'home.landingFeatureShareTitle',
    descKey: 'home.landingFeatureShareDesc',
    iconClass: 'coral-gradient',
  },
];

export const HOME_SOCIAL_STATS = [
  { id: 'travelers', value: '50K+', labelKey: 'home.statTravelers' },
  { id: 'cities', value: '200+', labelKey: 'home.statCities' },
  { id: 'rating', value: '4.9★', labelKey: 'home.statRating' },
];

export const HOME_ICONS = {
  map: {
    shapes: [
      {
        tag: 'path',
        attrs: {
          d: 'M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z',
        },
      },
      { tag: 'path', attrs: { d: 'M15 5.764v15' } },
      { tag: 'path', attrs: { d: 'M9 3.236v15' } },
    ],
  },
  chevronRight: {
    shapes: [{ tag: 'path', attrs: { d: 'm9 18 6-6-6-6' } }],
  },
  arrowRight: {
    shapes: [
      { tag: 'path', attrs: { d: 'M5 12h14' } },
      { tag: 'path', attrs: { d: 'm12 5 7 7-7 7' } },
    ],
  },
  star: {
    shapes: [
      {
        tag: 'path',
        attrs: {
          d: 'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z',
        },
      },
    ],
  },
  share: {
    shapes: [
      { tag: 'circle', attrs: { cx: '18', cy: '5', r: '3' } },
      { tag: 'circle', attrs: { cx: '6', cy: '12', r: '3' } },
      { tag: 'circle', attrs: { cx: '18', cy: '19', r: '3' } },
      { tag: 'path', attrs: { d: 'm8.59 13.51 6.83 3.98' } },
      { tag: 'path', attrs: { d: 'm15.41 6.51-6.82 3.98' } },
    ],
  },
};

const QUERY_PARAMS = {
  sort: HOME_POPULAR_TRIPS_SORT,
  page: String(HOME_POPULAR_TRIPS_PAGE),
  limit: String(HOME_POPULAR_TRIPS_LIMIT),
};

export function homePopularTripsQueryParams() {
  return { ...QUERY_PARAMS };
}

export function homePopularTripsQueryKey() {
  return [
    'popular-trips',
    POPULAR_TRIP_PATHS.root,
    QUERY_PARAMS.sort,
    QUERY_PARAMS.page,
    QUERY_PARAMS.limit,
  ];
}

/** Path + query the home preview GET uses. */
export function homePopularTripsQueryPath() {
  const search = new URLSearchParams();
  search.set('sort', QUERY_PARAMS.sort);
  search.set('page', QUERY_PARAMS.page);
  search.set('limit', QUERY_PARAMS.limit);
  return `${POPULAR_TRIP_PATHS.root}?${search.toString()}`;
}

export function isHomeSessionAuthenticated(status, data) {
  if (status === 'authenticated') return true;
  return Boolean(data && typeof data === 'object' && data.user);
}

export function homePrimaryCta(authenticated) {
  if (authenticated) {
    return { href: ROUTE_PLAN_NEW, labelKey: 'nav.planTrip' };
  }
  return { href: ROUTE_QUIZ, labelKey: 'common.takeTheQuiz' };
}

export function homePlanCard(authenticated) {
  if (authenticated) {
    return {
      titleKey: 'home.planCardTitle',
      subtitleKey: 'home.planCardSubtitle',
      tagKeys: HOME_PLAN_STYLE_TAG_KEYS,
    };
  }
  return {
    titleKey: 'home.quizCardTitle',
    subtitleKey: 'home.quizCardSubtitle',
    tagKeys: HOME_QUIZ_STYLE_TAG_KEYS,
  };
}

/** Prefer API `canonicalPath`, else `/popular-trips/:country/:city/:trip`. */
export function routePopularTrip(trip) {
  if (!trip || typeof trip !== 'object') return '/popular-trips';
  if (typeof trip.canonicalPath === 'string' && trip.canonicalPath) {
    return trip.canonicalPath;
  }
  return `/popular-trips/${trip.countrySlug}/${trip.citySlug}/${trip.tripSlug}`;
}

export function popularTripDaysMessage(durationDays) {
  if (durationDays === 1) {
    return { key: 'popularTrips.daysSingular' };
  }
  return {
    key: 'popularTrips.daysTag',
    variables: { count: String(durationDays) },
  };
}

export function cityTitle(city) {
  if (typeof city !== 'string' || !city) return '';
  return city.charAt(0).toUpperCase() + city.slice(1);
}

export function buildHomePopularTripCard(trip) {
  const heroUrl =
    typeof trip?.cityImageCdnUrl === 'string' ? trip.cityImageCdnUrl.trim() : '';
  return {
    id: trip?.id,
    href: routePopularTrip(trip),
    title: cityTitle(trip?.city),
    heroUrl: heroUrl || undefined,
    days: popularTripDaysMessage(trip?.durationDays),
  };
}

export function readPopularTripItems(payload) {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.items)) {
    return [];
  }
  return payload.items;
}

export function homePopularTripsPhase({ isPending, isError, itemCount }) {
  if (isPending && !itemCount) return 'loading';
  if (isError && !itemCount) return 'error';
  if (!itemCount) return 'empty';
  return 'ready';
}

export function homeFeatureIconName(iconKey) {
  if (iconKey === 'explore') return 'star';
  if (iconKey === 'share') return 'share';
  return 'map';
}

export function homeMessageKeys() {
  return [
    'common.appName',
    'common.takeTheQuiz',
    'common.tryAgain',
    'nav.signIn',
    'nav.signOut',
    'nav.planTrip',
    'nav.popularTrips',
    'home.premiumTagline',
    'home.heroTitlePre',
    'home.heroTitleHighlight',
    'home.heroTitlePost',
    'home.landingHeroSubtitle',
    'home.quizCardTitle',
    'home.quizCardSubtitle',
    'home.planCardTitle',
    'home.planCardSubtitle',
    'home.whyZenwayro',
    'home.seeAll',
    'home.socialProofQuote',
    'home.socialProofAuthor',
    ...HOME_QUIZ_STYLE_TAG_KEYS,
    ...HOME_PLAN_STYLE_TAG_KEYS,
    ...HOME_LANDING_FEATURES.flatMap((feature) => [feature.titleKey, feature.descKey]),
    ...HOME_SOCIAL_STATS.map((stat) => stat.labelKey),
    'popularTrips.loading',
    'popularTrips.loadError',
    'popularTrips.emptyState',
    'popularTrips.daysSingular',
    'popularTrips.daysTag',
  ];
}
