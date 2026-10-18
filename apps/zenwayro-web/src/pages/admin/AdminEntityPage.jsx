import { createSignal, For, Show } from 'grainlet';
import { useI18n } from 'grainlet/i18n';
import { useQuery } from 'grainlet/query';
import { Link, useParams } from 'grainlet/route';
import { apiClient, ENTITY_REGISTRY_PATHS } from '../../api.js';
import {
  AdminShell,
  adminText,
  buttonClass,
  DataRegion,
  fieldClass,
  secondaryButtonClass,
  useAdminAccess,
} from './AdminChrome.jsx';
import { errorText } from './admin-helpers.js';
import {
  buildEntityRecordListParams,
  canGoToNextPage,
  canGoToPreviousPage,
  ENTITY_DEFAULT_LIMIT,
  entityCreateHref,
  entityRecordHref,
  formatEntityCellValue,
  selectEntityTableFields,
} from './admin-helpers.js';

export function AdminEntityPage() {
  const access = useAdminAccess('admin');
  const params = useParams();
  const i18n = useI18n();
  const t = (key, fallback) => adminText(i18n, key, fallback);
  const entityKey = () => params().entityKey;
  return (
    <AdminShell access={access} showBack title={entityKey() || t('admin.entity', 'Entity')} description={t('admin.recordsIntro', 'Search and open records for this entity.')}>
      <Show when={entityKey()} fallback={<p class="text-sm text-red-600">{t('admin.missingEntity', 'Missing entity.')}</p>}>
        <RecordsBody entityKey={entityKey()} />
      </Show>
    </AdminShell>
  );
}

function RecordsBody(props) {
  const i18n = useI18n();
  const t = (key, fallback) => adminText(i18n, key, fallback);
  const [search, setSearch] = createSignal('');
  const [page, setPage] = createSignal(1);
  const schema = useQuery(() => ({
    queryKey: ['admin', 'entity-schema', props.entityKey],
    queryFn: ({ signal }) => apiClient.get(ENTITY_REGISTRY_PATHS.schema(props.entityKey), { signal }),
  }));
  const records = useQuery(() => ({
    queryKey: ['admin', 'entity-records', props.entityKey, page(), search().trim()],
    queryFn: ({ signal }) =>
      apiClient.get(ENTITY_REGISTRY_PATHS.records(props.entityKey), {
        signal,
        params: buildEntityRecordListParams(page(), search()),
      }),
  }));
  const fields = () => selectEntityTableFields(schema.data()?.schema);
  const items = () => records.data()?.items ?? [];
  const total = () => records.data()?.total ?? 0;
  const label = () => schema.data()?.schema?.label || props.entityKey;
  return (
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">{label()}</h2>
        <Show when={schema.data()?.schema?.capabilities?.create}>
          <Link href={entityCreateHref(props.entityKey)} class={buttonClass}>{t('admin.createRecord', 'Create')}</Link>
        </Show>
      </div>
      <Show when={schema.error()}>
        {(err) => <p class="text-sm text-red-600">{errorText(err, t('admin.schemaError', 'Could not load the entity schema.'))}</p>}
      </Show>
      <form
        class="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
        }}
      >
        <label class="min-w-64 flex-1 text-sm text-gray-700 dark:text-gray-300">
          {t('admin.search', 'Search')}
          <input
            class={fieldClass}
            value={search()}
            onInput={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
          />
        </label>
        <button type="submit" class={`${secondaryButtonClass} self-end`}>{t('admin.applyFilters', 'Apply filters')}</button>
      </form>
      <DataRegion
        pending={records.isPending() || schema.isPending()}
        error={records.error()}
        errorFallback={t('admin.recordsError', 'Could not load records.')}
        empty={items().length === 0}
        emptyText={t('admin.noRecords', 'No records.')}
      >
        <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table class="min-w-full text-left text-sm">
            <thead class="bg-gray-50 text-xs uppercase text-gray-600 dark:bg-gray-800">
              <tr>
                <For each={fields()}>{(field) => <th class="px-3 py-2">{field.label}</th>}</For>
              </tr>
            </thead>
            <tbody>
              <For each={items()}>
                {(record) => (
                  <tr class="border-t border-gray-100 dark:border-gray-800">
                    <For each={fields()}>
                      {(field) => (
                        <td class="px-3 py-2">
                          <Show when={field.name === schema.data()?.schema?.idField} fallback={<span>{formatEntityCellValue(record.values?.[field.name])}</span>}>
                            <Link class="text-indigo-600 hover:underline" href={entityRecordHref(props.entityKey, record.id)}>
                              {formatEntityCellValue(record.values?.[field.name]) || record.id}
                            </Link>
                          </Show>
                        </td>
                      )}
                    </For>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </DataRegion>
      <div class="flex items-center gap-3 text-sm">
        <button type="button" class={secondaryButtonClass} disabled={!canGoToPreviousPage(page())} onClick={() => setPage(page() - 1)}>{t('admin.previous', 'Previous')}</button>
        <span>{page()}</span>
        <button type="button" class={secondaryButtonClass} disabled={!canGoToNextPage(page(), records.data()?.limit ?? ENTITY_DEFAULT_LIMIT, total())} onClick={() => setPage(page() + 1)}>{t('admin.next', 'Next')}</button>
      </div>
    </div>
  );
}
