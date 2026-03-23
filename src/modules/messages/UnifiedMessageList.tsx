import { format } from 'date-fns';
import { Mail } from 'lucide-react';
import type { ConversationThread } from '../../services/conversationService';

interface UnifiedMessageListProps {
  threads: ConversationThread[];
  loading: boolean;
  selectedConversationId?: string;
  onSelectThread: (thread: ConversationThread) => void;
}

const channelLabel = (channel: string) => {
  if (channel === 'facebook') return 'Facebook';
  if (channel === 'instagram') return 'Instagram';
  return 'Email';
};

const getSenderLabel = (thread: ConversationThread) => {
  const client = thread.participants.find((participant) => participant.role === 'client');
  if (!client) return 'Unknown Sender';
  return client.display_name || client.email || client.external_user_id || 'Unknown Sender';
};

const getPreview = (thread: ConversationThread) => {
  const latest = thread.messages[thread.messages.length - 1];
  if (!latest?.body_text) return '(No content)';
  return latest.body_text;
};

export default function UnifiedMessageList({
  threads,
  loading,
  selectedConversationId,
  onSelectThread,
}: UnifiedMessageListProps) {
  if (loading) {
    return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading messages...</div>;
  }

  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
        <Mail className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
        <p>No conversations found</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-200 dark:divide-gray-700 dark:border-gray-700">
      {threads.map((thread) => {
        const isSelected = thread.conversation.id === selectedConversationId;
        const isUnread = (thread.conversation.unread_count || 0) > 0;
        const lastMessageTime =
          thread.conversation.last_message_at ||
          thread.messages[thread.messages.length - 1]?.sent_at ||
          thread.conversation.updated_at;

        return (
          <li
            key={thread.conversation.id}
            onClick={() => onSelectThread(thread)}
            className={`
              relative flex cursor-pointer items-start px-4 py-3 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors
              ${isSelected ? 'bg-primary/5 dark:bg-primary/10' : ''}
              ${isUnread ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-800/50'}
            `}
          >
            <div className="min-w-0 flex-1">
              <div className="flex justify-between items-baseline mb-1 gap-3">
                <p className={`text-sm font-medium truncate ${isUnread ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                  {getSenderLabel(thread)}
                </p>
                <time className="shrink-0 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {format(new Date(lastMessageTime), 'MMM d, h:mm a')}
                </time>
              </div>

              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                  {channelLabel(thread.conversation.channel)}
                </span>
                <p className={`text-sm truncate ${isUnread ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-600 dark:text-gray-300'}`}>
                  {thread.conversation.subject || '(No Subject)'}
                </p>
              </div>

              <p className="line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{getPreview(thread)}</p>
            </div>

            {isUnread && <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
          </li>
        );
      })}
    </ul>
  );
}
