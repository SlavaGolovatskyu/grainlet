import { createSignal, For, Show } from 'grainlet';
import { useI18n } from 'grainlet/i18n';
import { useMutation, useQuery, useQueryClient } from 'grainlet/query';
import { apiClient, USERS_PATHS } from '../../api.js';
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
  ADMIN_USERS_PAGE_SIZE,
  buildAdminUsersParams,
  canDeleteUser,
  canGoToNextPage,
  canGoToPreviousPage,
  detailPageParams,
  errorText,
  formatTimestamp,
  toAssignableRoles,
  toggleRole,
} from './admin-helpers.js';

export function AdminUsersPage() {
  const access = useAdminAccess('admin');
  const i18n = useI18n();
  const t = (key, fallback) => adminText(i18n, key, fallback);
  return (
    <AdminShell
      access={access}
      showBack
      title={t('admin.usersTitle', 'Registered Users')}
      description={t('admin.usersIntro', 'Search and filter all registered users. Click a row to view details.')}
    >
      <UsersBody actor={access.profile.data()} />
    </AdminShell>
  );
}

function UsersBody(props) {
  const i18n = useI18n();
  const client = useQueryClient();
  const t = (key, fallback) => adminText(i18n, key, fallback);
  const [query, setQuery] = createSignal('');
  const [provider, setProvider] = createSignal('');
  const [emailVerified, setEmailVerified] = createSignal('');
  const [page, setPage] = createSignal(1);
  const [selectedId, setSelectedId] = createSignal(null);
  const [pendingDelete, setPendingDelete] = createSignal(null);
  const [notice, setNotice] = createSignal('');
  const [noticeError, setNoticeError] = createSignal(false);

  const filters = () => ({
    query: query(),
    provider: provider(),
    emailVerified: emailVerified(),
    page: page(),
    limit: ADMIN_USERS_PAGE_SIZE,
  });

  const stats = useQuery(() => ({
    queryKey: ['users', 'admin', 'stats'],
    queryFn: ({ signal }) => apiClient.get(USERS_PATHS.adminStats, { signal }),
  }));

  const list = useQuery(() => ({
    queryKey: ['admin-users', buildAdminUsersParams(filters())],
    queryFn: ({ signal }) =>
      apiClient.get(USERS_PATHS.adminList, { signal, params: buildAdminUsersParams(filters()) }),
  }));

  const roles = useMutation({
    mutationFn: ({ userId, nextRoles }) =>
      apiClient.patch(USERS_PATHS.adminRoles(userId), { roles: toAssignableRoles(nextRoles) }),
    onSuccess: (updated) => {
      setNotice(`${updated.email} ${t('admin.rolesSaved', 'roles saved successfully.')}`);
      setNoticeError(false);
      client.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error) => {
      setNotice(errorText(error, t('admin.rolesFailed', 'Could not save user roles.')));
      setNoticeError(true);
    },
  });

  const remove = useMutation({
    mutationFn: (userId) => apiClient.delete(USERS_PATHS.adminDelete(userId)),
    onSuccess: () => {
      setNotice(t('admin.userDeleted', 'User deleted.'));
      setNoticeError(false);
      setPendingDelete(null);
      setSelectedId(null);
      client.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error) => {
      setNotice(errorText(error, t('admin.deleteFailed', 'Could not delete this user.')));
      setNoticeError(true);
    },
  });

  const users = () => list.data()?.users ?? [];
  const total = () => list.data()?.total ?? 0;
  const selected = () => users().find((user) => user.id === selectedId()) ?? null;

  function changeFilter(setter, value) {
    setter(value);
    setPage(1);
  }

  return (
    <div class="space-y-6">
      <DataRegion
        pending={stats.isPending()}
        error={stats.error()}
        errorFallback={t('admin.statsError', 'Could not load user stats.')}
        empty={false}
      >
        <div class={panelClass}>
          <p class="text-xs uppercase tracking-wide text-gray-500">{t('admin.dailyActiveUsers', 'Daily active users')}</p>
          <p class="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{stats.data()?.dailyActiveUsers ?? 0}</p>
        </div>
      </DataRegion>
      <form class={panelClass} onSubmit={(event) => event.preventDefault()}>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            class={fieldClass}
            value={query()}
            placeholder={t('admin.userSearch', 'Search by email, name, username...')}
            onInput={(event) => changeFilter(setQuery, event.target.value)}
          />
          <select class={fieldClass} value={provider()} onChange={(event) => changeFilter(setProvider, event.target.value)}>
            <option value="">{t('admin.allProviders', 'All providers')}</option>
            <option value="local">Local</option>
            <option value="google">Google</option>
            <option value="github">GitHub</option>
          </select>
          <select class={fieldClass} value={emailVerified()} onChange={(event) => changeFilter(setEmailVerified, event.target.value)}>
            <option value="">{t('admin.verificationAll', 'Email verification: all')}</option>
            <option value="true">{t('admin.verifiedOnly', 'Verified only')}</option>
            <option value="false">{t('admin.unverifiedOnly', 'Unverified only')}</option>
          </select>
        </div>
      </form>
      <Show when={notice()}>
        {(message) => <p class={noticeError() ? 'text-sm text-red-600' : 'text-sm text-indigo-700'}>{message}</p>}
      </Show>
      <DataRegion
        pending={list.isPending()}
        error={list.error()}
        errorFallback={t('admin.usersError', 'Could not load users.')}
        empty={users().length === 0}
        emptyText={t('admin.noUsers', 'No users match these filters.')}
      >
        <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table class="min-w-full text-left text-sm">
            <thead class="bg-gray-50 text-xs uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              <tr>
                <th class="px-3 py-2">{t('admin.email', 'Email')}</th>
                <th class="px-3 py-2">{t('admin.name', 'Name')}</th>
                <th class="px-3 py-2">{t('admin.username', 'Username')}</th>
                <th class="px-3 py-2">{t('admin.provider', 'Provider')}</th>
                <th class="px-3 py-2">{t('admin.lastSeen', 'Last seen')}</th>
                <th class="px-3 py-2">{t('admin.verified', 'Verified')}</th>
                <th class="px-3 py-2">{t('nav.admin', 'Admin')}</th>
                <th class="px-3 py-2">{t('admin.editor', 'Content editor')}</th>
                <th class="px-3 py-2">{t('admin.contributor', 'Content contributor')}</th>
                <th class="px-3 py-2">{t('admin.delete', 'Delete')}</th>
              </tr>
            </thead>
            <tbody>
              <For each={users()}>
                {(user) => (
                  <tr class="cursor-pointer border-t border-gray-100 bg-white hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-900" onClick={() => setSelectedId(user.id)}>
                    <td class="px-3 py-2 text-gray-900 dark:text-white">{user.email}</td>
                    <td class="px-3 py-2">{user.name || '-'}</td>
                    <td class="px-3 py-2">{user.username || '-'}</td>
                    <td class="px-3 py-2 capitalize">{user.provider}</td>
                    <td class="px-3 py-2">{formatTimestamp(user.lastSeen)}</td>
                    <td class="px-3 py-2">{user.emailVerified ? t('admin.yes', 'Yes') : t('admin.no', 'No')}</td>
                    <td class="px-3 py-2">{user.isAdmin ? t('admin.yes', 'Yes') : t('admin.no', 'No')}</td>
                    <td class="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`${t('admin.editor', 'Content editor')} ${user.email}`}
                        checked={(user.roles ?? []).includes('content_editor')}
                        disabled={roles.isPending() || user.isAdmin}
                        onChange={(event) => roles.mutate({ userId: user.id, nextRoles: toggleRole(user.roles, 'content_editor', event.target.checked) })}
                      />
                    </td>
                    <td class="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`${t('admin.contributor', 'Content contributor')} ${user.email}`}
                        checked={(user.roles ?? []).includes('content_contributor')}
                        disabled={roles.isPending() || user.isAdmin}
                        onChange={(event) => roles.mutate({ userId: user.id, nextRoles: toggleRole(user.roles, 'content_contributor', event.target.checked) })}
                      />
                    </td>
                    <td class="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                      <button
                        type="button"
                        class="text-sm text-red-600 disabled:opacity-40"
                        disabled={!canDeleteUser(props.actor, user) || remove.isPending()}
                        onClick={() => setPendingDelete(user)}
                      >
                        {t('admin.delete', 'Delete')}
                      </button>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </DataRegion>
      <div class="flex items-center gap-3 text-sm">
        <button type="button" class={secondaryButtonClass} disabled={!canGoToPreviousPage(page())} onClick={() => setPage(page() - 1)}>
          {t('admin.previous', 'Previous')}
        </button>
        <span>{page()}</span>
        <button type="button" class={secondaryButtonClass} disabled={!canGoToNextPage(page(), ADMIN_USERS_PAGE_SIZE, total())} onClick={() => setPage(page() + 1)}>
          {t('admin.next', 'Next')}
        </button>
      </div>
      <Show when={selected()}>
        {(user) => <UserDetail user={user} actor={props.actor} rolesPending={roles.isPending()} onToggle={(role, checked) => roles.mutate({ userId: user.id, nextRoles: toggleRole(user.roles, role, checked) })} onClose={() => setSelectedId(null)} />}
      </Show>
      <Show when={pendingDelete()}>
        {(user) => (
          <div class={`${panelClass} space-y-3`}>
            <p class="text-sm text-gray-800 dark:text-gray-100">{t('admin.deleteConfirm', 'Delete this user?')} {user.email}</p>
            <div class="flex gap-2">
              <button type="button" class={buttonClass} disabled={remove.isPending()} onClick={() => remove.mutate(user.id)}>
                {remove.isPending() ? t('admin.deleting', 'Deleting...') : t('admin.delete', 'Delete')}
              </button>
              <button type="button" class={secondaryButtonClass} onClick={() => setPendingDelete(null)}>{t('adminPanel.popularTripGenerationCancel', 'Cancel')}</button>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
}

function UserDetail(props) {
  const i18n = useI18n();
  const t = (key, fallback) => adminText(i18n, key, fallback);
  const user = () => props.user;
  const trips = useQuery(() => ({
    queryKey: ['admin-user-trips', user().id],
    queryFn: ({ signal }) => apiClient.get(USERS_PATHS.adminTrips(user().id), { signal, params: detailPageParams() }),
  }));
  const popular = useQuery(() => ({
    queryKey: ['admin-user-popular-trips', user().id],
    queryFn: ({ signal }) => apiClient.get(USERS_PATHS.adminPopularTrips(user().id), { signal, params: detailPageParams() }),
  }));
  const reviews = useQuery(() => ({
    queryKey: ['admin-user-reviews', user().id],
    queryFn: ({ signal }) => apiClient.get(USERS_PATHS.adminPoiReviews(user().id), { signal, params: detailPageParams() }),
  }));
  return (
    <section class={`${panelClass} space-y-4`}>
      <div class="flex items-start justify-between gap-3">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">{user().email}</h2>
        <button type="button" class={secondaryButtonClass} onClick={props.onClose}>{t('admin.close', 'Close')}</button>
      </div>
      <dl class="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div><dt class="text-gray-500">{t('admin.username', 'Username')}</dt><dd>{user().username || '-'}</dd></div>
        <div><dt class="text-gray-500">{t('admin.provider', 'Provider')}</dt><dd class="capitalize">{user().provider}</dd></div>
        <div><dt class="text-gray-500">{t('admin.verified', 'Verified')}</dt><dd>{user().emailVerified ? t('admin.yes', 'Yes') : t('admin.no', 'No')}</dd></div>
        <div><dt class="text-gray-500">{t('nav.admin', 'Admin')}</dt><dd>{user().isAdmin ? t('admin.yes', 'Yes') : t('admin.no', 'No')}</dd></div>
        <div><dt class="text-gray-500">{t('admin.lastSeen', 'Last seen')}</dt><dd>{formatTimestamp(user().lastSeen)}</dd></div>
        <div><dt class="text-gray-500">{t('admin.userId', 'User ID')}</dt><dd class="break-all font-mono text-xs">{user().id}</dd></div>
      </dl>
      <Show when={props.actor?.isAdmin}>
        <div class="flex flex-wrap gap-4 text-sm">
          <label class="inline-flex items-center gap-2">
            <input type="checkbox" checked={(user().roles ?? []).includes('content_editor')} disabled={props.rolesPending || user().isAdmin} onChange={(event) => props.onToggle('content_editor', event.target.checked)} />
            {t('admin.editor', 'Content editor')}
          </label>
          <label class="inline-flex items-center gap-2">
            <input type="checkbox" checked={(user().roles ?? []).includes('content_contributor')} disabled={props.rolesPending || user().isAdmin} onChange={(event) => props.onToggle('content_contributor', event.target.checked)} />
            {t('admin.contributor', 'Content contributor')}
          </label>
        </div>
      </Show>
      <DetailList title={t('admin.trips', 'Trips')} pending={trips.isPending()} error={trips.error()} items={trips.data()?.trips ?? []} emptyText={t('admin.noTrips', 'No trips.')} render={(item) => `${item.city} · ${item.durationDays}d`} />
      <DetailList title={t('admin.popularTrips', 'Popular trips')} pending={popular.isPending()} error={popular.error()} items={popular.data()?.popularTrips ?? []} emptyText={t('admin.noPopular', 'No popular trips.')} render={(item) => `${item.city}, ${item.country}`} />
      <DetailList title={t('admin.reviews', 'Reviews')} pending={reviews.isPending()} error={reviews.error()} items={reviews.data()?.reviews ?? []} emptyText={t('admin.noReviews', 'No reviews.')} render={(item) => `${item.poiName}${item.stars != null ? ` · ${item.stars}` : ''}`} />
    </section>
  );
}

function DetailList(props) {
  const i18n = useI18n();
  return (
    <div>
      <h3 class="text-sm font-medium text-gray-900 dark:text-white">{props.title}</h3>
      <DataRegion pending={props.pending} error={props.error} errorFallback={adminText(i18n, 'admin.loadError', 'Could not load this list.')} empty={props.items.length === 0} emptyText={props.emptyText}>
        <ul class="mt-1 space-y-1 text-sm text-gray-700 dark:text-gray-200">
          <For each={props.items}>{(item) => <li>{props.render(item)}</li>}</For>
        </ul>
      </DataRegion>
    </div>
  );
}
