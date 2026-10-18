import { For } from 'grainlet';
import { useI18n } from 'grainlet/i18n';
import { useQuery } from 'grainlet/query';
import { Link } from 'grainlet/route';
import { ADMIN_PATHS, apiClient } from '../../api.js';
import {
  AdminShell,
  adminText,
  DataRegion,
  panelClass,
  useAdminAccess,
} from './AdminChrome.jsx';
import { articleRunHref, articleRunTitle, formatTimestamp } from './admin-helpers.js';

export function AdminArticleImportRunsPage() {
  const access = useAdminAccess('admin');
  const i18n = useI18n();
  const t = (key, fallback) => adminText(i18n, key, fallback);
  return (
    <AdminShell
      access={access}
      showBack
      title={t('admin.nav.articleImportRuns', 'Article import drafts')}
      description={t('admin.runsIntro', 'Resume saved analyze runs without re-calling AI.')}
    >
      <RunsBody />
    </AdminShell>
  );
}

function RunsBody() {
  const i18n = useI18n();
  const t = (key, fallback) => adminText(i18n, key, fallback);
  const runs = useQuery(() => ({
    queryKey: ['admin', 'article-import', 'runs'],
    queryFn: ({ signal }) => apiClient.get(ADMIN_PATHS.articleImportRuns, { signal }),
  }));
  const items = () => runs.data()?.runs ?? [];
  return (
    <DataRegion
      pending={runs.isPending()}
      error={runs.error()}
      errorFallback={t('admin.runsError', 'Could not load import runs.')}
      empty={items().length === 0}
      emptyText={t('admin.noRuns', 'No saved runs yet. Analyze an article to create one.')}
    >
      <ul class="space-y-3">
        <For each={items()}>
          {(run) => (
            <li>
              <Link href={articleRunHref(run.id)} class={`${panelClass} block hover:border-indigo-500`}>
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p class="font-medium text-gray-900 dark:text-white">{articleRunTitle(run)}</p>
                    <p class="mt-1 text-sm text-gray-500">
                      {run.cityName}, {run.country}
                    </p>
                  </div>
                  <span class={run.status === 'open' ? 'text-xs font-semibold uppercase text-amber-700' : 'text-xs font-semibold uppercase text-green-700'}>
                    {run.status}
                  </span>
                </div>
                <p class="mt-2 text-xs text-gray-500">
                  {run.readyCount} {t('admin.readyCount', 'ready')} · {run.needsReviewCount} {t('admin.needsReview', 'need review')}
                  {run.duplicateCount > 0 ? ` · ${run.duplicateCount} ${t('admin.duplicates', 'duplicates')}` : ''} · {formatTimestamp(run.updatedAt)}
                </p>
              </Link>
            </li>
          )}
        </For>
      </ul>
    </DataRegion>
  );
}
