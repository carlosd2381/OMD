import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Globe, Mail, Phone, User, MessageSquare, Calendar, FileText, CheckSquare, Settings } from 'lucide-react';
import { venueService } from '../../services/venueService';
import type { Venue, VenueContact } from '../../types/venue';
import NotesTab from '../../components/NotesTab';
import toast from 'react-hot-toast';

type Tab = 'overview' | 'contacts' | 'messages' | 'events' | 'facturas' | 'tasks' | 'notes' | 'settings';

export default function VenueDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [contacts, setContacts] = useState<VenueContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  useEffect(() => {
    if (id) {
      loadVenue(id);
    }
  }, [id]);

  const loadVenue = async (venueId: string) => {
    try {
      const [venueData, contactsData] = await Promise.all([
        venueService.getVenue(venueId),
        venueService.getVenueContacts(venueId)
      ]);
      
      if (venueData) {
        setVenue(venueData);
        setContacts(contactsData);
      } else {
        toast.error('Venue not found');
        navigate('/venues');
      }
    } catch (error) {
      toast.error('Failed to load venue details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (!venue) {
    return null;
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'contacts', label: 'Contacts' },
    { id: 'messages', label: 'Messages' },
    { id: 'events', label: 'Events' },
    { id: 'facturas', label: 'Facturas' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'notes', label: 'Notes' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/venues" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{venue.name}</h1>
        </div>
        <Link
          to={`/venues/${venue.id}/edit`}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
        >
          <Edit className="h-5 w-5 mr-2" />
          Edit
        </Link>
      </div>

      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-pink-500 text-pink-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Venue Overview</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Details and contact information.</p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Venue Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{venue.name}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Area</dt>
                <dd className="mt-1 text-sm text-gray-900">{venue.venue_area || 'N/A'}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Address</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {venue.address}<br />
                  {venue.city && `${venue.city}, `}{venue.state} {venue.zip_code}<br />
                  {venue.country}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Contact Info</dt>
                <dd className="mt-1 text-sm text-gray-900 space-y-1">
                  {venue.email && (
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-gray-400" />
                      <a href={`mailto:${venue.email}`} className="text-pink-600 hover:text-pink-500">{venue.email}</a>
                    </div>
                  )}
                  {venue.phone && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-gray-400" />
                      <a href={`tel:${venue.phone}`} className="text-gray-900 hover:text-gray-700">{venue.phone}</a>
                    </div>
                  )}
                  {venue.website && (
                    <div className="flex items-center">
                      <Globe className="h-4 w-4 mr-2 text-gray-400" />
                      <a href={venue.website} target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:text-pink-500">Website</a>
                    </div>
                  )}
                </dd>
              </div>
              {venue.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Notes</dt>
                  <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{venue.notes}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      )}

      {activeTab === 'contacts' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Contacts</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Associated contacts for this venue.</p>
          </div>
          {contacts.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {contacts.map((contact) => (
                <li key={contact.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="shrink-0">
                        <User className="h-10 w-10 rounded-full bg-gray-100 p-2 text-gray-500" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {contact.first_name} {contact.last_name}
                          {contact.is_primary && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{contact.role}</div>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-gray-900">{contact.email}</div>
                      <div className="text-gray-500">{contact.phone}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-5 sm:px-6 text-gray-500 text-sm">
              No contacts found for this venue.
            </div>
          )}
        </div>
      )}

      {activeTab === 'notes' && (
        <NotesTab entityId={venue.id} entityType="venue" />
      )}

      {activeTab !== 'overview' && activeTab !== 'contacts' && activeTab !== 'notes' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-12 text-center">
          {activeTab === 'messages' && <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />}
          {activeTab === 'events' && <Calendar className="mx-auto h-12 w-12 text-gray-400" />}
          {activeTab === 'facturas' && <FileText className="mx-auto h-12 w-12 text-gray-400" />}
          {activeTab === 'tasks' && <CheckSquare className="mx-auto h-12 w-12 text-gray-400" />}
          {activeTab === 'settings' && <Settings className="mx-auto h-12 w-12 text-gray-400" />}
          
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {tabs.find(t => t.id === activeTab)?.label}
          </h3>
          <p className="mt-1 text-sm text-gray-500">This feature is coming soon.</p>
        </div>
      )}
    </div>
  );
}