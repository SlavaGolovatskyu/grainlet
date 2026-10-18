import { createSignal, For, Show } from 'grainlet';
import { useI18n } from 'grainlet/i18n';
import { useMutation, useQuery, useQueryClient } from 'grainlet/query';
import { ADMIN_PATHS, apiClient, IMAGE_PATHS, POI_PATHS } from '../../api.js';
import {
  AdminShell,
  adminText,
  buttonClass,
  DataRegion,
  fieldClass,
  Notice,
  panelClass,
  secondaryButtonClass,
  useAdminAccess,
} from './AdminChrome.jsx';
import {
  ADMIN_IMAGES_POI_LIMIT,
  errorText,
  filterCities,
  filterPois,
  validateImageFile,
} from './admin-helpers.js';

export function AdminImagesPage() {
  const access = useAdminAccess('images');
  const i18n = useI18n();
  const t = (key, fallback) => adminText(i18n, key, fallback);
  return (
    <AdminShell
      access={access}
      showBack
      title={t('nav.contentImages', 'Manage Images')}
      description={t('admin.imagesIntro', 'Browse cities and POIs, filter by text, and upload or replace an image.')}
    >
      <ImagesBody />
    </AdminShell>
  );
}

async function loadCityPois(cityId, signal) {
  const aggregated = [];
  let offset = 0;
  for (;;) {
    const page = await apiClient.get(ADMIN_PATHS.adminCityPois(cityId), {
      signal,
      params: { limit: String(ADMIN_IMAGES_POI_LIMIT), offset: String(offset) },
    });
    const pois = page?.pois ?? [];
    aggregated.push(...pois);
    offset += pois.length;
    if (aggregated.length >= (page?.total ?? aggregated.length) || pois.length === 0) break;
  }
  return aggregated;
}

function ImagesBody() {
  const i18n = useI18n();
  const client = useQueryClient();
  const t = (key, fallback) => adminText(i18n, key, fallback);
  const [tab, setTab] = createSignal('city');
  const [cityFilter, setCityFilter] = createSignal('');
  const [parentFilter, setParentFilter] = createSignal('');
  const [poiFilter, setPoiFilter] = createSignal('');
  const [cityId, setCityId] = createSignal(null);
  const [poiCityId, setPoiCityId] = createSignal(null);
  const [poiId, setPoiId] = createSignal(null);
  const [notice, setNotice] = createSignal('');
  const [formError, setFormError] = createSignal('');

  const cities = useQuery(() => ({
    queryKey: ['pois', 'cities', 'all'],
    queryFn: ({ signal }) => apiClient.get(POI_PATHS.citiesAll, { signal }),
  }));

  const pois = useQuery(() => ({
    queryKey: ['admin', 'city-pois', poiCityId()],
    enabled: Boolean(poiCityId()),
    queryFn: ({ signal }) => loadCityPois(poiCityId(), signal),
  }));

  const uploadCity = useMutation({
    mutationFn: (body) => apiClient.post(IMAGE_PATHS.cityUpload, body),
    onSuccess: () => {
      setNotice(t('admin.cityImageUploaded', 'City image uploaded successfully'));
      setFormError('');
      setCityId(null);
      client.invalidateQueries({ queryKey: ['pois', 'cities', 'all'] });
    },
    onError: (error) => {
      setNotice('');
      setFormError(errorText(error, t('admin.cityImageFailed', 'City image upload failed')));
    },
  });

  const uploadPoi = useMutation({
    mutationFn: (body) => apiClient.post(IMAGE_PATHS.poiUpload, body),
    onSuccess: () => {
      setNotice(t('admin.poiImageUploaded', 'POI image uploaded successfully'));
      setFormError('');
      setPoiId(null);
      client.invalidateQueries({ queryKey: ['admin', 'city-pois', poiCityId()] });
    },
    onError: (error) => {
      setNotice('');
      setFormError(errorText(error, t('admin.poiImageFailed', 'POI image upload failed')));
    },
  });

  const cityRows = () => filterCities(cities.data() ?? [], cityFilter());
  const parentRows = () => filterCities(cities.data() ?? [], parentFilter());
  const poiRows = () => filterPois(pois.data() ?? [], poiFilter());
  const selectedCity = () => (cities.data() ?? []).find((city) => city.id === cityId());
  const selectedPoi = () => (pois.data() ?? []).find((poi) => poi.id === poiId());

  function submitFile(file, targetId, field, mutation) {
    const validation = validateImageFile(file);
    if (validation) {
      setFormError(validation);
      setNotice('');
      return;
    }
    const body = new FormData();
    body.append('file', file);
    body.append(field, targetId);
    setFormError('');
    mutation.mutate(body);
  }

  return (
    <div class="space-y-6">
      <Notice message={notice()} />
      <Show when={formError()}>
        {(message) => <p class="text-sm text-red-600">{message}</p>}
      </Show>
      <div class="flex gap-2">
        <button type="button" class={tab() === 'city' ? buttonClass : secondaryButtonClass} onClick={() => setTab('city')}>
          {t('admin.citiesTab', 'Cities')}
        </button>
        <button type="button" class={tab() === 'poi' ? buttonClass : secondaryButtonClass} onClick={() => setTab('poi')}>
          {t('admin.poisTab', 'POIs')}
        </button>
      </div>
      <Show when={tab() === 'city'}>
        <section class="space-y-3">
          <label class="block text-sm text-gray-700 dark:text-gray-300">
            {t('admin.filterCities', 'Filter cities')}
            <input
              class={fieldClass}
              value={cityFilter()}
              placeholder={t('admin.filterCitiesPlaceholder', 'Filter cities by name, country, or ID…')}
              onInput={(event) => setCityFilter(event.target.value)}
            />
          </label>
          <DataRegion
            pending={cities.isPending()}
            error={cities.error()}
            errorFallback={t('admin.citiesError', 'Could not load cities.')}
            empty={cityRows().length === 0}
            emptyText={t('admin.noCities', 'No cities match this filter.')}
          >
            <ImageTable
              rows={cityRows()}
              onOpen={(id) => {
                setCityId(id);
                setFormError('');
                setNotice('');
              }}
            />
          </DataRegion>
          <Show when={selectedCity()}>
            {(city) => (
              <UploadForm
                title={`${t('admin.uploadCityImage', 'Upload city image')} — ${city.name}`}
                pending={uploadCity.isPending()}
                onClose={() => setCityId(null)}
                onFile={(file) => submitFile(file, city.id, 'cityId', uploadCity)}
              />
            )}
          </Show>
        </section>
      </Show>
      <Show when={tab() === 'poi'}>
        <section class="space-y-4">
          <label class="block text-sm text-gray-700 dark:text-gray-300">
            {t('admin.filterParentCities', 'Find a city')}
            <input
              class={fieldClass}
              value={parentFilter()}
              placeholder={t('admin.filterParentPlaceholder', 'Filter to find a city, then click a row to load its POIs…')}
              onInput={(event) => setParentFilter(event.target.value)}
            />
          </label>
          <DataRegion
            pending={cities.isPending()}
            error={cities.error()}
            errorFallback={t('admin.citiesError', 'Could not load cities.')}
            empty={parentRows().length === 0}
            emptyText={t('admin.noCities', 'No cities match this filter.')}
          >
            <ImageTable
              rows={parentRows()}
              selectedId={poiCityId()}
              onOpen={(id) => {
                setPoiCityId(id);
                setPoiId(null);
                setPoiFilter('');
                setFormError('');
              }}
            />
          </DataRegion>
          <Show when={poiCityId()}>
            <label class="block text-sm text-gray-700 dark:text-gray-300">
              {t('admin.filterPois', 'Filter POIs')}
              <input
                class={fieldClass}
                value={poiFilter()}
                placeholder={t('admin.filterPoisPlaceholder', 'Filter POIs by name, category, or ID…')}
                onInput={(event) => setPoiFilter(event.target.value)}
              />
            </label>
            <DataRegion
              pending={pois.isPending()}
              error={pois.error()}
              errorFallback={t('admin.poisError', 'Could not load POIs for this city.')}
              empty={!pois.isPending() && poiRows().length === 0}
              emptyText={t('admin.noPois', 'No POIs match this filter.')}
            >
              <ImageTable
                rows={poiRows()}
                showCategory
                onOpen={(id) => {
                  const poi = (pois.data() ?? []).find((item) => item.id === id);
                  if (poi?.canManagePoi === false) return;
                  setPoiId(id);
                  setFormError('');
                  setNotice('');
                }}
              />
            </DataRegion>
          </Show>
          <Show when={selectedPoi()}>
            {(poi) => (
              <UploadForm
                title={`${t('admin.uploadPoiImage', 'Upload POI image')} — ${poi.name}`}
                pending={uploadPoi.isPending()}
                onClose={() => setPoiId(null)}
                onFile={(file) => submitFile(file, poi.id, 'poiId', uploadPoi)}
              />
            )}
          </Show>
        </section>
      </Show>
    </div>
  );
}

function ImageTable(props) {
  const i18n = useI18n();
  const t = (key, fallback) => adminText(i18n, key, fallback);
  return (
    <div class="max-h-[min(60vh,560px)] overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table class="min-w-full text-left text-sm">
        <thead class="sticky top-0 bg-gray-50 text-xs uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          <tr>
            <th class="px-3 py-2">{t('admin.image', 'Image')}</th>
            <th class="px-3 py-2">{t('admin.name', 'Name')}</th>
            <Show when={props.showCategory}>
              <th class="px-3 py-2">{t('admin.category', 'Category')}</th>
            </Show>
            <th class="px-3 py-2">{t('admin.country', 'Country')}</th>
          </tr>
        </thead>
        <tbody>
          <For each={props.rows}>
            {(row) => (
              <tr
                class={`cursor-pointer border-t border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/80 ${props.selectedId === row.id ? 'bg-indigo-50 dark:bg-indigo-950/40' : ''}`}
                onClick={() => props.onOpen(row.id)}
              >
                <td class="px-3 py-2">
                  <Show when={row.imageCdnUrl || row.photoUrl} fallback={<span class="inline-block h-11 w-11 rounded-md bg-gray-100 dark:bg-gray-800" />}>
                    {(url) => <img src={url} alt="" class="h-11 w-11 rounded-md object-cover" />}
                  </Show>
                </td>
                <td class="px-3 py-2 text-gray-900 dark:text-white">{row.name}</td>
                <Show when={props.showCategory}>
                  <td class="px-3 py-2 text-gray-600 dark:text-gray-300">{row.category}</td>
                </Show>
                <td class="px-3 py-2 text-gray-600 dark:text-gray-300">{row.country || row.city}</td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}

function UploadForm(props) {
  const i18n = useI18n();
  const t = (key, fallback) => adminText(i18n, key, fallback);
  return (
    <form class={`${panelClass} space-y-3`} onSubmit={(event) => event.preventDefault()}>
      <h2 class="text-base font-semibold text-gray-900 dark:text-white">{props.title}</h2>
      <label class="block text-sm text-gray-700 dark:text-gray-300">
        {t('admin.imageFile', 'PNG or JPEG, 10MB or smaller')}
        <input
          class={`${fieldClass} file:mr-3`}
          type="file"
          accept="image/png,image/jpeg"
          disabled={props.pending}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) props.onFile(file);
          }}
        />
      </label>
      <button type="button" class={secondaryButtonClass} disabled={props.pending} onClick={props.onClose}>
        {t('admin.close', 'Close')}
      </button>
    </form>
  );
}
