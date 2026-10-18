import { createSignal, For, Show } from 'grainlet';
import { useI18n } from 'grainlet/i18n';
import { useQuery } from 'grainlet/query';
import { Link } from 'grainlet/route';
import { apiClient, POPULAR_TRIP_PATHS } from '../../api.js';
import { translateApp } from '../../i18n.js';
import { ROUTE_POPULAR_TRIPS } from '../../routes.js';
import { asArray, routePopularTripsCountry } from './popular-routes.js';

export function PopularBrowsePage() {
  const i18n = useI18n();
  const t = (key, variables) => translateApp(i18n, key, variables);
  const [query, setQuery] = createSignal('');
  const countriesQuery = useQuery(() => ({
    queryKey: ['popular-trips', 'directory-countries'],
    queryFn: ({ signal }) =>
      apiClient.get(POPULAR_TRIP_PATHS.directoryCountries, { signal }),
  }));

  const countries = () => asArray(countriesQuery.data());
  const filtered = () => {
    const needle = query().trim().toLowerCase();
    const list = countries();
    if (!needle) return list;
    return list.filter((entry) => String(entry.country ?? '').toLowerCase().includes(needle));
  };
  const loading = () => countriesQuery.data() == null && !countriesQuery.isError();
  const failed = () => countriesQuery.data() == null && countriesQuery.isError();

  return (
    <div class="zenwayro-v2-ui mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <nav class="text-sm text-gray-500 dark:text-gray-400">
        <Link href={ROUTE_POPULAR_TRIPS} class="hover:text-indigo-600 dark:hover:text-indigo-400">
          {t('nav.popularTrips')}
        </Link>
        <span class="mx-2">/</span>
        <span class="text-gray-700 dark:text-gray-300">{t('popularTrips.browseCountriesTitle')}</span>
      </nav>

      <h1 class="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
        {t('popularTrips.browseCountriesTitle')}
      </h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {t('popularTrips.browseCountriesSubtitle', { count: String(countries().length) })}
      </p>

      <label class="mt-6 block">
        <span class="sr-only">{t('popularTrips.browseCountriesSearch')}</span>
        <input
          type="search"
          value={query()}
          onInput={(event) => setQuery(event.currentTarget.value)}
          placeholder={t('popularTrips.browseCountriesSearch')}
          class="w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
        />
      </label>

      <Show when={loading()}>
        <p class="mt-8 text-sm text-gray-500 dark:text-gray-400">{t('popularTrips.loading')}</p>
      </Show>
      <Show when={failed()}>
        <p class="mt-8 text-sm text-red-500">{t('popularTrips.loadError')}</p>
      </Show>
      <Show when={!loading() && !failed() && filtered().length === 0}>
        <p class="mt-8 text-sm text-gray-500 dark:text-gray-400">
          {t('popularTrips.browseCountriesEmpty')}
        </p>
      </Show>
      <Show when={filtered().length > 0}>
        <ul class="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <For each={filtered()}>
            {(entry) => (
              <li>
                <Link
                  href={routePopularTripsCountry(entry.countrySlug)}
                  class="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 transition-colors hover:border-indigo-300 dark:border-gray-800 dark:hover:border-indigo-700"
                >
                  <span class="font-medium text-gray-900 dark:text-white">{entry.country}</span>
                  <span class="text-sm text-gray-500 dark:text-gray-400">
                    {t('popularTrips.browseCountriesTripCount', {
                      count: String(entry.tripCount),
                    })}
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
