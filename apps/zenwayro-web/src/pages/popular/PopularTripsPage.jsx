import { createSignal, For, Show } from 'grainlet';
import { useI18n } from 'grainlet/i18n';
import { useQuery } from 'grainlet/query';
import { Link } from 'grainlet/route';
import { apiClient, POPULAR_TRIP_PATHS } from '../../api.js';
import { translateApp } from '../../i18n.js';
import { ROUTE_POPULAR_TRIPS_BROWSE_COUNTRIES } from '../../routes.js';
import {
  COUNTRY_LINK_LIMIT,
  DURATION_CHIPS,
  POPULAR_TRIPS_DEFAULT_SORT,
  POPULAR_TRIPS_FIRST_PAGE,
  POPULAR_TRIP_SORT_VALUES,
  RATING_CHIPS,
  asArray,
  communityQueryFilters,
  listPopularTripsParams,
  matchesPopularTripSearch,
  popularTripHeroSrc,
  popularTripTitle,
  popularTripsPageNumbers,
  routePopularTrip,
  routePopularTripsCountry,
  sortForCommunityChip,
  uniqueCityLinks,
} from './popular-routes.js';

const CARD_GRID_CLASS =
  'grid w-full grid-cols-[repeat(auto-fill,minmax(min(100%,9.75rem),1fr))] gap-3 md:grid-cols-[repeat(auto-fill,minmax(min(100%,12rem),1fr))] md:gap-4 lg:grid-cols-[repeat(auto-fill,minmax(min(100%,14rem),1fr))] lg:gap-5';

const DURATION_LABEL_KEYS = {
  all: 'popularTrips.communityDurationAll',
  '1-3': 'popularTrips.communityDuration1to3',
  '4-5': 'popularTrips.communityDuration4to5',
  '1-week': 'popularTrips.communityDuration1Week',
  '2-weeks': 'popularTrips.communityDuration2Weeks',
};

const RATING_LABEL_KEYS = {
  top: 'popularTrips.communityRatingTop',
  '4.5': 'popularTrips.communityRating45',
  '4.0': 'popularTrips.communityRating40',
  new: 'popularTrips.communityRatingNew',
};

const SORT_LABEL_KEYS = {
  likes: 'popularTrips.sortMostLiked',
  newest: 'popularTrips.sortNewest',
  oldest: 'popularTrips.sortOldest',
  rating: 'popularTrips.sortTopRated',
};

function authorFirstName(trip, anonymous) {
  const name = trip.authorName?.trim();
  if (!name) return anonymous;
  return name.split(/\s+/)[0];
}

export function PopularTripsPage() {
  const i18n = useI18n();
  const t = (key, variables) => translateApp(i18n, key, variables);
  const [search, setSearch] = createSignal('');
  const [filterType, setFilterType] = createSignal('duration');
  const [durationChip, setDurationChip] = createSignal('all');
  const [ratingChip, setRatingChip] = createSignal('top');
  const [sort, setSort] = createSignal(POPULAR_TRIPS_DEFAULT_SORT);
  const [page, setPage] = createSignal(POPULAR_TRIPS_FIRST_PAGE);

  const countriesQuery = useQuery(() => ({
    queryKey: ['popular-trips', 'directory-countries'],
    queryFn: ({ signal }) =>
      apiClient.get(POPULAR_TRIP_PATHS.directoryCountries, { signal }),
  }));

  const tripsQuery = useQuery(() => {
    const filters = communityQueryFilters(filterType(), durationChip(), ratingChip());
    const params = listPopularTripsParams({
      sort: sort(),
      page: page(),
      ...filters,
    });
    return {
      queryKey: ['popular-trips', params],
      queryFn: ({ signal }) =>
        apiClient.get(POPULAR_TRIP_PATHS.root, { params, signal }),
    };
  });

  const items = () => asArray(tripsQuery.data()?.items);
  const displayed = () => items().filter((trip) => matchesPopularTripSearch(trip, search()));
  const countries = () => asArray(countriesQuery.data());
  const cityLinks = () => uniqueCityLinks(items());
  const totalPages = () => Number(tripsQuery.data()?.totalPages ?? 0);
  const pageItems = () => popularTripsPageNumbers(page(), totalPages());
  const loading = () => tripsQuery.data() == null && !tripsQuery.isError();
  const failed = () => tripsQuery.data() == null && tripsQuery.isError();

  function resetPage() {
    setPage(POPULAR_TRIPS_FIRST_PAGE);
  }

  function chooseFilterType(next) {
    if (filterType() === next) return;
    setFilterType(next);
    if (next === 'duration') {
      setDurationChip('all');
      setSort(POPULAR_TRIPS_DEFAULT_SORT);
    } else {
      setRatingChip('top');
      setSort(sortForCommunityChip('rating', 'top'));
    }
    resetPage();
  }

  function chooseChip(chipId) {
    if (filterType() === 'duration') {
      if (durationChip() === chipId) return;
      setDurationChip(chipId);
      setSort(POPULAR_TRIPS_DEFAULT_SORT);
    } else {
      if (ratingChip() === chipId) return;
      setRatingChip(chipId);
      setSort(sortForCommunityChip('rating', chipId));
    }
    resetPage();
  }

  function chooseSort(event) {
    const next = event.currentTarget.value;
    if (!POPULAR_TRIP_SORT_VALUES.includes(next)) return;
    setSort(next);
    resetPage();
  }

  const activeChip = () => (filterType() === 'duration' ? durationChip() : ratingChip());
  const chips = () => (filterType() === 'duration' ? DURATION_CHIPS : RATING_CHIPS);

  return (
    <div class="zenwayro-v2-ui min-h-full bg-background">
      <div class="sticky top-0 z-30 border-b border-border bg-white/95 backdrop-blur-md">
        <div class="mx-auto w-full max-w-5xl px-4 pb-3 pt-12">
          <div class="mb-4 flex items-center justify-between">
            <h1 class="text-2xl font-bold text-foreground">{t('popularTrips.communityTitle')}</h1>
            <button
              type="button"
              class="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-foreground"
              aria-label={t('popularTrips.publishInfoButtonLabel')}
              title={t('popularTrips.publishInfoTooltip')}
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
              </svg>
            </button>
          </div>
          <label class="mb-4 block">
            <span class="sr-only">{t('popularTrips.communitySearchPlaceholder')}</span>
            <input
              type="search"
              value={search()}
              onInput={(event) => setSearch(event.currentTarget.value)}
              placeholder={t('popularTrips.communitySearchPlaceholder')}
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            />
          </label>
          <div class="mb-3 flex gap-3">
            <button
              type="button"
              onClick={() => chooseFilterType('duration')}
              class={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${filterType() === 'duration' ? 'bg-[#0f1b3d] text-white' : 'bg-muted text-muted-foreground'}`}
            >
              {t('popularTrips.communityFilterDuration')}
            </button>
            <button
              type="button"
              onClick={() => chooseFilterType('rating')}
              class={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${filterType() === 'rating' ? 'bg-[#0f1b3d] text-white' : 'bg-muted text-muted-foreground'}`}
            >
              {t('popularTrips.communityFilterRating')}
            </button>
          </div>
          <div class="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            <For each={chips()}>
              {(chipId) => (
                <button
                  type="button"
                  onClick={() => chooseChip(chipId)}
                  class={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all ${activeChip() === chipId ? 'coral-gradient text-white shadow-md shadow-orange-900/20' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
                >
                  {t(filterType() === 'duration' ? DURATION_LABEL_KEYS[chipId] : RATING_LABEL_KEYS[chipId])}
                </button>
              )}
            </For>
          </div>
          <label class="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <span>{t('placeReview.sortLabel')}</span>
            <select
              value={sort()}
              onChange={chooseSort}
              class="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              <For each={POPULAR_TRIP_SORT_VALUES}>
                {(value) => <option value={value}>{t(SORT_LABEL_KEYS[value])}</option>}
              </For>
            </select>
          </label>
        </div>
      </div>

      <section class="mx-auto max-w-5xl px-4 pb-2 pt-4">
        <div class="flex flex-wrap items-end justify-between gap-2">
          <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t('popularTrips.browseCountriesTitle')}
          </h2>
          <Link
            href={ROUTE_POPULAR_TRIPS_BROWSE_COUNTRIES}
            class="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            {t('popularTrips.browseAllCountries', { count: String(countries().length) })}
          </Link>
        </div>
        <Show when={countries().length > 0}>
          <ul class="mt-2 flex flex-wrap gap-2">
            <For each={countries().slice(0, COUNTRY_LINK_LIMIT)}>
              {(entry) => (
                <li>
                  <Link
                    href={routePopularTripsCountry(entry.countrySlug)}
                    class="rounded-full border border-gray-200 px-3 py-1 text-sm hover:border-indigo-300 dark:border-gray-700"
                  >
                    {entry.country} ({entry.tripCount})
                  </Link>
                </li>
              )}
            </For>
          </ul>
        </Show>
        <Show when={cityLinks().length > 0}>
          <ul class="mt-3 flex flex-wrap gap-2">
            <For each={cityLinks()}>
              {(entry) => (
                <li>
                  <Link
                    href={entry.href}
                    class="rounded-full border border-gray-200 px-3 py-1 text-sm hover:border-indigo-300 dark:border-gray-700"
                  >
                    {popularTripTitle(entry.city)}
                  </Link>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </section>

      <div class="mx-auto w-full max-w-5xl px-4 pt-4">
        <Show when={loading()}>
          <p class="mt-12 text-center text-sm text-muted-foreground">{t('popularTrips.loading')}</p>
        </Show>
        <Show when={failed()}>
          <p class="mt-12 text-center text-sm text-destructive">{t('popularTrips.loadError')}</p>
        </Show>
        <Show when={!loading() && !failed() && displayed().length === 0}>
          <div class="mt-12 text-center">
            <p class="text-muted-foreground">{t('popularTrips.emptyState')}</p>
          </div>
        </Show>
        <Show when={!loading() && !failed() && displayed().length > 0}>
          <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('popularTrips.communityTripsFound', {
              count: String(tripsQuery.data()?.total ?? displayed().length),
            })}
          </p>
          <Show when={pageItems().length > 0}>
            <nav class="mb-1 mt-2 flex items-center justify-center gap-1" aria-label="Pagination">
              <button
                type="button"
                disabled={page() <= 1}
                onClick={() => setPage(page() - 1)}
                class="cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                &lsaquo;
              </button>
              <For each={pageItems()}>
                {(item) =>
                  item.gap ? (
                    <span class="select-none px-1.5 text-gray-400 dark:text-gray-600">&hellip;</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPage(item.page)}
                      aria-current={item.page === page() ? 'page' : undefined}
                      class={`min-w-9 cursor-pointer rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${item.page === page() ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}
                    >
                      {item.page}
                    </button>
                  )
                }
              </For>
              <button
                type="button"
                disabled={page() >= totalPages()}
                onClick={() => setPage(page() + 1)}
                class="cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                &rsaquo;
              </button>
            </nav>
          </Show>
          <div class={`${CARD_GRID_CLASS} mt-4`}>
            <For each={displayed()}>
              {(trip) => <TripCard trip={trip} t={t} />}
            </For>
          </div>
        </Show>
      </div>
    </div>
  );
}

function TripCard(props) {
  const trip = props.trip;
  const t = props.t;
  const title = popularTripTitle(trip.city);
  const heroSrc = popularTripHeroSrc(trip.cityImageCdnUrl);
  const durationLabel =
    trip.durationDays === 1
      ? t('popularTrips.daysSingular')
      : t('popularTrips.communityDurationBadge', { count: String(trip.durationDays) });
  const author = authorFirstName(trip, t('popularTrips.communityAnonymous'));
  const ratingLabel =
    trip.averageRating == null
      ? t('popularTrips.communityRatingNew')
      : Number(trip.averageRating).toFixed(1);

  return (
    <Link
      href={routePopularTrip(trip)}
      class="relative block aspect-[4/5] w-full min-w-0 overflow-hidden rounded-3xl shadow-md"
    >
      <Show when={heroSrc} fallback={<div class="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600" />}>
        <img
          src={heroSrc}
          alt={title}
          loading="lazy"
          decoding="async"
          class="absolute inset-0 h-full w-full object-cover"
        />
      </Show>
      <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div class="absolute left-3 top-3 md:left-4 md:top-4">
        <span class="glass rounded-full px-2.5 py-1 text-[10px] font-bold text-white md:px-3 md:py-1.5 md:text-xs">
          {durationLabel}
        </span>
      </div>
      <div class="absolute bottom-0 left-0 right-0 p-3 md:p-4 lg:p-5">
        <div class="flex items-end justify-between gap-2 md:gap-3">
          <div class="min-w-0">
            <h3 class="text-lg font-bold leading-tight text-white md:text-xl lg:text-2xl">{title}</h3>
            <p class="text-xs text-white/70 md:text-sm">{trip.country}</p>
            <div class="mt-1.5 flex items-center gap-2 md:mt-2 md:gap-3">
              <span class="text-xs font-semibold text-white/90 md:text-sm">★ {ratingLabel}</span>
              <span class="text-xs font-semibold text-white/80 md:text-sm">{trip.likeCount}</span>
            </div>
          </div>
          <div class="shrink-0 text-right">
            <div class="mb-0.5 ml-auto flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/40 bg-white/20 text-[10px] font-bold text-white md:mb-1 md:h-9 md:w-9 md:text-xs">
              {author.charAt(0).toUpperCase()}
            </div>
            <p class="text-[10px] text-white/60 md:text-xs">{author}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
