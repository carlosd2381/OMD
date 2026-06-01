import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Search, User, LogOut, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { activityLogService, type AdminAlert } from '../../services/activityLogService';
import {
  getArchivedNotificationIds,
  getReadNotificationIds,
  setReadNotificationIds,
} from '../../utils/notificationState';

type BellPreset = 'all' | 'critical' | 'payments' | 'unread' | 'critical-unread';

export default function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showAlerts, setShowAlerts] = useState(false);
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [bellPreset, setBellPreset] = useState<BellPreset>('all');
  const [readAlertIds, setReadAlertIds] = useState<string[]>(() => getReadNotificationIds());
  const [archivedAlertIds, setArchivedAlertIds] = useState<string[]>(() => getArchivedNotificationIds());
  const bellMenuRef = useRef<HTMLDivElement | null>(null);

  const visibleAlerts = useMemo(
    () => alerts.filter((alert) => !archivedAlertIds.includes(alert.id)).slice(0, 24),
    [alerts, archivedAlertIds]
  );
  const readAlertIdSet = useMemo(() => new Set(readAlertIds), [readAlertIds]);

  const classifyAlert = (alert: AdminAlert) => {
    const action = alert.action;

    let category: 'Portal' | 'Leads' | 'Tasks' | 'Payments' | 'Other' = 'Other';
    if (action.includes('Lead')) category = 'Leads';
    else if (action.includes('Task')) category = 'Tasks';
    else if (action.includes('Payment') || action.includes('Invoice')) category = 'Payments';
    else if (action.includes('Quote') || action.includes('Questionnaire') || action.includes('Contract')) category = 'Portal';

    let severity: 'critical' | 'warning' | 'info' = 'info';
    if (action.includes('Failed') || action === 'Payment Overdue') severity = 'critical';
    else if (action === 'Payment Due Soon') severity = 'warning';

    return { category, severity };
  };

  const filteredAlerts = useMemo(() => {
    if (bellPreset === 'all') return visibleAlerts;
    if (bellPreset === 'critical') {
      return visibleAlerts.filter((alert) => classifyAlert(alert).severity === 'critical');
    }
    if (bellPreset === 'payments') {
      return visibleAlerts.filter((alert) => classifyAlert(alert).category === 'Payments');
    }
    if (bellPreset === 'unread') {
      return visibleAlerts.filter((alert) => !readAlertIdSet.has(alert.id));
    }
    return visibleAlerts.filter(
      (alert) => classifyAlert(alert).severity === 'critical' && !readAlertIdSet.has(alert.id)
    );
  }, [bellPreset, visibleAlerts, readAlertIdSet]);

  const groupedAlerts = useMemo(() => {
    const groups: Record<'Portal' | 'Leads' | 'Tasks' | 'Payments' | 'Other', AdminAlert[]> = {
      Portal: [],
      Leads: [],
      Tasks: [],
      Payments: [],
      Other: [],
    };

    for (const alert of filteredAlerts) {
      const { category } = classifyAlert(alert);
      groups[category].push(alert);
    }

    return groups;
  }, [filteredAlerts]);

  const unreadAlerts = useMemo(
    () => visibleAlerts.filter((alert) => !readAlertIdSet.has(alert.id)),
    [visibleAlerts, readAlertIdSet]
  );

  const unreadCount = unreadAlerts.length;

  const unreadCriticalCount = useMemo(
    () => unreadAlerts.filter((alert) => classifyAlert(alert).severity === 'critical').length,
    [unreadAlerts]
  );

  const markAlertsAsRead = (alertIds: string[]) => {
    if (alertIds.length === 0) return;

    setReadAlertIds((previous) => {
      const next = new Set(previous);
      for (const alertId of alertIds) {
        next.add(alertId);
      }
      return Array.from(next);
    });
  };

  useEffect(() => {
    setReadNotificationIds(readAlertIds);
  }, [readAlertIds]);
  const loadAlerts = async () => {
    try {
      setAlertsLoading(true);
      const data = await activityLogService.getRecentAdminAlerts(25);
      setAlerts(data);
      setArchivedAlertIds(getArchivedNotificationIds());
    } catch (error) {
      console.error('Failed to load admin alerts:', error);
    } finally {
      setAlertsLoading(false);
    }
  };

  useEffect(() => {
    void loadAlerts();
  }, []);

  useEffect(() => {
    if (!showAlerts) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!bellMenuRef.current) return;
      if (!bellMenuRef.current.contains(event.target as Node)) {
        setShowAlerts(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showAlerts]);

  const formatAlertTime = (isoDate: string) => {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth/login');
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 dark:border-gray-700 dark:border-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 px-6 shadow-sm">
      <div className="flex flex-1 items-center">
        <div className="relative w-full max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
          <input
            type="text"
            name="search"
            id="search"
            className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 dark:text-white dark:text-white dark:bg-gray-700 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
            placeholder="Search..."
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative" ref={bellMenuRef}>
          <button
            onClick={() => {
              const next = !showAlerts;
              setShowAlerts(next);
              if (next) {
                void loadAlerts();
              }
            }}
            className="relative rounded-full bg-white dark:bg-gray-800 dark:bg-gray-800 p-1 text-gray-400 hover:text-gray-500 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <span className="sr-only">View notifications</span>
            <Bell className="h-6 w-6" aria-hidden="true" />
              {unreadCount > 0 && (
              <span
                  className={`absolute -right-0.5 -top-0.5 inline-flex h-2.5 w-2.5 rounded-full ${unreadCriticalCount > 0 ? 'bg-red-500' : 'bg-amber-500'}`}
              />
            )}
          </button>

          {showAlerts && (
            <div className="absolute right-0 mt-2 w-96 max-w-[90vw] rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800 z-50">
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Admin Alerts{unreadCount > 0 ? ` (${unreadCount} unread)` : ''}
                  </h3>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => markAlertsAsRead(visibleAlerts.map((alert) => alert.id))}
                      className="text-xs font-medium text-gray-500 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300"
                      disabled={unreadCount === 0}
                    >
                      Mark all read
                    </button>
                    <button
                      onClick={() => void loadAlerts()}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Refresh
                    </button>
                  </div>
              </div>

              <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-2 dark:border-gray-700">
                <select
                  value={bellPreset}
                  onChange={(event) => setBellPreset(event.target.value as BellPreset)}
                  className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                >
                  <option value="all">Preset: All alerts</option>
                  <option value="critical">Preset: Critical</option>
                  <option value="payments">Preset: Payments</option>
                  <option value="unread">Preset: Unread</option>
                  <option value="critical-unread">Preset: Critical unread</option>
                </select>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {alertsLoading ? (
                  <div className="px-4 py-6 text-sm text-gray-500">Loading alerts...</div>
                ) : filteredAlerts.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-gray-500">No admin alerts right now.</div>
                ) : (
                  <div className="space-y-3 px-3 py-3">
                    {(Object.entries(groupedAlerts) as Array<[keyof typeof groupedAlerts, AdminAlert[]]>).map(([groupName, groupItems]) => {
                      if (groupItems.length === 0) return null;

                      return (
                        <div key={groupName} className="rounded-md border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/40">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">{groupName}</span>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400">{groupItems.length}</span>
                          </div>
                          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                            {groupItems.map((alert) => {
                              const { severity } = classifyAlert(alert);
                              const isUnread = !readAlertIdSet.has(alert.id);
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
                                    className={`px-3 py-2.5 ${isUnread ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
                                  >
                                  <div className="flex items-start gap-2">
                                    <AlertTriangle className={`mt-0.5 h-4 w-4 ${iconColor}`} />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center justify-between gap-2">
                                        <p className="text-xs font-semibold text-gray-900 dark:text-white">{alert.action}</p>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${severityBadge}`}>
                                          {severity}
                                        </span>
                                      </div>
                                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 line-clamp-2">{alert.details || 'No details'}</p>
                                      <div className="mt-2 flex items-center justify-between gap-2">
                                        <span className="text-[11px] text-gray-400">{formatAlertTime(alert.created_at)}</span>
                                          {isUnread && (
                                            <button
                                              onClick={() => markAlertsAsRead([alert.id])}
                                              className="text-[11px] font-medium text-gray-500 hover:underline dark:text-gray-300"
                                            >
                                              Mark read
                                            </button>
                                          )}
                                        {alert.entity_type === 'client' && (
                                          <button
                                            onClick={() => {
                                              markAlertsAsRead([alert.id]);
                                              setShowAlerts(false);
                                              navigate(`/clients/${alert.entity_id}`);
                                            }}
                                            className="text-[11px] font-medium text-primary hover:underline"
                                          >
                                            Open client
                                          </button>
                                        )}
                                        {alert.entity_type === 'lead' && (
                                          <button
                                            onClick={() => {
                                              markAlertsAsRead([alert.id]);
                                              setShowAlerts(false);
                                              navigate(`/leads/${alert.entity_id}`);
                                            }}
                                            className="text-[11px] font-medium text-primary hover:underline"
                                          >
                                            Open lead
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 px-4 py-2 dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowAlerts(false);
                    navigate('/notifications');
                  }}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Go to Notifications
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
              <User className="h-5 w-5 text-gray-500 dark:text-gray-400 dark:text-gray-300" />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {user?.user_metadata?.name || user?.email || 'User'}
            </span>
          </div>
          <button
            onClick={handleSignOut}
            className="p-1 text-gray-400 hover:text-gray-500 dark:text-gray-400 focus:outline-none"
            title="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
