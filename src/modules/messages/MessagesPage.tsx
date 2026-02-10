import { useState, useEffect } from 'react';
import { Mail, RefreshCw, Search, PenSquare } from 'lucide-react';
import { emailService } from '../../services/emailService';
import type { Email } from '../../types/email';
import MessageList from './MessageList';
import MessageDetail from './MessageDetail';
import toast from 'react-hot-toast';

export default function MessagesPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadEmails();
  }, []);

  const loadEmails = async () => {
    setLoading(true);
    try {
      // Fetch page 1, unread + read
      const { emails } = await emailService.getEmails(1, 50, { search: searchQuery });
      setEmails(emails);
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
    await loadEmails();
  };

  const handleSelectEmail = async (email: Email) => {
    setSelectedEmail(email);
    if (email.status === 'unread') {
      try {
        await emailService.markAsRead(email.id);
        // Update local state
        setEmails(prev => prev.map(e => e.id === email.id ? { ...e, status: 'read' } : e));
      } catch (err) {
        console.error('Failed to mark email as read', err);
      }
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-gray-50 dark:bg-gray-900 -m-6"> 
      {/* Sidebar List */}
      <div className={`${selectedEmail ? 'hidden md:flex' : 'flex'} w-full md:w-96 flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800`}>
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
                onKeyDown={(e) => e.key === 'Enter' && loadEmails()}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-gray-50 dark:bg-gray-700 placeholder-gray-500 focus:outline-none focus:bg-white dark:focus:bg-gray-600 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
             />
           </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          <MessageList 
            emails={emails} 
            loading={loading && !refreshing}
            onSelectEmail={handleSelectEmail}
            selectedEmailId={selectedEmail?.id}
          />
        </div>
      </div>

      {/* Detail View */}
      <div className={`${selectedEmail ? 'flex' : 'hidden md:flex'} flex-1 flex-col overflow-hidden`}>
        <MessageDetail 
          email={selectedEmail} 
          onClose={() => setSelectedEmail(null)}
        />
      </div>
    </div>
  );
}
