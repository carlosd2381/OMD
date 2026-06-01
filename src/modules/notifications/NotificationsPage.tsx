import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Archive, ArchiveRestore, RefreshCw, Search } from 'lucide-react';
import { activityLogService, type AdminAlert } from '../../services/activityLogService';
import {
  getArchivedNotificationIds,
  getReadNotificationIds,
  setArchivedNotificationIds,
  setReadNotificationIds,
} from '../../utils/notificationState';

type AlertCategory = 'Portal' | 'Leads' | 'Tasks' | 'Payments' | 'Other';
type AlertSeverity = 'critical' | 'warning' | 'info';

type SeverityFilter = 'all' | AlertSeverity;
type CategoryFilter = 'all' | AlertCategory;

type ReadFilter = 'all' | 'unread' | 'read';
type PresetFilter =
  | 'custom'
  | 'all-active'
  | 'critical-open'
  | 'payments-followup'
  | 'portal-unread'
  | 'recent-7-days'
  | 'archived';

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function daysAgoDateInputValue(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toDateInputValue(date);
}

function classifyAlert(alert: AdminAlert): { category: AlertCategory; severity: AlertSeverity } {
  const action = alert.action;

  let category: AlertCategory = 'Other';
  if (action.includes('Lead')) category = 'Leads';
  else if (action.includes('Task')) category = 'Tasks';
  else if (action.includes('Payment') || action.includes('Invoice')) category = 'Payments';
  else if (action.includes('Quote') || action.includes('Questionnaire') || action.includes('Contract')) category = 'Portal';

  let severity: AlertSeverity = 'info';
  if (action.includes('Failed') || action === 'Payment Overdue') severity = 'critical';
  else if (action === 'Payment Due Soon') severity = 'warning';

  return { category, severity };
}

function formatAlertTime(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [presetFilter, setPresetFilter] = useState<PresetFilter>('all-active');

  const [readAlertIds, setReadAlertIdsState] = useState<string[]>(() => getReadNotificationIds());
  const [archivedAlertIds, setArchivedAlertIdsState] = useState<string[]>(() => getArchivedNotificationIds());

  const readIdSet = useMemo(() => new Set(readAlertIds), [readAlertIds]);
  const archivedIdSet = useMemo(() => new Set(archivedAlertIds), [archivedAlertIds]);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const data = await activityLogService.getRecentAdminAlerts(200);
      setAlerts(data);
      setReadAlertIdsState(getReadNotificationIds());
      setArchivedAlertIdsState(getArchivedNotificationIds());
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAlerts();
  }, []);

  useEffect(() => {
    setReadNotificationIds(readAlertIds);
  }, [readAlertIds]);

  useEffect(() => {
    setArchivedNotificationIds(archivedAlertIds);
  }, [archivedAlertIds]);

  const scopedAlerts = useMemo(
    () => alerts.filter((alert) => (showArchived ? archivedIdSet.has(alert.id) : !archivedIdSet.has(alert.id))),
    [alerts, showArchived, archivedIdSet]
  );

  const filteredAlerts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return scopedAlerts.filter((alert) => {
      const { category, severity } = classifyAlert(alert);
      const isRead = readIdSet.has(alert.id);
      const alertDate = new Date(alert.created_at);
      if (Number.isNaN(alertDate.getTime())) return false;

      if (severityFilter !== 'all' && severity !== severityFilter) return false;
      if (categoryFilter !== 'all' && category !== categoryFilter) return false;
      if (readFilter === 'read' && !isRead) return false;
      if (readFilter === 'unread' && isRead) return false;

      if (dateFrom) {
        const from = new Date(`${dateFrom}T00:00:00`);
        if (alertDate < from) return false;
      }

      if (dateTo) {
        const to = new Date(`${dateTo}T23:59:59`);
        if (alertDate > to) return false;
      }

      if (!query) return true;

      return (
        alert.action.toLowerCase().includes(query) ||
        (alert.details || '').toLowerCase().includes(query) ||
        alert.entity_type.toLowerCase().includes(query) ||
        (alert.created_by || '').toLowerCase().includes(query)
      );
    });
  }, [scopedAlerts, searchTerm, severityFilter, categoryFilter, readFilter, dateFrom, dateTo, readIdSet]);

  const counts = useMemo(() => {
    const unread = filteredAlerts.filter((alert) => !readIdSet.has(alert.id)).length;
    const critical = filteredAlerts.filter((alert) => classifyAlert(alert).severity === 'critical').length;
    return { total: filteredAlerts.length, unread, critical };
  }, [filteredAlerts, readIdSet]);

  const markAsRead = (alertId: string) => {
    setReadAlertIdsState((previous) => (previous.includes(alertId) ? previous : [...previous, alertId]));
  };

  const markAsUnread = (alertId: string) => {
    setReadAlertIdsState((previous) => previous.filter((id) => id !== alertId));
  };

  const archiveAlert = (alertId: string) => {
    setArchivedAlertIdsState((previous) => (previous.includes(alertId) ? previous : [...previous, alertId]));
  };

  const unarchiveAlert = (alertId: string) => {
    setArchivedAlertIdsState((previous) => previous.filter((id) => id !== alertId));
  };

  const markFilteredAsRead = () => {
    const ids = filteredAlerts.map((alert) => alert.id);
    if (ids.length === 0) return;

    setReadAlertIdsState((previous) => {
      const next = new Set(previous);
      ids.forEach((id) => next.add(id));
      return Array.from(next);
    });
  };

  const markFilteredAsUnread = () => {
    const ids = new Set(filteredAlerts.map((alert) => alert.id));
    if (ids.size === 0) return;

    setReadAlertIdsState((previous) => previous.filter((id) => !ids.has(id)));
  };

  const archiveFiltered = () => {
    const ids = filteredAlerts.map((alert) => alert.id);
    if (ids.length === 0) return;

    setArchivedAlertIdsState((previous) => {
      const next = new Set(previous);
      ids.forEach((id) => next.add(id));
      return Array.from(next);
    });
  };

  const unarchiveFiltered = () => {
    const ids = new Set(filteredAlerts.map((alert) => alert.id));
    if (ids.size === 0) return;

    setArchivedAlertIdsState((previous) => previous.filter((id) => !ids.has(id)));
  };

  const applyPreset = (preset: PresetFilter) => {
    setPresetFilter(preset);

    if (preset === 'custom') return;

    if (preset === 'all-active') {
      setShowArchived(false);
      setSeverityFilter('all');
      setCategoryFilter('all');
      setReadFilter('all');
      setDateFrom('');
      setDateTo('');
      return;
    }

    if (preset === 'critical-open') {
      setShowArchived(false);
      setSeverityFilter('critical');
      setCategoryFilter('all');
      setReadFilter('unread');
      setDateFrom('');
      setDateTo('');
      return;
    }

    if (preset === 'payments-followup') {
      setShowArchived(false);
      setSeverityFilter('all');
      setCategoryFilter('Payments');
      setReadFilter('unread');
      setDateFrom('');
      setDateTo('');
      return;
    }

    if (preset === 'portal-unread') {
      setShowArchived(false);
      setSeverityFilter('all');
      setCategoryFilter('Portal');
      setReadFilter('unread');
      setDateFrom('');
      setDateTo('');
      return;
    }

    if (preset === 'recent-7-days') {
      setShowArchived(false);
      setSeverityFilter('all');
      setCategoryFilter('all');
      setReadFilter('all');
      setDateFrom(daysAgoDateInputValue(7));
      setDateTo(toDateInputValue(new Date()));
      return;
    }

    if (preset === 'archived') {
      setShowArchived(true);
      setSeverityFilter('all');
      setCategoryFilter('all');
      setReadFilter('all');
      setDateFrom('');
      setDateTo('');
    }
  };

  const openEntity = (alert: AdminAlert) => {
    markAsRead(alert.id);
    if (alert.entity_type === 'client') {
      navigate(`/clients/${alert.entity_id}`);
      return;
    }
    if (alert.entity_type === 'lead') {
      navigate(`/leads/${alert.entity_id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Search, filter, and archive admin alerts.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={presetFilter}
              onChange={(event) => applyPreset(event.target.value as PresetFilter)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            >
              <option value="all-active">Preset: All active</option>
              <option value="critical-open">Preset: Critical unread</option>
              <option value="payments-followup">Preset: Payments unread</option>
              <option value="portal-unread">Preset: Portal unread</option>
              <option value="recent-7-days">Preset: Last 7 days</option>
              <option value="archived">Preset: Archived</option>
              <option value="custom">Preset: Custom</option>
            </select>
            <button
              onClick={() => {
                setPresetFilter('custom');
                setShowArchived((value) => !value);
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${showArchived ? 'bg-primary/15 text-primary' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}
            >
              {showArchived ? 'Viewing archived' : 'Viewing active'}
            </button>
            <button
              onClick={() => void loadAlerts()}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/40">
            <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Results</p>
            <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{counts.total}</p>
          </div>
          <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/40">
            <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Unread</p>
            <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{counts.unread}</p>
          </div>
          <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/40">
            <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Critical</p>
            <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{counts.critical}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-6">
          <label className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(event) => {
                setPresetFilter('custom');
                setSearchTerm(event.target.value);
              }}
              placeholder="Search action, details, type, creator"
              className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-900 focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </label>

          <select
            value={severityFilter}
            onChange={(event) => {
              setPresetFilter('custom');
              setSeverityFilter(event.target.value as SeverityFilter);
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(event) => {
              setPresetFilter('custom');
              setCategoryFilter(event.target.value as CategoryFilter);
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All categories</option>
            <option value="Portal">Portal</option>
            <option value="Leads">Leads</option>
            <option value="Tasks">Tasks</option>
            <option value="Payments">Payments</option>
            <option value="Other">Other</option>
          </select>

          <select
            value={readFilter}
            onChange={(event) => {
              setPresetFilter('custom');
              setReadFilter(event.target.value as ReadFilter);
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All read states</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(event) => {
              setPresetFilter('custom');
              setDateFrom(event.target.value);
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            aria-label="From date"
          />

          <input
            type="date"
            value={dateTo}
            onChange={(event) => {
              setPresetFilter('custom');
              setDateTo(event.target.value);
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            aria-label="To date"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={markFilteredAsRead}
            disabled={filteredAlerts.length === 0}
            className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-gray-200"
          >
            Mark filtered read
          </button>
          <button
            onClick={markFilteredAsUnread}
            disabled={filteredAlerts.length === 0}
            className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-gray-200"
          >
            Mark filtered unread
          </button>
          {!showArchived ? (
            <button
              onClick={archiveFiltered}
              disabled={filteredAlerts.length === 0}
              className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-gray-200"
            >
              Archive filtered
            </button>
          ) : (
            <button
              onClick={unarchiveFiltered}
              disabled={filteredAlerts.length === 0}
              className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-gray-200"
            >
              Unarchive filtered
            </button>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {loading ? (
          <div className="px-4 py-10 text-sm text-gray-500">Loading notifications...</div>
        ) : filteredAlerts.length === 0 ? (
          <div className="px-4 py-10 text-sm text-gray-500">No notifications match your filters.</div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAlerts.map((alert) => {
              const { severity, category } = classifyAlert(alert);
              const isRead = readIdSet.has(alert.id);

              const iconColor =
                severity === 'critical'
                  ? 'text-red-500'
                  : severity === 'warning'
                    ? 'text-amber-500'
                    : 'text-blue-500';

              const severityBadge =
                severity === 'critical'
                  ? 'bg-red-100 text-red-700'
                  : severity === 'warning'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-blue-100 text-blue-700';

              return (
                <li
                  key={alert.id}
                  className={`px-4 py-3 sm:px-6 ${isRead ? '' : 'bg-primary/5 dark:bg-primary/10'}`}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`mt-0.5 h-4 w-4 ${iconColor}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{alert.action}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${severityBadge}`}>
                          {severity}
                        </span>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                          {category}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{alert.details || 'No details'}</p>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
                        <span>{formatAlertTime(alert.created_at)}</span>
                        <span>By: {alert.created_by || 'System'}</span>
                        <span>Type: {alert.entity_type}</span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                        {isRead ? (
                          <button
                            onClick={() => markAsUnread(alert.id)}
                            className="font-medium text-gray-500 hover:underline dark:text-gray-300"
                          >
                            Mark unread
                          </button>
                        ) : (
                          <button
                            onClick={() => markAsRead(alert.id)}
                            className="font-medium text-gray-500 hover:underline dark:text-gray-300"
                          >
                            Mark read
                          </button>
                        )}

                        {!showArchived ? (
                          <button
                            onClick={() => archiveAlert(alert.id)}
                            className="inline-flex items-center gap-1 font-medium text-gray-500 hover:underline dark:text-gray-300"
                          >
                            <Archive className="h-3.5 w-3.5" />
                            Archive
                          </button>
                        ) : (
                          <button
                            onClick={() => unarchiveAlert(alert.id)}
                            className="inline-flex items-center gap-1 font-medium text-gray-500 hover:underline dark:text-gray-300"
                          >
                            <ArchiveRestore className="h-3.5 w-3.5" />
                            Unarchive
                          </button>
                        )}

                        {(alert.entity_type === 'client' || alert.entity_type === 'lead') && (
                          <button
                            onClick={() => openEntity(alert)}
                            className="font-medium text-primary hover:underline"
                          >
                            Open {alert.entity_type}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
