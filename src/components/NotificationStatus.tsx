import type { DocumentNotificationStatus } from '../services/activityLogService';

type NotificationStatusProps = {
  status: DocumentNotificationStatus | null | undefined;
  variant?: 'inline' | 'badge';
  showDate?: boolean;
  badgePrefix?: string;
};

const getStatusTextClass = (status?: DocumentNotificationStatus['status']) => {
  if (status === 'sent') return 'text-green-600';
  if (status === 'failed') return 'text-red-600';
  if (status === 'skipped') return 'text-yellow-600';
  return 'text-gray-500';
};

const getStatusBadgeClass = (status?: DocumentNotificationStatus['status']) => {
  if (status === 'sent') return 'bg-green-100 text-green-800';
  if (status === 'failed') return 'bg-red-100 text-red-800';
  if (status === 'skipped') return 'bg-yellow-100 text-yellow-800';
  return 'bg-gray-100 text-gray-800';
};

const getStatusLabel = (status: DocumentNotificationStatus, showDate: boolean) => {
  if (!showDate) return status.status.toUpperCase();
  return `${status.status.toUpperCase()} (${new Date(status.created_at).toLocaleDateString()})`;
};

export function NotificationStatus({
  status,
  variant = 'inline',
  showDate = false,
  badgePrefix = 'NOTIF ',
}: NotificationStatusProps) {
  if (variant === 'badge') {
    if (!status) return null;
    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(status.status)}`}>
        {badgePrefix}{status.status.toUpperCase()}
      </span>
    );
  }

  return (
    <span className={`text-xs text-right font-bold ${getStatusTextClass(status?.status)}`}>
      {status ? getStatusLabel(status, showDate) : 'N/A'}
    </span>
  );
}
