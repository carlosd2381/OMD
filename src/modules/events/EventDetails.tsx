import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Calendar, FileText, CheckSquare } from 'lucide-react';
import { eventService } from '../../services/eventService';
import { venueService } from '../../services/venueService';
import { quoteService } from '../../services/quoteService';
import type { Event } from '../../types/event';
import type { Venue } from '../../types/venue';
import type { Quote } from '../../types/quote';
import NotesTab from '../../components/NotesTab';
import EventTimeline from './EventTimeline';
import RunSheetTab from './RunSheetTab';
import EventStaffTab from './EventStaffTab';
import EventFinancialsTab from './EventFinancialsTab';
import DataPromotion from './components/DataPromotion';
import toast from 'react-hot-toast';

type Tab = 'overview' | 'timeline' | 'run_sheet' | 'financials' | 'tasks' | 'staff' | 'notes';

export default function EventDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [acceptedQuote, setAcceptedQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  useEffect(() => {
    if (id) {
      loadEvent(id);
    }
  }, [id]);

  const loadEvent = async (eventId: string) => {
    try {
      const data = await eventService.getEvent(eventId);
      if (data) {
        setEvent(data);
        
        // Load Venue
        if (data.venue_id) {
          try {
            const venueData = await venueService.getVenue(data.venue_id);
            setVenue(venueData);
          } catch (error) {
            console.error('Failed to load venue details', error);
          }
        }

        // Load Accepted Quote
        try {
          const quotes = await quoteService.getQuotesByEvent(eventId);
          const accepted = quotes.find(q => q.status === 'accepted');
          setAcceptedQuote(accepted || null);
        } catch (error) {
          console.error('Failed to load quotes', error);
        }
      } else {
        toast.error('Event not found');
        navigate('/events');
      }
    } catch (error) {
      toast.error('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (!event) {
    return null;
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'run_sheet', label: 'Run Sheet' },
    { id: 'financials', label: 'Financials' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'staff', label: 'Staff' },
    { id: 'notes', label: 'Notes' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/events" className="text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">{event.name}</h1>
        </div>
        <div className="flex space-x-3">
          <Link
            to={`/events/${event.id}/questionnaire`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <FileText className="h-5 w-5 mr-2" />
            Questionnaire
          </Link>
          <Link
            to={`/events/${event.id}/edit`}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <Edit className="h-5 w-5 mr-2" />
            Edit Event
          </Link>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700 dark:border-gray-700 overflow-x-auto">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <DataPromotion event={event} onUpdate={() => loadEvent(event.id)} />
          
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white dark:text-white">Event Overview</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">Details and key information.</p>
            </div>
          <div className="border-t border-gray-200 dark:border-gray-700 dark:border-gray-700 px-4 py-5 sm:px-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Event Name</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white">{event.name}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Venue Name</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white">{venue?.name || event.venue_name || 'No venue assigned'}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Event Date</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  {event.date}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Guest Count</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white">{event.guest_count || 'N/A'}</dd>
              </div>

              {acceptedQuote && (
                <div className="sm:col-span-2 mt-4">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 mb-2">Menu / Items</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white">
                    <ul className="border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-md divide-y divide-gray-200">
                      {acceptedQuote.items
                        .filter(item => !item.description.toLowerCase().includes('flete') && !item.description.toLowerCase().includes('delivery'))
                        .map((item) => (
                        <li key={item.id} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                          <div className="w-0 flex-1 flex items-center">
                            <span className="font-medium text-gray-900 dark:text-white dark:text-white mr-2">{item.quantity}x</span>
                            <span className="truncate">{item.description}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              )}

              {event.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Notes</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white whitespace-pre-wrap">{event.notes}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
        </div>
      )}

      {activeTab === 'notes' && (
        <NotesTab entityId={event.id} entityType="event" />
      )}

      {activeTab === 'timeline' && (
        <EventTimeline event={event} venue={venue} />
      )}

      {activeTab === 'run_sheet' && (
        <RunSheetTab event={event} venue={venue} />
      )}

      {activeTab === 'staff' && (
        <EventStaffTab event={event} />
      )}

      {activeTab === 'financials' && (
        <EventFinancialsTab event={event} venue={venue} />
      )}

      {activeTab !== 'overview' && activeTab !== 'notes' && activeTab !== 'timeline' && activeTab !== 'run_sheet' && activeTab !== 'staff' && activeTab !== 'financials' && activeTab !== 'tasks' && (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg p-12 text-center">
          <CheckSquare className="mx-auto h-12 w-12 text-gray-400" />
          
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            {tabs.find(t => t.id === activeTab)?.label}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">This feature is coming soon.</p>
        </div>
      )}
    </div>
  );
}
