import { createEffect, createSignal, For, Show, Switch, Match } from 'grainlet';
import { useSession } from 'grainlet/auth';
import { useI18n } from 'grainlet/i18n';
import { useMutation, useQuery } from 'grainlet/query';
import { Link, navigate, useLocation, useParams } from 'grainlet/route';
import { apiClient, POPULAR_TRIP_PATHS } from '../../api.js';
import { translateApp } from '../../i18n.js';
import {
  ROUTE_POPULAR_TRIPS,
  routeAuthSignInWithCallback,
  routePlanById,
} from '../../routes.js';
import {
  CITY_HUB_PAGE_SIZE,
  MAX_COPY_TRIP_DAYS,
  POPULAR_TRIPS_DEFAULT_SORT,
  asArray,
  cityLabelFromSlug,
  copyDatesAreValid,
  countryLabelFromSlug,
  formatPlanDuration,
  inclusiveTripDays,
  listPopularTripsParams,
  parsePopularTripSplat,
  popularTripHeroSrc,
  popularTripTitle,
  routePopularTrip,
  routePopularTripsCity,
  routePopularTripsCountry,
  sortedTripDays,
  todayYmd,
} from './popular-routes.js';

function useAppT() {
  const i18n = useI18n();
  return (key, variables) => translateApp(i18n, key, variables);
}

function parsedSplat() {
  const params = useParams();
  return () => parsePopularTripSplat(params()['*']);
}

export function PopularTripPage() {
  const t = useAppT();
  const kind = parsedSplat();

  return (
    <div class="zenwayro-v2-ui min-h-full bg-background">
      <Switch fallback={<MissingTrip t={t} />}>
        <Match when={kind().kind === 'country'}>
          <CountryHub />
        </Match>
        <Match when={kind().kind === 'city'}>
          <CityHub />
        </Match>
        <Match when={kind().kind === 'trip'}>
          <TripDetail />
        </Match>
        <Match when={kind().kind === 'uuid'}>
          <UuidRedirect />
        </Match>
      </Switch>
    </div>
  );
}

function MissingTrip(props) {
  const t = props.t;
  return (
    <div class="mx-auto max-w-3xl px-4 py-12 text-center">
      <p class="text-red-500">{t('popularTrips.notFound')}</p>
      <Link
        href={ROUTE_POPULAR_TRIPS}
        class="mt-4 inline-block text-sm text-indigo-600 hover:text-indigo-700"
      >
        {t('popularTrips.backToList')}
      </Link>
    </div>
  );
}

function CountryHub() {
  const t = useAppT();
  const parsed = parsedSplat();
  const slug = () => (parsed().kind === 'country' ? parsed().countrySlug : '');
  const citiesQuery = useQuery(() => ({
    queryKey: ['popular-trips', 'directory-cities', slug()],
    enabled: slug() !== '',
    queryFn: ({ signal }) => apiClient.get(POPULAR_TRIP_PATHS.directoryCities(slug()), { signal }),
  }));
  const cities = () => asArray(citiesQuery.data());
  const label = () => countryLabelFromSlug(slug(), cities());
  const loading = () => citiesQuery.data() == null && !citiesQuery.isError();
  const failed = () => citiesQuery.data() == null && citiesQuery.isError();

  return (
    <div class="mx-auto max-w-5xl px-4 py-8">
      <nav class="text-sm text-gray-500">
        <Link href={ROUTE_POPULAR_TRIPS} class="hover:text-indigo-600">
          {t('nav.popularTrips')}
        </Link>
        <span class="mx-2">/</span>
        <span>{label()}</span>
      </nav>
      <h1 class="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
        Popular trips in {label()}
      </h1>
      <Show when={loading()}>
        <p class="mt-8 text-sm text-gray-500">{t('popularTrips.loading')}</p>
      </Show>
      <Show when={failed()}>
        <p class="mt-8 text-sm text-red-500">{t('popularTrips.loadError')}</p>
      </Show>
      <Show when={!loading() && !failed() && cities().length === 0}>
        <p class="mt-8 text-sm text-gray-500">{t('popularTrips.emptyState')}</p>
      </Show>
      <Show when={cities().length > 0}>
        <ul class="mt-6 grid gap-2 sm:grid-cols-2">
          <For each={cities()}>
            {(entry) => (
              <li>
                <Link
                  href={routePopularTripsCity(slug(), entry.citySlug)}
                  class="block rounded-lg border border-gray-200 px-4 py-3 hover:border-indigo-300 dark:border-gray-800"
                >
                  <span class="font-medium text-gray-900 dark:text-white">
                    {popularTripTitle(entry.city)}
                  </span>
                  <span class="ml-2 text-sm text-gray-500">
                    ({t('popularTrips.browseCountriesTripCount', { count: String(entry.tripCount) })})
                  </span>
                </Link>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  );
}

function CityHub() {
  const t = useAppT();
  const parsed = parsedSplat();
  const countrySlug = () => (parsed().kind === 'city' ? parsed().countrySlug : '');
  const citySlug = () => (parsed().kind === 'city' ? parsed().citySlug : '');
  const tripsQuery = useQuery(() => {
    const params = listPopularTripsParams({
      countrySlug: countrySlug(),
      citySlug: citySlug(),
      sort: POPULAR_TRIPS_DEFAULT_SORT,
      page: 1,
      limit: CITY_HUB_PAGE_SIZE,
    });
    return {
      queryKey: ['popular-trips', 'city-hub', params],
      enabled: countrySlug() !== '' && citySlug() !== '',
      queryFn: ({ signal }) => apiClient.get(POPULAR_TRIP_PATHS.root, { params, signal }),
    };
  });
  const trips = () => asArray(tripsQuery.data()?.items);
  const label = () => cityLabelFromSlug(citySlug());
  const loading = () => tripsQuery.data() == null && !tripsQuery.isError();
  const failed = () => tripsQuery.data() == null && tripsQuery.isError();

  return (
    <div class="mx-auto max-w-5xl px-4 py-8">
      <nav class="text-sm text-gray-500">
        <Link href={ROUTE_POPULAR_TRIPS} class="hover:text-indigo-600">
          {t('nav.popularTrips')}
        </Link>
        <span class="mx-2">/</span>
        <Link href={routePopularTripsCountry(countrySlug())} class="hover:text-indigo-600">
          {countrySlug()}
        </Link>
        <span class="mx-2">/</span>
        <span>{label()}</span>
      </nav>
      <h1 class="mt-4 text-2xl font-bold capitalize text-gray-900 dark:text-white">
        {label()} itineraries
      </h1>
      <Show when={loading()}>
        <p class="mt-8 text-sm text-gray-500">{t('popularTrips.loading')}</p>
      </Show>
      <Show when={failed()}>
        <p class="mt-8 text-sm text-red-500">{t('popularTrips.loadError')}</p>
      </Show>
      <Show when={!loading() && !failed() && trips().length === 0}>
        <p class="mt-8 text-sm text-gray-500">{t('popularTrips.emptyState')}</p>
      </Show>
      <Show when={trips().length > 0}>
        <ul class="mt-6 space-y-2">
          <For each={trips()}>
            {(trip) => (
              <li>
                <Link
                  href={routePopularTrip(trip)}
                  class="text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  {popularTripTitle(trip.city)} —{' '}
                  {trip.durationDays === 1
                    ? t('popularTrips.daysSingular')
                    : t('popularTrips.daysTag', { count: String(trip.durationDays) })}
                  <Show when={trip.authorName}>
                    {' '}({trip.authorName})
                  </Show>
                </Link>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  );
}

function UuidRedirect() {
  const t = useAppT();
  const parsed = parsedSplat();
  const location = useLocation();
  const id = () => (parsed().kind === 'uuid' ? parsed().id : '');
  const detailQuery = useQuery(() => ({
    queryKey: ['popular-trip', id()],
    enabled: id() !== '',
    queryFn: ({ signal }) => apiClient.get(POPULAR_TRIP_PATHS.byId(id()), { signal }),
  }));

  createEffect(() => {
    const trip = detailQuery.data();
    const target = trip?.canonicalPath;
    if (typeof target !== 'string' || !target.startsWith('/')) return;
    const loc = location();
    const here = `${loc.pathname}${loc.search || ''}`;
    if (here === target || loc.pathname === target) return;
    navigate(target, { replace: true });
  });

  const target = () => {
    const path = detailQuery.data()?.canonicalPath;
    return typeof path === 'string' && path.startsWith('/') ? path : '';
  };
  const samePage = () => target() !== '' && location().pathname === target();
  const loading = () => detailQuery.data() == null && !detailQuery.isError();
  const missing = () => !loading() && (detailQuery.isError() || (detailQuery.data() != null && target() === ''));

  return (
    <Switch fallback={<p class="py-20 text-center text-sm text-gray-500">{t('popularTrips.loading')}</p>}>
      <Match when={samePage()}>
        <TripDetail />
      </Match>
      <Match when={missing()}>
        <MissingTrip t={t} />
      </Match>
    </Switch>
  );
}

function TripDetail() {
  const t = useAppT();
  const session = useSession();
  const location = useLocation();
  const parsed = parsedSplat();
  const lookupId = () => {
    const current = parsed();
    if (current.kind === 'trip') return current.tripSlug;
    if (current.kind === 'uuid') return current.id;
    return '';
  };
  const detailQuery = useQuery(() => ({
    queryKey: ['popular-trip', lookupId()],
    enabled: lookupId() !== '',
    queryFn: ({ signal }) => apiClient.get(POPULAR_TRIP_PATHS.byId(lookupId()), { signal }),
  }));
  const copy = useMutation(() => ({
    mutationFn: ({ id, startDate, endDate }) =>
      apiClient.post(POPULAR_TRIP_PATHS.copy(id), { startDate, endDate }),
  }));
  const [copyOpen, setCopyOpen] = createSignal(false);
  const [startDate, setStartDate] = createSignal('');
  const [endDate, setEndDate] = createSignal('');
  const [copyError, setCopyError] = createSignal('');
  const [openDays, setOpenDays] = createSignal(null);
  const [trackedTripId, setTrackedTripId] = createSignal('');
  const [selectedPlaceId, setSelectedPlaceId] = createSignal(null);

  const trip = () => detailQuery.data();
  const days = () => sortedTripDays(trip());
  const loading = () => trip() == null && !detailQuery.isError();
  const failed = () => trip() == null && detailQuery.isError();
  const title = () => popularTripTitle(trip()?.city);
  const heroSrc = () => popularTripHeroSrc(trip()?.cityImageCdnUrl);
  const signInHref = () =>
    routeAuthSignInWithCallback(`${location().pathname}${location().search || ''}`);
  const datesValid = () => copyDatesAreValid(startDate(), endDate());
  const selectedSpan = () => inclusiveTripDays(startDate(), endDate());

  createEffect(() => {
    const current = trip();
    const id = current?.id;
    if (!id || id === trackedTripId()) return;
    setTrackedTripId(id);
    const first = sortedTripDays(current)[0]?.dayNumber;
    setOpenDays(first == null ? [] : [first]);
    setSelectedPlaceId(null);
  });

  function isDayOpen(dayNumber) {
    const open = openDays();
    if (open == null) return days()[0]?.dayNumber === dayNumber;
    return open.includes(dayNumber);
  }

  function toggleDay(dayNumber) {
    const current = openDays();
    const base = current == null ? days().slice(0, 1).map((day) => day.dayNumber) : current;
    setOpenDays(
      base.includes(dayNumber) ? base.filter((value) => value !== dayNumber) : [...base, dayNumber]
    );
  }

  async function submitCopy(event) {
    event.preventDefault();
    const current = trip();
    if (!current?.id || !datesValid() || copy.isPending()) return;
    setCopyError('');
    try {
      const result = await copy.mutateAsync({
        id: current.id,
        startDate: startDate(),
        endDate: endDate(),
      });
      const tripId = result?.tripId;
      if (!tripId) {
        setCopyError(t('popularTrips.copyTripError'));
        return;
      }
      navigate(routePlanById(tripId), { replace: true });
    } catch {
      setCopyError(t('popularTrips.copyTripError'));
    }
  }

  return (
    <Show
      when={!loading() && !failed() && trip()}
      fallback={
        <Show when={failed()} fallback={<p class="py-20 text-center text-sm text-gray-500">{t('popularTrips.loading')}</p>}>
          <div class="mx-auto max-w-3xl px-4 py-12 text-center">
            <p class="text-red-500">{detailQuery.error()?.message || t('popularTrips.notFound')}</p>
            <Link
              href={ROUTE_POPULAR_TRIPS}
              class="mt-4 inline-block text-sm text-indigo-600 hover:text-indigo-700"
            >
              {t('popularTrips.backToList')}
            </Link>
          </div>
        </Show>
      }
    >
      <div class="flex h-full min-h-0 flex-col overflow-hidden">
        <div class="relative isolate h-44 w-full shrink-0 overflow-hidden bg-gray-900 sm:h-52">
          <Show
            when={heroSrc()}
            fallback={<div class="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-700 dark:to-purple-800" />}
          >
            <img src={heroSrc()} alt={title()} class="absolute inset-0 h-full w-full object-cover" />
          </Show>
          <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-transparent" />
          <div class="absolute inset-x-0 bottom-0 z-10 p-4 pb-5 text-white sm:p-5">
            <Link
              href={ROUTE_POPULAR_TRIPS}
              class="mb-2 inline-flex w-fit max-w-full items-center gap-1 text-sm text-white/90 hover:text-white"
            >
              <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              {t('popularTrips.backToList')}
            </Link>
            <h1 class="text-2xl font-bold drop-shadow-sm">{title()}</h1>
            <p class="mt-0.5 text-sm text-white/85">{trip()?.country}</p>
            <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/90">
              <span>
                {trip()?.durationDays === 1
                  ? t('popularTrips.daysSingular')
                  : t('popularTrips.daysTag', { count: String(trip()?.durationDays ?? 0) })}
              </span>
              <Show when={trip()?.authorName}>
                <span class="text-white/50">·</span>
                <span>{t('popularTrips.byAuthor', { name: trip()?.authorName })}</span>
              </Show>
              <span class="text-white/50">·</span>
              <span>
                {trip()?.averageRating == null
                  ? t('popularTrips.noRatingsYet')
                  : t('popularTrips.ratingOutOf', { rating: Number(trip().averageRating).toFixed(1) })}
              </span>
              <span>
                {t(
                  trip()?.ratingCount === 1 ? 'popularTrips.ratingCount' : 'popularTrips.ratingCountPlural',
                  { count: String(trip()?.ratingCount ?? 0) }
                )}
              </span>
            </div>
          </div>
          <div class="absolute right-3 top-3 z-20 sm:right-4 sm:top-4">
            <Show when={session.status() !== 'loading'}>
              <Show
                when={session.status() === 'authenticated'}
                fallback={
                  <Link
                    href={signInHref()}
                    class="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-white/25"
                    aria-label={t('popularTrips.copyTripAriaLabel')}
                    title={t('popularTrips.copyTripTooltip')}
                  >
                    {t('popularTrips.copyTrip')}
                  </Link>
                }
              >
                <button
                  type="button"
                  onClick={() => setCopyOpen(true)}
                  class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/25"
                  aria-label={t('popularTrips.copyTripAriaLabel')}
                  title={t('popularTrips.copyTripTooltip')}
                >
                  {t('popularTrips.copyTrip')}
                </button>
              </Show>
            </Show>
          </div>
        </div>

        <Show when={copyOpen()}>
          <form
            class="shrink-0 border-b border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-950"
            onSubmit={submitCopy}
          >
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              {t('popularTrips.copyTripModalTitle')}
            </h2>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {t('popularTrips.copyTripModalSubtitle', { city: title() })}
            </p>
            <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {t('popularTrips.copyTripModalItineraryHint', { count: String(days().length) })}
            </p>
            <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {t('popularTrips.copyTripModalDatesHint', { max: String(MAX_COPY_TRIP_DAYS) })}
            </p>
            <div class="mt-4 flex flex-wrap gap-3">
              <label class="text-sm text-gray-700 dark:text-gray-300">
                <span class="mb-1 block">{t('planGenerate.datesLabel')}</span>
                <input
                  type="date"
                  required
                  min={todayYmd()}
                  value={startDate()}
                  onInput={(event) => setStartDate(event.currentTarget.value)}
                  class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                />
              </label>
              <label class="text-sm text-gray-700 dark:text-gray-300">
                <span class="mb-1 block">{t('planGenerate.datesLabel')}</span>
                <input
                  type="date"
                  required
                  min={startDate() || todayYmd()}
                  value={endDate()}
                  onInput={(event) => setEndDate(event.currentTarget.value)}
                  class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                />
              </label>
            </div>
            <Show when={selectedSpan() != null && selectedSpan() >= 1}>
              <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
                {t('planGenerate.datesSummary', { count: selectedSpan() })}
              </p>
            </Show>
            <Show when={selectedSpan() != null && selectedSpan() > MAX_COPY_TRIP_DAYS}>
              <p class="mt-1 text-sm text-red-600 dark:text-red-400">
                {t('planGenerate.durationTooLong', { max: MAX_COPY_TRIP_DAYS })}
              </p>
            </Show>
            <Show when={copyError()}>
              <p class="mt-2 text-sm text-red-600">{copyError()}</p>
            </Show>
            <div class="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCopyOpen(false)}
                class="rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {t('popularTrips.copyTripModalCancel')}
              </button>
              <button
                type="submit"
                disabled={!datesValid() || copy.isPending()}
                class="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {copy.isPending()
                  ? t('popularTrips.copyTripModalSubmitting')
                  : t('popularTrips.copyTripModalConfirm')}
              </button>
            </div>
          </form>
        </Show>

        <Show when={trip()?.notes}>
          <div class="shrink-0 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
            <h2 class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {t('popularTrips.notes')}
            </h2>
            <p class="mt-1 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{trip()?.notes}</p>
          </div>
        </Show>

        <Show
          when={days().length === 0}
          fallback={
            <div class="min-h-0 flex-1 overflow-auto">
              <h2 class="px-4 pt-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t('popularTrips.itinerary')}
              </h2>
              <For each={days()}>
                {(day) => (
                  <div class="border-b border-gray-200 dark:border-gray-800">
                    <button
                      type="button"
                      onClick={() => toggleDay(day.dayNumber)}
                      aria-expanded={isDayOpen(day.dayNumber) ? 'true' : 'false'}
                      class="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-900"
                    >
                      <svg
                        class={`mt-1.5 h-4 w-4 shrink-0 text-gray-400 transition-transform dark:text-gray-500 ${isDayOpen(day.dayNumber) ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        stroke-width="2"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                      <div class="min-w-0 flex-1">
                        <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">
                          {t('dayTab.day', { number: String(day.dayNumber) })}
                        </h3>
                        <Show when={!isDayOpen(day.dayNumber) && asArray(day.places).length > 0}>
                          <p class="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">
                            {asArray(day.places).map((place) => place.name).join(' • ')}
                          </p>
                        </Show>
                      </div>
                    </button>
                    <div class={isDayOpen(day.dayNumber) ? 'px-4 pb-3' : 'hidden'}>
                      <Show when={day.durationMin != null || day.distanceKm != null}>
                        <div class="mb-3 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                          <Show when={day.durationMin != null}>
                            <span>{formatPlanDuration(day.durationMin)}</span>
                          </Show>
                          <Show when={day.distanceKm != null}>
                            <span>
                              {Number(day.distanceKm).toFixed(1)} {t('quiz.kmSuffix')}
                            </span>
                          </Show>
                          <span>{t('plan.stopsCount', { count: String(asArray(day.places).length) })}</span>
                        </div>
                      </Show>
                      <Show when={asArray(day.places).length === 0}>
                        <p class="text-sm text-gray-500 dark:text-gray-400">{t('popularTrips.noPlacesForDay')}</p>
                      </Show>
                      <div class="space-y-2">
                        <For each={asArray(day.places)}>
                          {(place, index) => (
                            <button
                              type="button"
                              data-poi-id={place.id}
                              onClick={() => setSelectedPlaceId(place.id)}
                              class={`w-full rounded-lg border border-gray-200 px-3 py-2 text-left dark:border-gray-800 ${place.id === selectedPlaceId() ? 'border-indigo-400 ring-1 ring-indigo-400 dark:border-indigo-500' : ''}`}
                            >
                              <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {index() + 1}. {place.name}
                              </p>
                              <Show when={place.category}>
                                <p class="text-xs capitalize text-gray-500">{place.category}</p>
                              </Show>
                              <Show when={place.description}>
                                <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">{place.description}</p>
                              </Show>
                            </button>
                          )}
                        </For>
                      </div>
                    </div>
                  </div>
                )}
              </For>
            </div>
          }
        >
          <div class="flex flex-1 items-center justify-center p-8 text-sm text-gray-500 dark:text-gray-400">
            {t('popularTrips.noItinerary')}
          </div>
        </Show>
      </div>
    </Show>
  );
}
