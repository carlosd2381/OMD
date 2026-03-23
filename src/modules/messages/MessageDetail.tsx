import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Loader2, Mail, Paperclip, Reply, X } from 'lucide-react';
import type { Email } from '../../types/email';

interface MessageDetailProps {
  email: Email | null;
  onClose?: () => void;
  onSendReply?: (payload: { email: Email; body: string; attachments: File[] }) => Promise<void>;
}

export default function MessageDetail({ email, onClose, onSendReply }: MessageDetailProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);

  const canSend = useMemo(
    () => Boolean(email && onSendReply && replyBody.trim().length > 0 && !sending),
    [email, onSendReply, replyBody, sending]
  );

  const handleAddAttachments = (incomingFiles: FileList | null) => {
    if (!incomingFiles?.length) return;
    setAttachments((prev) => [...prev, ...Array.from(incomingFiles)]);
  };

  const handleSend = async () => {
    if (!email || !onSendReply || !replyBody.trim()) return;
    setSending(true);
    try {
      await onSendReply({ email, body: replyBody.trim(), attachments });
      setReplyBody('');
      setAttachments([]);
      setIsReplying(false);
    } finally {
      setSending(false);
    }
  };

  if (!email) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
        <Mail className="h-16 w-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">Select a message to read</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight mb-2">
              {email.subject || '(No Subject)'}
            </h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {email.from_address.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-baseline space-x-2">
                    <span className="font-semibold text-gray-900 dark:text-white">{email.from_address}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {format(new Date(email.received_at || email.sent_at), 'PPP p')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    to {email.to_address}
                  </div>
                </div>
              </div>
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

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-gray-800">
        <div 
          className="prose prose-sm dark:prose-invert max-w-none font-sans"
          dangerouslySetInnerHTML={{ 
            __html: email.html_body || email.text_body?.replace(/\n/g, '<br/>') || '' 
          }} 
        />
      </div>

      {/* Footer Actions (Placeholder for future Reply implementation) */}
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
