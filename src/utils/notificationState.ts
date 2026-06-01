const NOTIFICATION_READ_IDS_STORAGE_KEY = 'admin-alert-read-ids-v1';
const NOTIFICATION_ARCHIVED_IDS_STORAGE_KEY = 'admin-alert-archived-ids-v1';

function parseIdList(raw: string | null): string[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string')
      : [];
  } catch {
    return [];
  }
}

function getStorageValue(key: string): string[] {
  if (typeof window === 'undefined') return [];
  return parseIdList(window.localStorage.getItem(key));
}

function setStorageValue(key: string, ids: string[]) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // Ignore storage errors
  }
}

export function getReadNotificationIds(): string[] {
  return getStorageValue(NOTIFICATION_READ_IDS_STORAGE_KEY);
}

export function setReadNotificationIds(ids: string[]) {
  setStorageValue(NOTIFICATION_READ_IDS_STORAGE_KEY, ids);
}

export function getArchivedNotificationIds(): string[] {
  return getStorageValue(NOTIFICATION_ARCHIVED_IDS_STORAGE_KEY);
}

export function setArchivedNotificationIds(ids: string[]) {
  setStorageValue(NOTIFICATION_ARCHIVED_IDS_STORAGE_KEY, ids);
}
