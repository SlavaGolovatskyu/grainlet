import { For } from 'grainlet';
import { useI18n } from 'grainlet/i18n';
import { useQuery } from 'grainlet/query';
import { Link } from 'grainlet/route';
import { apiClient, ENTITY_REGISTRY_PATHS } from '../../api.js';
import {
  AdminShell,
  adminText,
  DataRegion,
  panelClass,
  useAdminAccess,
} from './AdminChrome.jsx';
import { entityCapabilitiesLabel, entityRecordsHref } from './admin-helpers.js';

export function AdminEntitiesPage() {
  const access = useAdminAccess('admin');
  const i18n = useI18n();
  const t = (key, fallback) => adminText(i18n, key, fallback);
  return (
    <AdminShell
      access={access}
      showBack
      title={t('admin.nav.entities', 'Entity registry')}
      description={t('admin.entitiesIntro', 'Edit registered backend entities from one screen.')}
    >
      <EntitiesBody />
    </AdminShell>
  );
}

function EntitiesBody() {
  const i18n = useI18n();
  const t = (key, fallback) => adminText(i18n, key, fallback);
  const entities = useQuery(() => ({
    queryKey: ['admin', 'entities'],
    queryFn: ({ signal }) => apiClient.get(ENTITY_REGISTRY_PATHS.entities, { signal }),
  }));
  const items = () => entities.data()?.entities ?? [];
  return (
    <DataRegion
      pending={entities.isPending()}
      error={entities.error()}
      errorFallback={t('admin.entitiesError', 'Could not load entities.')}
      empty={items().length === 0}
      emptyText={t('admin.noEntities', 'No registered entities.')}
    >
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <For each={items()}>
          {(entity) => (
            <Link href={entityRecordsHref(entity.key)} class={`${panelClass} block hover:border-indigo-500`}>
              <h2 class="text-base font-semibold text-gray-900 dark:text-white">{entity.label}</h2>
              <p class="text-xs text-gray-500">{entity.key}</p>
              <p class="mt-2 text-sm text-gray-500">{entityCapabilitiesLabel(entity.capabilities)}</p>
            </Link>
          )}
        </For>
      </div>
    </DataRegion>
  );
}
