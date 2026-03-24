import { useState, useEffect } from 'react';
import { Mail, RefreshCw, Search, PenSquare } from 'lucide-react';
import { emailService } from '../../services/emailService';
import { conversationService, type ConversationThread } from '../../services/conversationService';
import { socialMessageService } from '../../services/socialMessageService';
import UnifiedMessageList from './UnifiedMessageList';
import UnifiedMessageDetail from './UnifiedMessageDetail';
import toast from 'react-hot-toast';

interface SyncStatus {
  synced: number;
  processed: number;
  remaining: number;
  timestamp: string;
}

export default function MessagesPage() {
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedThread, setSelectedThread] = useState<ConversationThread | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const data = await conversationService.getInboxConversations(100);
      setThreads(data);

      if (selectedThread?.conversation.id) {
        const refreshed = data.find((thread) => thread.conversation.id === selectedThread.conversation.id);
        if (refreshed) setSelectedThread(refreshed);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const syncResult = await emailService.syncInbox();
      if (
        typeof syncResult.synced === 'number' &&
        typeof syncResult.processed === 'number' &&
        typeof syncResult.remaining === 'number'
      ) {
        setSyncStatus({
          synced: syncResult.synced,
          processed: syncResult.processed,
          remaining: syncResult.remaining,
          timestamp: new Date().toISOString(),
        });
      }

      if (typeof syncResult.synced === 'number') {
        const remainingText = typeof syncResult.remaining === 'number' ? `, ${syncResult.remaining} remaining` : '';
        toast.success(`Inbox synced (${syncResult.synced} new${remainingText})`);
      }

      if ((syncResult.failed || 0) > 0) {
        const firstError = syncResult.writeErrors?.[0];
        const errorText = firstError?.message || 'One or more messages failed to save';
        toast.error(`Sync saved=${syncResult.synced || 0}, failed=${syncResult.failed}. ${errorText}`);
      }
    } catch (error) {
      console.error('Inbox sync failed, loading cached data', error);
      toast.error(error instanceof Error ? error.message : 'Inbox sync failed');
    }

    await loadConversations();
  };

  const handleSelectThread = async (thread: ConversationThread) => {
    try {
      const detailed = await conversationService.getConversationThread(thread.conversation.id);
      let nextThread = detailed || thread;

      if (nextThread.conversation.channel === 'email') {
          const hasMissingBody = nextThread.messages.some(
            (msg) => msg.direction === 'inbound' && !getBodyContent(msg).trim(),
          );

        if (hasMissingBody) {
          const hydrateResult = await conversationService.hydrateConversationEmailBodies(nextThread.conversation.id, 3);
          if (hydrateResult.hydrated > 0) {
            const refreshedThread = await conversationService.getConversationThread(nextThread.conversation.id);
            if (refreshedThread) {
              nextThread = refreshedThread;
            }
          }
        }
      }

      setSelectedThread(nextThread);

      if ((thread.conversation.unread_count || 0) > 0) {
        await conversationService.markConversationRead(thread.conversation.id);
        setThreads((previous) =>
          previous.map((item) =>
            item.conversation.id === thread.conversation.id
              ? {
                  ...item,
                  conversation: { ...item.conversation, unread_count: 0 },
                }
              : item
          )
        );
      }
    } catch (error) {
      console.error('Failed to open conversation', error);
      toast.error('Failed to open conversation');
    }
  };

  const handleSendReply = async ({ thread, body, attachments }: { thread: ConversationThread; body: string; attachments: File[] }) => {
    try {
      if (thread.conversation.channel === 'email') {
        const recipient = thread.participants.find((participant) => participant.role === 'client' && participant.email)?.email;
        if (!recipient) {
          throw new Error('Recipient email is missing for this conversation.');
        }

        const latestInbound = [...thread.messages].reverse().find((message) => message.direction === 'inbound');
        const normalizedSubject = thread.conversation.subject?.toLowerCase().startsWith('re:')
          ? thread.conversation.subject
          : `Re: ${thread.conversation.subject || '(No Subject)'}`;

        const encodedAttachments = await emailService.prepareAttachments(attachments);

        const sendResult = await emailService.sendEmail({
          to: recipient,
          subject: normalizedSubject,
          text: body,
          inReplyTo: latestInbound?.external_message_id || undefined,
          references: latestInbound?.external_message_id || undefined,
          attachments: encodedAttachments,
        });

        await conversationService.logOutboundEmailMessage(
          thread.conversation.id,
          body,
          sendResult.message_id || `outbound-email-${Date.now()}`,
          attachments.map((attachment) => ({
            filename: attachment.name,
            mime_type: attachment.type || 'application/octet-stream',
            size_bytes: attachment.size,
          }))
        );
      } else {
        const recipientId = thread.participants.find(
          (participant) => participant.role === 'client' && participant.external_user_id
        )?.external_user_id;

        if (!recipientId) {
          throw new Error('Recipient social account is missing for this conversation.');
        }

        if (body.trim()) {
          await socialMessageService.sendMessage({
            platform: thread.conversation.channel,
            recipientId,
            text: body,
            conversationId: thread.conversation.id,
          });
        }

        if (attachments.length > 0) {
          const attachmentUrls = await socialMessageService.uploadAttachments(attachments);
          for (const attachmentUrl of attachmentUrls) {
            await socialMessageService.sendMessage({
              platform: thread.conversation.channel,
              recipientId,
              attachmentUrl,
              conversationId: thread.conversation.id,
            });
          }
        }
      }

      await loadConversations();
      const updated = await conversationService.getConversationThread(thread.conversation.id);
      if (updated) setSelectedThread(updated);

      toast.success('Reply sent');
    } catch (error) {
      console.error('Failed to send reply', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send reply');
      throw error;
    }
  };

  const filteredThreads = threads.filter((thread) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const sender = thread.participants.find((participant) => participant.role === 'client');
    const latestBody = thread.messages[thread.messages.length - 1]?.body_text || '';

    return (
      (thread.conversation.subject || '').toLowerCase().includes(query) ||
      (sender?.display_name || '').toLowerCase().includes(query) ||
      (sender?.email || '').toLowerCase().includes(query) ||
      latestBody.toLowerCase().includes(query)
    );
  });

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-gray-50 dark:bg-gray-900 -m-6"> 
      {/* Sidebar List */}
      <div className={`${selectedThread ? 'hidden md:flex' : 'flex'} w-full md:w-96 flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800`}>
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
           <div className="flex items-center justify-between">
             <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
               <Mail className="h-5 w-5 mr-2" />
               Inbox
             </h1>
             <div className="flex space-x-1">
               <button 
                 onClick={handleRefresh}
                 className={`p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 ${refreshing ? 'animate-spin' : ''}`}
                 title="Refresh"
               >
                 <RefreshCw className="h-4 w-4" />
               </button>
               {/* Compose Button Placeholder */}
               <button 
                 className="p-2 text-primary hover:text-primary/80 rounded-full hover:bg-primary/10"
                 title="Compose"
               >
                 <PenSquare className="h-4 w-4" />
               </button>
             </div>
           </div>
           
           <div className="relative">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
               <Search className="h-4 w-4 text-gray-400" />
             </div>
             <input
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-gray-50 dark:bg-gray-700 placeholder-gray-500 focus:outline-none focus:bg-white dark:focus:bg-gray-600 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
             />
           </div>

           {syncStatus ? (
             <p className="text-xs text-gray-500 dark:text-gray-400">
               Last sync: {syncStatus.synced} saved of {syncStatus.processed} processed, {syncStatus.remaining} remaining
             </p>
           ) : null}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          <UnifiedMessageList
            threads={filteredThreads}
            loading={loading && !refreshing}
            onSelectThread={handleSelectThread}
            selectedConversationId={selectedThread?.conversation.id}
          />
        </div>
      </div>

      {/* Detail View */}
      <div className={`${selectedThread ? 'flex' : 'hidden md:flex'} flex-1 flex-col overflow-hidden`}>
        <UnifiedMessageDetail
          thread={selectedThread}
          onClose={() => setSelectedThread(null)}
          onSendReply={handleSendReply}
        />
      </div>
    </div>
  );
}
