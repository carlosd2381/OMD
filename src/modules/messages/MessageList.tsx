import { Mail } from 'lucide-react';
import type { Email } from '../../types/email';
import { format } from 'date-fns';

interface MessageListProps {
  emails: Email[];
  loading: boolean;
  onSelectEmail: (email: Email) => void;
  selectedEmailId?: string;
  className?: string;
}

export default function MessageList({ emails, loading, onSelectEmail, selectedEmailId, className = '' }: MessageListProps) {
  if (loading) {
    return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading messages...</div>;
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
        <Mail className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
        <p>No messages found</p>
      </div>
    );
  }

  return (
    <ul className={`divide-y divide-gray-200 dark:divide-gray-700 dark:border-gray-700 ${className}`}>
      {emails.map((email) => {
        const isSelected = email.id === selectedEmailId;
        const isUnread = email.status === 'unread';
        
        return (
          <li 
            key={email.id} 
            onClick={() => onSelectEmail(email)}
            className={`
              relative flex cursor-pointer items-start px-4 py-3 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors
              ${isSelected ? 'bg-primary/5 dark:bg-primary/10' : ''}
              ${isUnread ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-800/50'}
            `}
          >
            <div className="min-w-0 flex-1">
              <div className="flex justify-between items-baseline mb-1">
                <p className={`text-sm font-medium truncate pr-2 ${isUnread ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                  {email.from_address}
                </p>
                <time className="shrink-0 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {format(new Date(email.received_at || email.sent_at), 'MMM d, h:mm a')}
                </time>
              </div>
              <p className={`text-sm mb-1 ${isUnread ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-600 dark:text-gray-300'}`}>
                {email.subject || '(No Subject)'}
              </p>
              <p className="line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                {email.text_body || email.html_body?.replace(/<[^>]*>?/gm, '') || '(No content)'}
              </p>
            </div>
            {isUnread && (
              <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
            )}
          </li>
        );
      })}
    </ul>
  );
}
