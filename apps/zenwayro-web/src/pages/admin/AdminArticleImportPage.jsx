import { createSignal, For, Show } from 'grainlet';
import { createForm } from 'grainlet/forms';
import { useI18n } from 'grainlet/i18n';
import { useMutation, useQuery } from 'grainlet/query';
import { navigate } from 'grainlet/route';
import { ADMIN_PATHS, apiClient } from '../../api.js';
import { routeAdminArticleImportRun } from '../../routes.js';
import {
  AdminShell,
  adminText,
  buttonClass,
  DataRegion,
  fieldClass,
  panelClass,
  useAdminAccess,
} from './AdminChrome.jsx';
import { buildArticleAnalyzeRequest, errorText, filterCities } from './admin-helpers.js';

export function AdminArticleImportPage() {
  const access = useAdminAccess('admin');
  const i18n = useI18n();
  const t = (key, fallback) => adminText(i18n, key, fallback);
  return (
    <AdminShell
      access={access}
      showBack
      title={t('admin.nav.articleImport', 'Article POI import')}
      description={t('admin.articleIntro', 'Extract, review, and save unique POIs from travel articles.')}
    >
      <ImportBody />
    </AdminShell>
  );
}

function ImportBody() {
  const i18n = useI18n();
  const t = (key, fallback) => adminText(i18n, key, fallback);
  const [inputMode, setInputMode] = createSignal('text');
  const [cityQuery, setCityQuery] = createSignal('');
  const [localError, setLocalError] = createSignal('');
  const cities = useQuery(() => ({
    queryKey: ['admin', 'cities', 'article-import'],
    queryFn: ({ signal }) => apiClient.get(ADMIN_PATHS.adminCities, { signal }),
  }));
  const analyze = useMutation({
    mutationFn: (body) => apiClient.post(ADMIN_PATHS.articleImportAnalyze, body),
  });
  const form = createForm({
    initialValues: { cityId: '', sourceTitle: '', articleUrl: '', articleText: '' },
    onSubmit: async (values) => {
      const result = buildArticleAnalyzeRequest({ ...values, inputMode: inputMode() });
      if (result.error) {
        setLocalError(result.error);
        return;
      }
      setLocalError('');
      try {
        const response = await analyze.mutateAsync(result.body);
        navigate(routeAdminArticleImportRun(response.runId));
      } catch (error) {
        setLocalError(errorText(error, t('admin.analyzeFailed', 'Analyze failed')));
      }
    },
  });
  const matches = () => filterCities(cities.data() ?? [], cityQuery());
  const selected = () => (cities.data() ?? []).find((city) => city.id === form.values().cityId);
  return (
    <form class={`${panelClass} space-y-4`} novalidate onSubmit={form.handleSubmit}>
      <h2 class="text-base font-semibold text-gray-900 dark:text-white">{t('admin.source', 'Source')}</h2>
      <DataRegion
        pending={cities.isPending()}
        error={cities.error()}
        errorFallback={t('admin.citiesError', 'Could not load cities.')}
        empty={!cities.isPending() && (cities.data() ?? []).length === 0}
        emptyText={t('admin.noCities', 'No cities match this filter.')}
      >
        <label class="block text-sm text-gray-700 dark:text-gray-300">
          {t('admin.findCity', 'Find city')}
          <input
            class={fieldClass}
            value={cityQuery()}
            placeholder={t('admin.findCityPlaceholder', 'Search by city or country name…')}
            disabled={analyze.isPending()}
            onInput={(event) => setCityQuery(event.target.value)}
          />
        </label>
        <label class="mt-3 block text-sm text-gray-700 dark:text-gray-300">
          {t('admin.city', 'City')}
          <select
            class={fieldClass}
            name="cityId"
            value={form.values().cityId}
            disabled={analyze.isPending()}
            onChange={form.handleChange}
          >
            <option value="">{t('admin.selectCity', 'Select a city')}</option>
            <For each={matches()}>
              {(city) => (
                <option value={city.id}>
                  {city.name}, {city.country}
                </option>
              )}
            </For>
          </select>
        </label>
        <p class="mt-2 text-xs text-gray-500">
          {selected()
            ? `${t('admin.selected', 'Selected')}: ${selected().name}, ${selected().country}`
            : `${t('admin.cityCount', 'Cities')}: ${(cities.data() ?? []).length}`}
        </p>
      </DataRegion>
      <div class="flex flex-wrap gap-3 text-sm">
        <label class="inline-flex items-center gap-2">
          <input type="radio" checked={inputMode() === 'text'} onChange={() => setInputMode('text')} />
          {t('admin.pasteText', 'Paste text')}
        </label>
        <label class="inline-flex items-center gap-2">
          <input type="radio" checked={inputMode() === 'url'} onChange={() => setInputMode('url')} />
          {t('admin.articleUrl', 'Article URL')}
        </label>
      </div>
      <label class="block text-sm text-gray-700 dark:text-gray-300">
        {t('admin.optionalTitle', 'Optional title')}
        <input
          class={fieldClass}
          name="sourceTitle"
          value={form.values().sourceTitle}
          placeholder={t('admin.titlePlaceholder', 'Bored In Antalya')}
          disabled={analyze.isPending()}
          onInput={form.handleChange}
        />
      </label>
      <Show when={inputMode() === 'url'}>
        <label class="block text-sm text-gray-700 dark:text-gray-300">
          {t('admin.articleUrl', 'Article URL')}
          <input
            class={fieldClass}
            name="articleUrl"
            type="url"
            value={form.values().articleUrl}
            placeholder="https://"
            disabled={analyze.isPending()}
            onInput={form.handleChange}
          />
        </label>
      </Show>
      <Show when={inputMode() === 'text'}>
        <label class="block text-sm text-gray-700 dark:text-gray-300">
          {t('admin.articleText', 'Article text')}
          <textarea
            class={`${fieldClass} min-h-40`}
            name="articleText"
            value={form.values().articleText}
            placeholder={t('admin.articleTextPlaceholder', 'Paste the full article text here...')}
            disabled={analyze.isPending()}
            onInput={form.handleChange}
          />
        </label>
      </Show>
      <Show when={localError()}>
        {(message) => <p class="text-sm text-red-600">{message}</p>}
      </Show>
      <button type="submit" class={buttonClass} disabled={analyze.isPending()}>
        {analyze.isPending() ? t('admin.analyzing', 'Analyzing…') : t('admin.analyze', 'Analyze article')}
      </button>
    </form>
  );
}
