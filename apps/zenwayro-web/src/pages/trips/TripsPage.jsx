import { createSignal, For, Show } from 'grainlet';
import { useSession } from 'grainlet/auth';
import { useI18n } from 'grainlet/i18n';
import { useMutation, useQuery, useQueryClient } from 'grainlet/query';
import { Link } from 'grainlet/route';
import { apiClient } from '../../api/client.js';
import { NOTIFICATION_PATHS } from '../../api/paths/notification.js';
import { TRIP_PATHS } from '../../api/paths/trip.js';
import { USERS_PATHS } from '../../api/paths/users.js';
import { translateApp } from '../../i18n.js';
import { ROUTE_AUTH_SIGNIN, ROUTE_PLAN_NEW, ROUTE_SETTINGS, routePlanById } from '../../routes.js';
import {
  SCOPE_TABS,
  STATUS_LABEL_KEYS,
  TRIP_FILTERS,
  TRIP_LIST_STATUS,
  coverPhotoSrc,
  filterTrips,
  formatDashboardTripDates,
  pageNumbers,
  sharedByLabel,
  sortTrips,
  toTripCard,
  showAddTripCta,
  showPendingInvitations,
  todayIso,
  tripDashboardStatus,
  tripListQueryKey,
  tripTitle,
  tripsEmptyState,
  tripsListParams,
  tripsListPath,
} from './helpers.js';

const STATUS_CLASS = {
  [TRIP_LIST_STATUS.UPCOMING]: 'bg-emerald-100 text-emerald-700',
  [TRIP_LIST_STATUS.PAST]: 'bg-gray-100 text-gray-500',
  [TRIP_LIST_STATUS.PLANNING]: 'bg-orange-100 text-orange-600',
};

const EMPTY_STATS = { trips: 0, countries: 0, days: 0 };

function shown(value) {
  return typeof value === 'function' ? value() : value;
}

export function TripsPage() {
  const session = useSession();
  const i18n = useI18n();
  const queryClient = useQueryClient();
  const t = (key, variables) => translateApp(i18n, key, variables);

  const [scope, setScope] = createSignal('mine');
  const [status, setStatus] = createSignal(TRIP_LIST_STATUS.ALL);
  const [page, setPage] = createSignal(1);
  const [notificationsOpen, setNotificationsOpen] = createSignal(false);
  const [notice, setNotice] = createSignal(null);
  const [acceptingId, setAcceptingId] = createSignal(null);
  const [dismissingId, setDismissingId] = createSignal(null);
  const [brokenCovers, setBrokenCovers] = createSignal({});

  const authenticated = () => session.status() === 'authenticated';

  const list = useQuery(() => {
    const currentScope = scope();
    const currentPage = page();
    const currentStatus = status();
    const path = tripsListPath(currentScope);
    return {
      queryKey: tripListQueryKey(currentScope, currentPage, currentStatus),
      queryFn: ({ signal }) =>
        apiClient.get(path, {
          signal,
          params: tripsListParams(currentPage, currentStatus),
        }),
      enabled: authenticated(),
    };
  });

  const statsQuery = useQuery(() => ({
    queryKey: [TRIP_PATHS.stats],
    queryFn: ({ signal }) => apiClient.get(TRIP_PATHS.stats, { signal }),
    enabled: authenticated(),
  }));

  const invitationsQuery = useQuery(() => ({
    queryKey: [TRIP_PATHS.invitationsPendingMe],
    queryFn: ({ signal }) => apiClient.get(TRIP_PATHS.invitationsPendingMe, { signal }),
    enabled: authenticated(),
  }));

  const profileQuery = useQuery(() => ({
    queryKey: [USERS_PATHS.me],
    queryFn: ({ signal }) => apiClient.get(USERS_PATHS.me, { signal }),
    enabled: authenticated(),
  }));

  const notificationsQuery = useQuery(() => ({
    queryKey: [NOTIFICATION_PATHS.list],
    queryFn: ({ signal }) => apiClient.get(NOTIFICATION_PATHS.list, { signal }),
    enabled: authenticated(),
  }));

  const unreadQuery = useQuery(() => ({
    queryKey: [NOTIFICATION_PATHS.unreadCount],
    queryFn: ({ signal }) => apiClient.get(NOTIFICATION_PATHS.unreadCount, { signal }),
    enabled: authenticated(),
  }));

  function invalidateTripLists() {
    queryClient.invalidateQueries({ queryKey: [TRIP_PATHS.root] });
    queryClient.invalidateQueries({ queryKey: [TRIP_PATHS.sharedWithMe] });
    queryClient.invalidateQueries({ queryKey: [TRIP_PATHS.invitationsPendingMe] });
    queryClient.invalidateQueries({ queryKey: [NOTIFICATION_PATHS.list] });
    queryClient.invalidateQueries({ queryKey: [NOTIFICATION_PATHS.unreadCount] });
  }

  const acceptInvite = useMutation({
    mutationFn: (invitationId) => apiClient.post(TRIP_PATHS.acceptInvitation(invitationId)),
    onSuccess: () => invalidateTripLists(),
  });

  const dismissNotification = useMutation({
    mutationFn: (notificationId) => apiClient.patch(NOTIFICATION_PATHS.readById(notificationId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATION_PATHS.list] });
      queryClient.invalidateQueries({ queryKey: [NOTIFICATION_PATHS.unreadCount] });
    },
  });

  function handleScope(next) {
    setScope(next);
    setStatus(TRIP_LIST_STATUS.ALL);
    setPage(1);
  }

  function handleFilter(next) {
    setStatus(next);
    setPage(1);
  }

  function acceptInvitation(invitationId) {
    setAcceptingId(invitationId);
    setNotice(null);
    acceptInvite.mutate(invitationId, {
      onSuccess: () => {
        setAcceptingId(null);
        setNotice({ tone: 'success', text: t('notifications.acceptSuccess') });
      },
      onError: (error) => {
        setAcceptingId(null);
        setNotice({
          tone: 'error',
          text: error?.message || t('notifications.acceptError'),
        });
      },
    });
  }

  function dismiss(notificationId) {
    setDismissingId(notificationId);
    dismissNotification.mutate(notificationId, {
      onSuccess: () => setDismissingId(null),
      onError: (error) => {
        setDismissingId(null);
        setNotice({
          tone: 'error',
          text: error?.message || t('notifications.dismissError'),
        });
      },
    });
  }

  function listLoading() {
    return list.isPending() || list.isLoading();
  }

  function listFailed() {
    return Boolean(list.error());
  }

  function invitations() {
    const data = invitationsQuery.data();
    return Array.isArray(data) ? data : [];
  }

  function displayRows() {
    const today = todayIso();
    const items = list.data()?.items;
    const cards = sortTrips(
      filterTrips((Array.isArray(items) ? items : []).map(toTripCard), status(), today)
    );
    return cards.map((trip) => {
      const dashboardStatus = tripDashboardStatus(trip, today);
      return {
        id: trip.id,
        href: routePlanById(trip.id),
        title: tripTitle(trip.city),
        src: coverPhotoSrc(trip.coverPhoto),
        notes: trip.notes?.trim() || '',
        status: dashboardStatus,
        statusLabel: t(STATUS_LABEL_KEYS[dashboardStatus]),
        statusClass: STATUS_CLASS[dashboardStatus],
        dateLabel: formatDashboardTripDates(trip.startDate, trip.endDate) || t('trips.datesTbd'),
        durationDays: trip.durationDays,
        sharedBy: sharedByLabel(trip.sharedBy),
      };
    });
  }

  function totalPages() {
    const value = list.data()?.totalPages;
    return typeof value === 'number' && value > 0 ? value : 1;
  }

  function stats() {
    return statsQuery.data() ?? EMPTY_STATS;
  }

  function unreadNotifications() {
    const items = notificationsQuery.data()?.items;
    if (!Array.isArray(items)) return [];
    return items.filter((notification) => !notification.readAt);
  }

  return (
    <Show
      when={session.status() === 'loading'}
      fallback={session.status() === 'authenticated' ? dashboard() : signInPrompt()}
    >
      <div class="flex min-h-[60vh] items-center justify-center">
        <span
          class="inline-block h-10 w-10 animate-spin rounded-full border-2 border-muted border-t-[#0f1b3d]"
          role="status"
        />
      </div>
    </Show>
  );

  function signInPrompt() {
    return (
      <div class="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-4">
        <p class="text-gray-500 dark:text-gray-400">{t('trips.signInPrompt')}</p>
        <Link
          href={ROUTE_AUTH_SIGNIN}
          class="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {t('nav.signIn')}
        </Link>
      </div>
    );
  }

  function dashboard() {
    const loading = listLoading();
    const failed = listFailed();
    const tripRows = displayRows();
    const pending = invitations();
    const empty = tripsEmptyState({
      scope: scope(),
      count: tripRows.length,
      isLoading: loading,
      hasError: failed,
    });
    const addTrip = showAddTripCta({
      scope: scope(),
      count: tripRows.length,
      isLoading: loading,
      hasError: failed,
    });
    const showInvites = showPendingInvitations({
      scope: scope(),
      count: pending.length,
      isLoading: loading,
      hasError: failed,
    });
    const sessionUser = session.data()?.user ?? {};
    const userName = sessionUser.name?.trim() || sessionUser.email || '';
    const userImage = profileQuery.data()?.profileImageUrl ?? sessionUser.image;
    const userInitial = userName.charAt(0).toUpperCase();
    const statItems = [
      { label: t('trips.statTrips'), value: String(stats().trips ?? 0) },
      { label: t('trips.statCountries'), value: String(stats().countries ?? 0) },
      { label: t('trips.statDays'), value: String(stats().days ?? 0) },
    ];
    const pages = pageNumbers(page(), totalPages()).map((n, index) => ({
      key: n == null ? `ellipsis-${index}` : `page-${n}`,
      n,
    }));

    return (
      <div class="zenwayro-v2-ui min-h-full bg-background">
        <div class="voyage-gradient pb-8 pt-12">
          <div class="mx-auto w-full max-w-5xl px-4">
            <div class="mb-6 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <Show
                  when={userImage}
                  fallback={
                    <div class="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/30 bg-white/20 text-sm font-bold text-white">
                      {userInitial}
                    </div>
                  }
                >
                  <img
                    src={userImage}
                    alt=""
                    class="h-11 w-11 rounded-full border-2 border-white/30 object-cover"
                  />
                </Show>
                <div>
                  <p class="text-xs font-medium text-white/70">{t('trips.welcomeBack')}</p>
                  <p class="text-lg font-bold leading-tight text-white">{userName}</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="glass relative flex h-10 w-10 items-center justify-center rounded-xl"
                  aria-label={t('trips.notifications')}
                  onClick={() => setNotificationsOpen(true)}
                >
                  <IconBell />
                  <Show when={Number(unreadQuery.data()?.count) > 0}>
                    <span class="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#ff6b4a]" />
                  </Show>
                </button>
                <Link
                  href={ROUTE_SETTINGS}
                  class="glass flex h-10 w-10 items-center justify-center rounded-xl"
                  aria-label={t('nav.settings')}
                >
                  <IconSettings />
                </Link>
              </div>
            </div>
            <Show when={notificationsOpen()}>{() => notificationsPanel()}</Show>
            <div class="grid grid-cols-3 gap-3">
              <For each={statItems}>
                {(item) => (
                  <div class="glass rounded-2xl p-3 text-center">
                    <p class="text-xl font-bold text-white">{item.value}</p>
                    <p class="mt-0.5 text-xs text-white/60">{item.label}</p>
                  </div>
                )}
              </For>
            </div>
          </div>
        </div>

        <div class="mx-auto w-full max-w-5xl px-4">
          <div class="mb-4 mt-5 flex items-center rounded-2xl bg-muted p-1">
            <For each={SCOPE_TABS}>
              {(tab) => (
                <button
                  type="button"
                  onClick={() => handleScope(tab.key)}
                  class={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 ${
                    scope() === tab.key
                      ? 'bg-white text-foreground shadow-sm'
                      : 'text-muted-foreground'
                  }`}
                >
                  {t(tab.labelKey)}
                </button>
              )}
            </For>
          </div>

          <div class="no-scrollbar mb-5 flex gap-2 overflow-x-auto pb-1">
            <For each={TRIP_FILTERS}>
              {(filter) => (
                <button
                  type="button"
                  onClick={() => handleFilter(filter.key)}
                  class={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                    status() === filter.key
                      ? 'bg-[#0f1b3d] text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {t(filter.labelKey)}
                </button>
              )}
            </For>
          </div>

          <Show when={notice()}>
            {(item) => {
              const message = shown(item);
              return (
                <p
                  class={
                    message.tone === 'error'
                      ? 'mb-4 text-center text-sm text-red-500 dark:text-red-400'
                      : 'mb-4 text-center text-sm text-emerald-700'
                  }
                  role="status"
                >
                  {message.text}
                </p>
              );
            }}
          </Show>

          <Show when={showInvites}>
            <section class="mb-5 rounded-2xl border border-border bg-white p-4 shadow-sm">
              <h2 class="text-sm font-semibold text-foreground">{t('trips.pendingInvitations')}</h2>
              <ul class="mt-3 space-y-2">
                <For each={pending} keyed={(item) => item.invitationId}>
                  {(invitation) => (
                    <li class="flex items-center justify-between rounded-xl border border-border px-3 py-2">
                      <div class="min-w-0">
                        <p class="truncate text-sm font-medium text-foreground">
                          {invitation.tripCity}
                        </p>
                        <p class="text-xs text-muted-foreground">
                          {t('trips.daysTag', { count: String(invitation.tripDurationDays) })}
                        </p>
                      </div>
                      <button
                        type="button"
                        class="cursor-pointer rounded-lg bg-[#0f1b3d] px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => acceptInvitation(invitation.invitationId)}
                        disabled={acceptInvite.isPending()}
                      >
                        {t('notifications.accept')}
                      </button>
                    </li>
                  )}
                </For>
              </ul>
            </section>
          </Show>

          <Show when={loading}>
            <div class="mt-12 flex items-center justify-center">
              <span
                class="inline-block h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-[#0f1b3d]"
                role="status"
              />
            </div>
          </Show>
          <Show when={failed}>
            <p class="mt-8 text-center text-sm text-red-500 dark:text-red-400">
              {t('trips.loadError')}
            </p>
          </Show>

          <Show when={empty.visible}>
            <div class="py-12 text-center">
              <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-muted">
                <IconMapPin size={28} class="text-muted-foreground" />
              </div>
              <p class="text-base font-bold text-foreground">{t(empty.titleKey)}</p>
              <Show when={empty.subtitleKey}>
                <p class="mt-1 text-sm text-muted-foreground">{t(empty.subtitleKey)}</p>
              </Show>
              <Show when={empty.showAction}>
                <Link href={ROUTE_PLAN_NEW} class="mt-4 block">
                  <span class="coral-gradient mt-4 inline-flex rounded-xl border-0 px-6 py-5 font-semibold text-white">
                    {t(empty.actionKey)}
                  </span>
                </Link>
              </Show>
            </div>
          </Show>

          <Show when={!loading && !failed && tripRows.length > 0}>
            <div class="flex flex-col gap-3">
              <For each={tripRows}>
                {(row) => (
                  <Link
                    href={row.href}
                    class="flex items-center gap-3 overflow-hidden rounded-2xl border border-border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div class="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                      <Show
                        when={row.src && !brokenCovers()[row.id]}
                        fallback={
                          <div class="flex h-full w-full items-center justify-center">
                            <IconMapPin size={24} class="text-muted-foreground/40" />
                          </div>
                        }
                      >
                        <img
                          src={row.src}
                          alt={row.title}
                          class="h-full w-full object-cover"
                          onError={() =>
                            setBrokenCovers((current) =>
                              current[row.id] ? current : { ...current, [row.id]: true }
                            )
                          }
                        />
                      </Show>
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="flex items-start gap-2">
                        <div class="min-w-0 flex-1">
                          <h3 class="truncate text-base font-bold leading-tight text-foreground">
                            {row.title}
                          </h3>
                          <Show when={row.notes}>
                            <p class="mt-0.5 truncate text-xs text-muted-foreground">{row.notes}</p>
                          </Show>
                        </div>
                        <span
                          class={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold leading-none ${row.statusClass}`}
                        >
                          {row.statusLabel}
                        </span>
                      </div>
                      <div class="mt-2.5 flex items-center gap-3">
                        <div class="flex items-center gap-1">
                          <IconCalendar />
                          <span class="text-xs text-muted-foreground">{row.dateLabel}</span>
                        </div>
                        <div class="flex items-center gap-1">
                          <IconMapPin size={11} class="text-[#ff6b4a]" />
                          <span class="text-xs font-semibold text-[#ff6b4a]">{row.durationDays}d</span>
                        </div>
                      </div>
                      <Show when={scope() === 'shared' && row.sharedBy}>
                        <p class="mt-1 text-xs text-muted-foreground">
                          {t('trips.sharedByPrefix')}{' '}
                          <span class="font-semibold text-foreground">{row.sharedBy}</span>
                        </p>
                      </Show>
                    </div>
                    <IconChevron />
                  </Link>
                )}
              </For>
            </div>
            <Show when={totalPages() > 1}>
              <nav class="mt-8 flex items-center justify-center gap-1" aria-label="Pagination">
                <button
                  type="button"
                  disabled={page() <= 1}
                  onClick={() => setPage(page() - 1)}
                  class="cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  ‹
                </button>
                <For each={pages}>
                  {(item) =>
                    item.n == null ? (
                      <span class="select-none px-1.5 text-gray-400 dark:text-gray-600">…</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPage(item.n)}
                        class={`min-w-9 cursor-pointer rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                          item.n === page()
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                        }`}
                      >
                        {item.n}
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
                  ›
                </button>
              </nav>
            </Show>
          </Show>

          <Show when={addTrip}>
            <Link href={ROUTE_PLAN_NEW} class="mt-5 block">
              <div class="group flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-border p-4 transition-colors hover:border-[#ff6b4a]">
                <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-muted transition-colors group-hover:bg-orange-50">
                  <IconPlus />
                </div>
                <div>
                  <p class="text-sm font-semibold text-foreground">{t('trips.addNewTrip')}</p>
                  <p class="mt-0.5 text-xs text-muted-foreground">{t('trips.addNewTripSubtitle')}</p>
                </div>
              </div>
            </Link>
          </Show>
          <div class="h-4" />
        </div>
      </div>
    );
  }

  function notificationsPanel() {
    const items = unreadNotifications();
    const loading = notificationsQuery.isPending() || notificationsQuery.isLoading();
    return (
      <div class="fixed inset-x-0 bottom-0 top-0 z-[60]">
        <button
          type="button"
          class="absolute inset-0 bg-black/40 dark:bg-black/60"
          onClick={() => setNotificationsOpen(false)}
          aria-label={t('nav.closeMenu')}
        />
        <section
          class="relative z-10 mx-auto flex max-h-[min(24rem,calc(100vh-4rem))] w-full max-w-3xl flex-col overflow-hidden border-b border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-950"
          role="dialog"
          aria-modal="true"
          aria-label={t('notifications.title')}
        >
          <div class="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
            <h2 class="text-lg font-bold text-gray-900 dark:text-white">{t('notifications.title')}</h2>
            <button
              type="button"
              onClick={() => setNotificationsOpen(false)}
              class="rounded-md p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
              aria-label={t('nav.closeMenu')}
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="overflow-y-auto px-4 py-4">
            <Show when={loading}>
              <p class="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
            </Show>
            <Show when={!loading && items.length === 0}>
              <p class="text-sm text-gray-500 dark:text-gray-400">{t('notifications.empty')}</p>
            </Show>
            <Show when={!loading && items.length > 0}>
              <ul class="space-y-3">
                <For each={items}>
                  {(notification) => {
                    const payload = notification.payload ?? {};
                    const busy =
                      acceptingId() === payload.invitationId || dismissingId() === notification.id;
                    return (
                      <li class="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
                        <div class="flex items-start justify-between gap-3">
                          <div class="min-w-0">
                            <p class="text-sm font-semibold text-gray-900 dark:text-white">
                              {t('notifications.tripInvitation')}
                            </p>
                            <p class="mt-1 text-sm text-gray-700 dark:text-gray-200">{payload.tripCity}</p>
                            <p class="text-xs text-gray-500 dark:text-gray-400">
                              {t('trips.daysTag', { count: String(payload.tripDurationDays) })}
                            </p>
                          </div>
                          <div class="flex shrink-0 flex-col gap-2 sm:flex-row">
                            <button
                              type="button"
                              onClick={() => dismiss(notification.id)}
                              disabled={busy}
                              class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                            >
                              {t('notifications.dismiss')}
                            </button>
                            <button
                              type="button"
                              onClick={() => acceptInvitation(payload.invitationId)}
                              disabled={busy || !payload.invitationId}
                              class="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {t('notifications.accept')}
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  }}
                </For>
              </ul>
            </Show>
          </div>
        </section>
      </div>
    );
  }
}

function Icon(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.size ?? 18}
      height={props.size ?? 18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={props.class}
      aria-hidden="true"
    >
      {props.children}
    </svg>
  );
}

function IconMapPin(props) {
  return (
    <Icon size={props.size ?? 24} class={props.class}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </Icon>
  );
}

function IconCalendar() {
  return (
    <Icon size={11} class="text-muted-foreground">
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
    </Icon>
  );
}

function IconChevron() {
  return (
    <Icon size={16} class="shrink-0 text-muted-foreground">
      <path d="m9 18 6-6-6-6" />
    </Icon>
  );
}

function IconPlus() {
  return (
    <Icon size={20} class="text-muted-foreground transition-colors group-hover:text-[#ff6b4a]">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </Icon>
  );
}

function IconBell() {
  return (
    <Icon size={18} class="text-white">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </Icon>
  );
}

function IconSettings() {
  return (
    <Icon size={18} class="text-white">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  );
}
