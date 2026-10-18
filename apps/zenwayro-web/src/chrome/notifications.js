export const NOTIFICATIONS_LIST_KEY = ['notifications', 'list'];
export const NOTIFICATIONS_UNREAD_KEY = ['notifications', 'unread-count'];

export function notificationItems(data) {
  if (!data || !Array.isArray(data.items)) return [];
  return data.items;
}

export function unreadNotifications(items) {
  return (items || []).filter((item) => item && !item.readAt);
}

export function badgeCount(countResponse, items) {
  const count = countResponse && countResponse.count;
  if (typeof count === 'number' && Number.isFinite(count)) return count;
  return unreadNotifications(items).length;
}

export function formatBadgeCount(count) {
  if (typeof count !== 'number' || count <= 0) return '';
  return count > 9 ? '9+' : String(count);
}

export function notificationErrorMessage(error, fallback) {
  if (error && typeof error.message === 'string' && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

export function formatNotificationTimestamp(iso) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso == null ? '' : String(iso);
  }
}
