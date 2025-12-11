import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Mail, Phone, Calendar, Users, MapPin, Tag, MessageSquare, UserPlus } from 'lucide-react';
import { leadService } from '../../services/leadService';
import { clientService } from '../../services/clientService';
import { eventService } from '../../services/eventService';
import type { Lead } from '../../types/lead';
import NotesTab from '../../components/NotesTab';
import toast from 'react-hot-toast';

export default function LeadDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'messages' | 'notes'>('overview');

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
    if (!confirm('Are you sure you want to convert this lead to a client? This will create a new client profile.')) return;

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
          <Link to="/leads" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{lead.first_name} {lead.last_name}</h1>
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
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
          >
            <Edit className="h-5 w-5 mr-2" />
            Edit
          </Link>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`${
              activeTab === 'overview'
                ? 'border-pink-500 text-pink-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`${
              activeTab === 'messages'
                ? 'border-pink-500 text-pink-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Messages
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`${
              activeTab === 'notes'
                ? 'border-pink-500 text-pink-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Notes
          </button>
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Client Details Section */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Client Details</h3>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{lead.first_name} {lead.last_name}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Role</dt>
                  <dd className="mt-1 text-sm text-gray-900">{lead.role || 'N/A'}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900 flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-gray-400" />
                    <a href={`mailto:${lead.email}`} className="text-pink-600 hover:text-pink-500">{lead.email}</a>
                  </dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Phone</dt>
                  <dd className="mt-1 text-sm text-gray-900 flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-gray-400" />
                    {lead.phone ? (
                      <a href={`tel:${lead.phone}`} className="text-gray-900 hover:text-gray-700">{lead.phone}</a>
                    ) : (
                      <span className="text-gray-400 italic">No phone provided</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Venue Details Section */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Venue Details</h3>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Venue Name</dt>
                  <dd className="mt-1 text-sm text-gray-900 flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                    {lead.venue_name || 'TBD'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Event Details Section */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Event Details</h3>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Event Type</dt>
                  <dd className="mt-1 text-sm text-gray-900">{lead.event_type || 'N/A'}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Event Date</dt>
                  <dd className="mt-1 text-sm text-gray-900 flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    {lead.event_date || 'N/A'}
                  </dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Guest Count</dt>
                  <dd className="mt-1 text-sm text-gray-900 flex items-center">
                    <Users className="h-4 w-4 mr-2 text-gray-400" />
                    {lead.guest_count || 'TBD'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Services Section */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Services</h3>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Services Interested</dt>
                  <dd className="mt-1 text-sm text-gray-900 flex flex-wrap gap-2">
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
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Other Details</h3>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Lead Source</dt>
                  <dd className="mt-1 text-sm text-gray-900">{lead.lead_source || 'N/A'}</dd>
                </div>
                {lead.notes && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Notes</dt>
                    <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{lead.notes}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6 text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Messages</h3>
          <p className="mt-1 text-sm text-gray-500">Email and chat history coming soon.</p>
        </div>
      )}

      {activeTab === 'notes' && (
        <NotesTab entityId={lead.id} entityType="lead" />
      )}
    </div>
  );
}