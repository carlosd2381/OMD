import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Mail, Phone, Calendar, Users, MapPin, Tag, MessageSquare, UserPlus } from 'lucide-react';
import { leadService } from '../../services/leadService';
import { clientService } from '../../services/clientService';
import { eventService } from '../../services/eventService';
import { useConfirm } from '../../contexts/ConfirmContext';
import type { Lead } from '../../types/lead';
import NotesTab from '../../components/NotesTab';
import toast from 'react-hot-toast';
import MessageList from '../messages/MessageList';
import MessageDetail from '../messages/MessageDetail';
import { emailService } from '../../services/emailService';
import type { Email } from '../../types/email';

export default function LeadDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'messages' | 'notes'>('overview');
  const [messages, setMessages] = useState<Email[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Email | null>(null);

  useEffect(() => {
    if (activeTab === 'messages' && lead?.email) {
      const loadMessages = async () => {
        setMessagesLoading(true);
        try {
          const fetched = await emailService.getEmailsByContact(lead.email);
          setMessages(fetched);
        } catch (error) {
          console.error("Failed to load messages", error);
          toast.error("Failed to load messages");
        } finally {
          setMessagesLoading(false);
        }
      };
      loadMessages();
    }
  }, [activeTab, lead?.email]);

  useEffect(() => {
    if (id) {
      loadLead(id);
    }
  }, [id]);

  const loadLead = async (leadId: string) => {
    try {
      const data = await leadService.getLead(leadId);
      if (data) {
        setLead(data);
      } else {
        toast.error('Lead not found');
        navigate('/leads');
      }
    } catch (error) {
      toast.error('Failed to load lead details');
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToClient = async () => {
    if (!lead) return;

    const confirmed = await confirm({
      title: 'Convert to Client',
      message: 'Are you sure you want to convert this lead to a client? This will create a new client profile.',
      confirmLabel: 'Convert',
      type: 'info'
    });

    if (!confirmed) return;

    try {
      // 1. Create Client
      const newClient = await clientService.createClient({
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        role: lead.role,
        type: 'Direct', // Defaulting to Direct as per flow
        lead_source: lead.lead_source,
        notes: lead.notes,
      });

      // 2. Create Event (always create an event for the client)
      // Create an event for this client
      await eventService.createEvent({
        name: `${lead.first_name} ${lead.last_name}'s Event`,
        date: lead.event_date || new Date().toISOString(),
        type: lead.event_type || 'wedding',
        client_id: newClient.id,
        status: 'inquiry',
        guest_count: lead.guest_count,
        budget: lead.budget,
        venue_name: lead.venue_name,
        services: lead.services_interested
      });
      toast.success('Event created from lead details');

      // 3. Update Lead Status
      await leadService.updateLead(lead.id, { status: 'Converted' });

      toast.success('Lead converted to Client successfully!');
      
      // 4. Navigate to Client Details
      navigate(`/clients/${newClient.id}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to convert lead');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'bg-blue-100 text-blue-800';
      case 'Contacted': return 'bg-yellow-100 text-yellow-800';
      case 'Qualified': return 'bg-green-100 text-green-800';
      case 'Converted': return 'bg-purple-100 text-purple-800';
      case 'Lost': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (!lead) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/leads" className="text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">{lead.first_name} {lead.last_name}</h1>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
            {lead.status}
          </span>
        </div>
        <div className="flex space-x-3">
          {lead.status !== 'Converted' && (
            <button
              onClick={handleConvertToClient}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <UserPlus className="h-5 w-5 mr-2" />
              Convert to Client
            </button>
          )}
          <Link
            to={`/leads/${lead.id}/edit`}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <Edit className="h-5 w-5 mr-2" />
            Edit
          </Link>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`${
              activeTab === 'overview'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`${
              activeTab === 'messages'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Messages
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`${
              activeTab === 'notes'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Notes
          </button>
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Client Details Section */}
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white dark:text-white">Client Details</h3>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 dark:border-gray-700 px-4 py-5 sm:px-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Full Name</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white">{lead.first_name} {lead.last_name}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Role</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white">{lead.role || 'N/A'}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-gray-400" />
                    <a href={`mailto:${lead.email}`} className="text-primary hover:text-primary/80">{lead.email}</a>
                  </dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Phone</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-gray-400" />
                    {lead.phone ? (
                      <a href={`tel:${lead.phone}`} className="text-gray-900 dark:text-white dark:text-white hover:text-gray-700">{lead.phone}</a>
                    ) : (
                      <span className="text-gray-400 italic">No phone provided</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Venue Details Section */}
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white dark:text-white">Venue Details</h3>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 dark:border-gray-700 px-4 py-5 sm:px-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Venue Name</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                    {lead.venue_name || 'TBD'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Event Details Section */}
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white dark:text-white">Event Details</h3>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 dark:border-gray-700 px-4 py-5 sm:px-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Event Type</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white">{lead.event_type || 'N/A'}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Event Date</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    {lead.event_date || 'N/A'}
                  </dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Guest Count</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white flex items-center">
                    <Users className="h-4 w-4 mr-2 text-gray-400" />
                    {lead.guest_count || 'TBD'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Services Section */}
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white dark:text-white">Services</h3>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 dark:border-gray-700 px-4 py-5 sm:px-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Services Interested</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white flex flex-wrap gap-2">
                    {lead.services_interested && lead.services_interested.length > 0 ? (
                      lead.services_interested.map((service, index) => (
                        <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                          <Tag className="h-3 w-3 mr-1" />
                          {service}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400 italic">No specific services selected</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Other Details Section */}
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white dark:text-white">Other Details</h3>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 dark:border-gray-700 px-4 py-5 sm:px-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Inquiry Date</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : 'N/A'}
                  </dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Lead Source</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white">{lead.lead_source || 'N/A'}</dd>
                </div>
                {lead.notes && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Notes</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white whitespace-pre-wrap">{lead.notes}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden h-[600px] flex">
          <div className={`${selectedMessage ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 flex-col border-r border-gray-200 dark:border-gray-700`}>
             <MessageList 
               emails={messages} 
               loading={messagesLoading} 
               onSelectEmail={setSelectedMessage}
               selectedEmailId={selectedMessage?.id}
             />
          </div>
          <div className={`${selectedMessage ? 'flex' : 'hidden md:flex'} w-full md:w-2/3 flex-col`}>
             <MessageDetail email={selectedMessage} onClose={() => setSelectedMessage(null)} />
          </div>
        </div>
      )}

      {activeTab === 'notes' && (
        <NotesTab entityId={lead.id} entityType="lead" />
      )}
    </div>
  );
}