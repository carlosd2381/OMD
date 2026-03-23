import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Loader2, Mail, Paperclip, Reply, X } from 'lucide-react';
import type { ConversationThread } from '../../services/conversationService';

interface UnifiedMessageDetailProps {
  thread: ConversationThread | null;
  onClose?: () => void;
  onSendReply?: (payload: { thread: ConversationThread; body: string; attachments: File[] }) => Promise<void>;
}

const isEmailThread = (thread: ConversationThread | null) => thread?.conversation.channel === 'email';

const getSenderLabel = (thread: ConversationThread) => {
  const sender = thread.participants.find((participant) => participant.role === 'client');
  if (!sender) return 'Unknown Sender';
  return sender.display_name || sender.email || sender.external_user_id || 'Unknown Sender';
};

export default function UnifiedMessageDetail({ thread, onClose, onSendReply }: UnifiedMessageDetailProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);

  const latestMessage = thread?.messages[thread.messages.length - 1] || null;

  const canSend = useMemo(() => {
    if (!thread || !onSendReply || sending) return false;
    const hasText = replyBody.trim().length > 0;
    const hasAttachments = attachments.length > 0;

    if (isEmailThread(thread)) {
      return hasText;
    }

    return hasText || hasAttachments;
  }, [thread, onSendReply, replyBody, attachments.length, sending]);

  const handleAddAttachments = (incomingFiles: FileList | null) => {
    if (!incomingFiles?.length) return;
    setAttachments((prev) => [...prev, ...Array.from(incomingFiles)]);
  };

  const handleSend = async () => {
    if (!thread || !onSendReply) return;
    const hasText = replyBody.trim().length > 0;
    const hasAttachments = attachments.length > 0;
    if (!hasText && !hasAttachments) return;
    if (isEmailThread(thread) && !hasText) return;

    setSending(true);
    try {
      await onSendReply({ thread, body: replyBody.trim(), attachments });
      setReplyBody('');
      setAttachments([]);
      setIsReplying(false);
    } finally {
      setSending(false);
    }
  };

  if (!thread) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
        <Mail className="h-16 w-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">Select a conversation to read</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white dark:bg-gray-800">
      <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight mb-2">
              {thread.conversation.subject || '(No Subject)'}
            </h2>
            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
              <span>{getSenderLabel(thread)}</span>
              <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                {thread.conversation.channel}
              </span>
              {latestMessage?.sent_at && <span>{format(new Date(latestMessage.sent_at), 'PPP p')}</span>}
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 md:hidden"
            >
              <X className="h-6 w-6" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-gray-800 space-y-4">
        {thread.messages.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">No messages yet.</div>
        ) : (
          thread.messages.map((message) => {
            const inbound = message.direction === 'inbound';
            return (
              <div key={message.id} className={`flex ${inbound ? 'justify-start' : 'justify-end'}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${
                    inbound
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                      : 'bg-primary text-white'
                  }`}
                >
                  <div className="whitespace-pre-wrap">
                    {message.body_text || (message.body_html ? message.body_html.replace(/<[^>]*>?/gm, '') : '(No content)')}
                  </div>

                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {message.attachments.map((attachment) =>
                        attachment.storage_path ? (
                          <a
                            key={attachment.id}
                            href={attachment.storage_path}
                            target="_blank"
                            rel="noreferrer"
                            className={`block text-xs underline ${
                              inbound ? 'text-gray-600 dark:text-gray-300' : 'text-white/90'
                            }`}
                          >
                            {attachment.filename}
                          </a>
                        ) : (
                          <span
                            key={attachment.id}
                            className={`block text-xs ${
                              inbound ? 'text-gray-600 dark:text-gray-300' : 'text-white/90'
                            }`}
                          >
                            {attachment.filename}
                          </span>
                        )
                      )}
                    </div>
                  )}

                  <div className={`mt-2 text-[11px] ${inbound ? 'text-gray-500 dark:text-gray-400' : 'text-white/80'}`}>
                    {format(new Date(message.sent_at), 'MMM d, h:mm a')}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900 space-y-3">
        <button
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none"
          onClick={() => setIsReplying((prev) => !prev)}
        >
          <Reply className="h-4 w-4 mr-2" />
          {isReplying ? 'Cancel Reply' : 'Reply'}
        </button>

        {isReplying && (
          <div className="space-y-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
            <textarea
              value={replyBody}
              onChange={(event) => setReplyBody(event.target.value)}
              rows={5}
              placeholder="Write your reply..."
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
            />

            <div className="flex items-center justify-between gap-3">
              <label className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                <Paperclip className="h-4 w-4 mr-2" />
                Attach files
                <input
                  type="file"
                  className="hidden"
                  multiple
                  onChange={(event) => handleAddAttachments(event.target.files)}
                />
              </label>

              <button
                type="button"
                disabled={!canSend}
                onClick={handleSend}
                className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-white text-sm font-medium disabled:opacity-60"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Reply'
                )}
              </button>
            </div>

            {attachments.length > 0 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                {attachments.map((attachment, index) => (
                  <div key={`${attachment.name}-${index}`}>{attachment.name}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
