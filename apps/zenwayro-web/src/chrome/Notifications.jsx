import { createEffect, createSignal, For, onCleanup, Show } from 'grainlet';
import { useSession } from 'grainlet/auth';
import { useI18n } from 'grainlet/i18n';
import { useMutation, useQuery, useQueryClient } from 'grainlet/query';
import { useLocation } from 'grainlet/route';
import { apiClient } from '../api.js';
import { NOTIFICATION_PATHS } from '../api/paths/notification.js';
import { TRIP_PATHS } from '../api/paths/trip.js';
import { translateApp } from '../i18n.js';
import {
  badgeCount,
  formatBadgeCount,
  formatNotificationTimestamp,
  notificationErrorMessage,
  notificationItems,
  NOTIFICATIONS_LIST_KEY,
  NOTIFICATIONS_UNREAD_KEY,
  unreadNotifications,
} from './notifications.js';

const BELL_BUTTON_CLASS =
  'relative p-1 rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-950 cursor-pointer';

const DISMISS_BUTTON_CLASS =
  'rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800';

const ACCEPT_BUTTON_CLASS =
  'rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60';

function NotificationRow(props) {
  const notification = props.notification;
  const payload = notification.payload || {};
  const invitationId = payload.invitationId;
  const busy = () => props.pendingId() === notification.id;
  const isInvitation = notification.type === 'trip_invitation' && invitationId;

  return (
    <div class="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-sm font-semibold text-gray-900 dark:text-white">
            {isInvitation ? props.t('notifications.tripInvitation') : props.t('notifications.title')}
          </p>
          <Show when={payload.tripCity}>
            <p class="mt-1 text-sm text-gray-700 dark:text-gray-200">{payload.tripCity}</p>
          </Show>
          <Show when={typeof payload.tripDurationDays === 'number'}>
            <p class="text-xs text-gray-500 dark:text-gray-400">{payload.tripDurationDays} days</p>
          </Show>
          <p class="mt-2 text-xs text-gray-400 dark:text-gray-500">
            {formatNotificationTimestamp(notification.createdAt)}
          </p>
        </div>
        <div class="flex shrink-0 flex-col gap-2 sm:flex-row">
          <button
            type="button"
            class={DISMISS_BUTTON_CLASS}
            disabled={busy()}
            onClick={() => props.onDismiss(notification.id)}
          >
            {props.t('notifications.dismiss')}
          </button>
          <Show when={isInvitation}>
            <button
              type="button"
              class={ACCEPT_BUTTON_CLASS}
              disabled={busy()}
              onClick={() => props.onAccept(notification)}
            >
              {props.t('notifications.accept')}
            </button>
          </Show>
        </div>
      </div>
    </div>
  );
}

export function NotificationsBell() {
  const session = useSession();
  const i18n = useI18n();
  const location = useLocation();
  const queryClient = useQueryClient();
  const t = (key, variables) => translateApp(i18n, key, variables);
  const signedIn = () => session.status() === 'authenticated';
  const [open, setOpen] = createSignal(false);
  const [pendingId, setPendingId] = createSignal(null);
  const [actionError, setActionError] = createSignal('');

  const listQuery = useQuery(() => ({
    queryKey: NOTIFICATIONS_LIST_KEY,
    enabled: signedIn(),
    queryFn: ({ signal }) => apiClient.get(NOTIFICATION_PATHS.list, { signal }),
  }));

  const unreadQuery = useQuery(() => ({
    queryKey: NOTIFICATIONS_UNREAD_KEY,
    enabled: signedIn(),
    queryFn: ({ signal }) => apiClient.get(NOTIFICATION_PATHS.unreadCount, { signal }),
  }));

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }

  const markRead = useMutation({
    mutationFn: (id) => apiClient.patch(NOTIFICATION_PATHS.readById(id)),
    onSuccess: invalidate,
  });

  const acceptInvitation = useMutation({
    mutationFn: (invitationId) => apiClient.post(TRIP_PATHS.acceptInvitation(invitationId)),
    onSuccess: invalidate,
  });

  const items = () => unreadNotifications(notificationItems(listQuery.data()));
  const badge = () =>
    formatBadgeCount(badgeCount(unreadQuery.data(), notificationItems(listQuery.data())));

  createEffect(() => {
    location().pathname;
    setOpen(false);
  });

  createEffect(() => {
    if (!open() || typeof document === 'undefined') return;
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    onCleanup(() => document.removeEventListener('keydown', onKey));
  });

  function dismiss(id) {
    setActionError('');
    setPendingId(id);
    markRead.mutate(id, {
      onSuccess: () => setPendingId(null),
      onError: (error) => {
        setPendingId(null);
        setActionError(notificationErrorMessage(error, t('notifications.dismissError')));
      },
    });
  }

  function accept(notification) {
    const invitationId = notification.payload && notification.payload.invitationId;
    if (!invitationId) return;
    setActionError('');
    setPendingId(notification.id);
    acceptInvitation.mutate(invitationId, {
      onSuccess: () => setPendingId(null),
      onError: (error) => {
        setPendingId(null);
        setActionError(notificationErrorMessage(error, t('notifications.acceptError')));
      },
    });
  }

  return (
    <Show when={signedIn()}>
      <div class="relative">
        <button
          type="button"
          class={BELL_BUTTON_CLASS}
          aria-label={t('nav.notifications')}
          aria-expanded={open() ? 'true' : 'false'}
          aria-haspopup="dialog"
          onClick={() => setOpen((value) => !value)}
        >
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <Show when={badge()}>
            <span class="absolute -right-0.5 -top-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 py-0.5 text-[10px] font-bold text-white">
              {badge()}
            </span>
          </Show>
        </button>

        <Show when={open()}>
          <div class="fixed inset-x-0 bottom-0 top-14 z-[60]">
            <button
              type="button"
              class="absolute inset-0 bg-black/40 dark:bg-black/60"
              aria-label={t('nav.closeMenu')}
              onClick={() => setOpen(false)}
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
                  class="rounded-md p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
                  aria-label={t('nav.closeMenu')}
                  onClick={() => setOpen(false)}
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div class="overflow-y-auto px-4 py-4">
                <Show when={actionError()}>
                  <p class="mb-3 text-sm text-red-600 dark:text-red-400" role="alert">{actionError()}</p>
                </Show>
                <Show
                  when={listQuery.isPending()}
                  fallback={
                    <Show
                      when={listQuery.isError()}
                      fallback={
                        <Show
                          when={items().length === 0}
                          fallback={
                            <div class="space-y-3">
                              <For each={items()}>
                                {(notification) => (
                                  <NotificationRow
                                    notification={notification}
                                    pendingId={pendingId}
                                    onDismiss={dismiss}
                                    onAccept={accept}
                                    t={t}
                                  />
                                )}
                              </For>
                            </div>
                          }
                        >
                          <p class="text-sm text-gray-500 dark:text-gray-400" role="status">
                            {t('notifications.empty')}
                          </p>
                        </Show>
                      }
                    >
                      <div role="alert">
                        <p class="text-sm text-red-600 dark:text-red-400">
                          {notificationErrorMessage(listQuery.error(), t('errorBoundary.unexpectedError'))}
                        </p>
                        <button
                          type="button"
                          class="mt-3 inline-flex h-9 items-center rounded-md px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                          onClick={() => listQuery.refetch()}
                        >
                          {t('common.tryAgain')}
                        </button>
                      </div>
                    </Show>
                  }
                >
                  <p class="text-sm text-gray-500 dark:text-gray-400" role="status">Loading...</p>
                </Show>
              </div>
            </section>
          </div>
        </Show>
      </div>
    </Show>
  );
}
