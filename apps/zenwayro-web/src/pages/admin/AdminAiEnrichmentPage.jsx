import { createSignal, For, Show } from 'grainlet';
import { useI18n } from 'grainlet/i18n';
import { useQuery } from 'grainlet/query';
import { ADMIN_PATHS, apiClient } from '../../api.js';
import {
  AdminShell,
  adminText,
  buttonClass,
  DataRegion,
  fieldClass,
  panelClass,
  secondaryButtonClass,
  useAdminAccess,
} from './AdminChrome.jsx';
import {
  ADMIN_AI_PAGE_SIZE,
  buildAiEnrichmentListParams,
  canGoToNextPage,
  canGoToPreviousPage,
  errorText,
  formatTimestamp,
} from './admin-helpers.js';

const AI_SORTS = [
  { value: 'enrichedAt', labelKey: 'admin.sortEnriched', label: 'Recently enriched' },
  { value: 'usefulnessScore', labelKey: 'admin.sortScore', label: 'Usefulness score' },
  { value: 'confidence', labelKey: 'admin.sortConfidence', label: 'Confidence' },
];

export function AdminAiEnrichmentPage() {
  const access = useAdminAccess('admin');
  const i18n = useI18n();
  const t = (key, fallback) => adminText(i18n, key, fallback);
  return (
    <AdminShell
      access={access}
      showBack
      title={t('admin.nav.aiEnrichment', 'AI enrichment quality')}
      description={t('admin.aiIntro', 'Review POIs with AI metadata, compare provider runs, and usefulness scores.')}
    >
      <AiBody />
    </AdminShell>
  );
}

function AiBody() {
  const i18n = useI18n();
  const t = (key, fallback) => adminText(i18n, key, fallback);
  const [country, setCountry] = createSignal('');
  const [cityId, setCityId] = createSignal('');
  const [q, setQ] = createSignal('');
  const [minScore, setMinScore] = createSignal(null);
  const [flaggedOnly, setFlaggedOnly] = createSignal(false);
  const [promptVersion, setPromptVersion] = createSignal('');
  const [sort, setSort] = createSignal('enrichedAt');
  const [page, setPage] = createSignal(1);
  const [selectedId, setSelectedId] = createSignal(null);

  const filters = () => ({
    country: country(),
    cityId: cityId(),
    q: q(),
    minScore: minScore(),
    flaggedOnly: flaggedOnly(),
    promptVersion: promptVersion(),
    sort: sort(),
    page: page(),
    pageSize: ADMIN_AI_PAGE_SIZE,
  });

  const stats = useQuery(() => ({
    queryKey: ['admin', 'ai-enrichment', 'stats'],
    queryFn: ({ signal }) => apiClient.get(ADMIN_PATHS.aiEnrichmentStats, { signal }),
  }));

  const cities = useQuery(() => ({
    queryKey: ['admin', 'cities', 'ai-enrichment'],
    queryFn: ({ signal }) => apiClient.get(ADMIN_PATHS.adminCities, { signal }),
  }));

  const list = useQuery(() => ({
    queryKey: ['admin', 'ai-enrichment', 'pois', buildAiEnrichmentListParams(filters())],
    queryFn: ({ signal }) =>
      apiClient.get(ADMIN_PATHS.aiEnrichmentPois, {
        signal,
        params: buildAiEnrichmentListParams(filters()),
      }),
  }));

  const detail = useQuery(() => ({
    queryKey: ['admin', 'ai-enrichment', 'poi', selectedId()],
    enabled: Boolean(selectedId()),
    queryFn: ({ signal }) => apiClient.get(ADMIN_PATHS.aiEnrichmentPoiById(selectedId()), { signal }),
  }));

  const pois = () => list.data()?.pois ?? [];
  const total = () => list.data()?.total ?? 0;

  return (
    <div class="space-y-6">
      <DataRegion
        pending={stats.isPending()}
        error={stats.error()}
        errorFallback={t('admin.statsError', 'Could not load enrichment stats.')}
        empty={false}
      >
        <StatsCards stats={stats.data()} />
      </DataRegion>
      <form
        class={`${panelClass} space-y-4`}
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
        }}
      >
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">{t('admin.filters', 'Filters')}</h2>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <label class="block text-sm text-gray-700 dark:text-gray-300">
            {t('admin.country', 'Country')}
            <input class={fieldClass} value={country()} placeholder={t('admin.countryPlaceholder', 'e.g. Italy')} onInput={(event) => setCountry(event.target.value)} />
          </label>
          <label class="block text-sm text-gray-700 dark:text-gray-300">
            {t('admin.city', 'City')}
            <select class={fieldClass} value={cityId()} onChange={(event) => setCityId(event.target.value)}>
              <option value="">{t('admin.allCities', 'All cities')}</option>
              <For each={cities.data() ?? []}>
                {(city) => (
                  <option value={city.id}>
                    {city.name}, {city.country}
                  </option>
                )}
              </For>
            </select>
          </label>
          <label class="block text-sm text-gray-700 dark:text-gray-300">
            {t('admin.nameSearch', 'Name search')}
            <input class={fieldClass} value={q()} placeholder={t('admin.poiName', 'POI name')} onInput={(event) => setQ(event.target.value)} />
          </label>
          <label class="block text-sm text-gray-700 dark:text-gray-300">
            {t('admin.minScore', 'Min usefulness score')}
            <input
              class="mt-2 w-full"
              type="range"
              min="0"
              max="100"
              value={minScore() ?? 0}
              onInput={(event) => {
                const value = parseInt(event.target.value, 10);
                setMinScore(value <= 0 ? null : value);
              }}
            />
            <span class="text-xs text-gray-500">{minScore() ?? t('admin.any', 'any')}</span>
          </label>
          <label class="block text-sm text-gray-700 dark:text-gray-300">
            {t('admin.promptVersion', 'Prompt version')}
            <input class={fieldClass} value={promptVersion()} placeholder="v10" onInput={(event) => setPromptVersion(event.target.value)} />
          </label>
          <label class="block text-sm text-gray-700 dark:text-gray-300">
            {t('admin.sortBy', 'Sort by')}
            <select class={fieldClass} value={sort()} onChange={(event) => setSort(event.target.value)}>
              <For each={AI_SORTS}>
                {(option) => <option value={option.value}>{adminText(i18n, option.labelKey, option.label)}</option>}
              </For>
            </select>
          </label>
          <label class="flex items-center gap-2 pt-6 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={flaggedOnly()} onChange={(event) => setFlaggedOnly(event.target.checked)} />
            {t('admin.flaggedOnly', 'Flagged only')}
          </label>
        </div>
        <Show when={cities.error()}>
          {(err) => <p class="text-sm text-red-600">{errorText(err, t('admin.citiesError', 'Could not load cities.'))}</p>}
        </Show>
        <button type="submit" class={buttonClass}>{t('admin.applyFilters', 'Apply filters')}</button>
      </form>
      <DataRegion
        pending={list.isPending()}
        error={list.error()}
        errorFallback={t('admin.aiListError', 'Could not load enriched POIs.')}
        empty={pois().length === 0}
        emptyText={t('admin.noEnrichedPois', 'No enriched POIs match these filters.')}
      >
        <ul class="space-y-2">
          <For each={pois()}>
            {(poi) => (
              <li>
                <button
                  type="button"
                  class={`${panelClass} w-full text-left hover:border-indigo-500`}
                  onClick={() => setSelectedId(poi.id)}
                >
                  <span class="font-medium text-gray-900 dark:text-white">{poi.name}</span>
                  <span class="mt-1 block text-sm text-gray-500">
                    {poi.country} · {poi.category} · {poi.grade} · {poi.usefulnessScore} · {poi.flagCount} {t('admin.flags', 'flags')} · {formatTimestamp(poi.enrichedAt)}
                  </span>
                </button>
              </li>
            )}
          </For>
        </ul>
      </DataRegion>
      <div class="flex items-center gap-3 text-sm">
        <button type="button" class={secondaryButtonClass} disabled={!canGoToPreviousPage(page())} onClick={() => setPage(page() - 1)}>
          {t('admin.previous', 'Previous')}
        </button>
        <span class="text-gray-600 dark:text-gray-300">{page()}</span>
        <button type="button" class={secondaryButtonClass} disabled={!canGoToNextPage(page(), ADMIN_AI_PAGE_SIZE, total())} onClick={() => setPage(page() + 1)}>
          {t('admin.next', 'Next')}
        </button>
      </div>
      <Show when={selectedId()}>
        <DetailPanel
          pending={detail.isLoading()}
          error={detail.error()}
          detail={detail.data()}
          onClose={() => setSelectedId(null)}
        />
      </Show>
    </div>
  );
}

function StatsCards(props) {
  const i18n = useI18n();
  const t = (key, fallback) => adminText(i18n, key, fallback);
  const stats = props.stats ?? {};
  const cards = [
    [t('admin.totalEnriched', 'Enriched'), stats.totalEnriched],
    [t('admin.totalCandidates', 'Candidates'), stats.totalCandidates],
    [t('admin.recent24h', 'Last 24 hours'), stats.recentlyEnriched24h],
    [t('admin.avgScore', 'Avg usefulness'), stats.avgUsefulnessScore],
    [t('admin.pctFlags', 'With flags'), stats.pctWithFlags],
    [t('admin.pctReady', 'Traveler ready'), stats.pctTravelerReady],
  ];
  return (
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-3 md:grid-cols-3">
        <For each={cards}>
          {(card) => (
            <div class={panelClass}>
              <p class="text-xs uppercase tracking-wide text-gray-500">{card[0]}</p>
              <p class="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{card[1] ?? '—'}</p>
            </div>
          )}
        </For>
      </div>
      <Breakdown title={t('admin.byModel', 'By model')} rows={stats.byModel} />
      <Breakdown title={t('admin.byPrompt', 'By prompt version')} rows={stats.byPromptVersion} />
      <Breakdown title={t('admin.byCountry', 'By country')} rows={stats.byCountry} />
    </div>
  );
}

function Breakdown(props) {
  return (
    <Show when={(props.rows ?? []).length > 0}>
      <div>
        <h3 class="text-sm font-medium text-gray-900 dark:text-white">{props.title}</h3>
        <ul class="mt-1 text-sm text-gray-600 dark:text-gray-300">
          <For each={props.rows}>
            {(row) => (
              <li>
                {row.key}: {row.count}
              </li>
            )}
          </For>
        </ul>
      </div>
    </Show>
  );
}

function DetailPanel(props) {
  const i18n = useI18n();
  const t = (key, fallback) => adminText(i18n, key, fallback);
  const detail = () => props.detail;
  return (
    <aside class={`${panelClass} space-y-3`}>
      <div class="flex items-start justify-between gap-3">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">{t('admin.poiDetail', 'POI detail')}</h2>
        <button type="button" class={secondaryButtonClass} onClick={props.onClose}>{t('admin.close', 'Close')}</button>
      </div>
      <Show when={props.pending}>
        <p class="text-sm text-gray-500">{t('admin.loading', 'Loading…')}</p>
      </Show>
      <Show when={props.error}>
        {(err) => <p class="text-sm text-red-600">{errorText(err, t('admin.detailError', 'Could not load this POI.'))}</p>}
      </Show>
      <Show when={detail()}>
        {(value) => (
          <div class="space-y-2 text-sm text-gray-700 dark:text-gray-200">
            <p class="font-medium text-gray-900 dark:text-white">{value.name}</p>
            <p>{value.category} · {value.country}</p>
            <Show when={value.description}>
              {(text) => <p>{text}</p>}
            </Show>
            <p>
              {t('admin.grade', 'Grade')}: {value.assessment?.grade} · {value.assessment?.usefulnessScore} · {value.assessment?.travelerReady ? t('admin.ready', 'Traveler ready') : t('admin.notReady', 'Not traveler ready')}
            </p>
            <Show when={(value.assessment?.flags ?? []).length > 0}>
              <ul class="list-disc pl-5">
                <For each={value.assessment?.flags ?? []}>{(flag) => <li>{flag}</li>}</For>
              </ul>
            </Show>
            <Show when={(value.enrichmentVersions ?? []).length === 0}>
              <p class="text-gray-500">{t('admin.noVersions', 'No enrichment versions.')}</p>
            </Show>
            <ul class="space-y-1">
              <For each={value.enrichmentVersions ?? []}>
                {(version) => (
                  <li>
                    {version.metadata?.model} · {version.metadata?.promptVersion}
                    {version.isActive ? ` · ${t('admin.active', 'active')}` : ''}
                  </li>
                )}
              </For>
            </ul>
          </div>
        )}
      </Show>
    </aside>
  );
}
