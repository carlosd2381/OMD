import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Calendar, FileText, DollarSign, CheckSquare } from 'lucide-react';
import { eventService } from '../../services/eventService';
import type { Event } from '../../types/event';
import NotesTab from '../../components/NotesTab';
import EventTimeline from './EventTimeline';
import toast from 'react-hot-toast';

type Tab = 'overview' | 'timeline' | 'run_sheet' | 'financials' | 'tasks' | 'notes';

export default function EventDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
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
    { id: 'notes', label: 'Notes' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/events" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
        </div>
        <div className="flex space-x-3">
          <Link
            to={`/events/${event.id}/questionnaire`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
          >
            <FileText className="h-5 w-5 mr-2" />
            Questionnaire
          </Link>
          <Link
            to={`/events/${event.id}/edit`}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
          >
            <Edit className="h-5 w-5 mr-2" />
            Edit Event
          </Link>
        </div>
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
            <h3 className="text-lg leading-6 font-medium text-gray-900">Event Overview</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Details and key information.</p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Event Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{event.name}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Date</dt>
                <dd className="mt-1 text-sm text-gray-900 flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  {event.date}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">{event.status}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Guest Count</dt>
                <dd className="mt-1 text-sm text-gray-900">{event.guest_count || 'N/A'}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Budget</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {event.budget ? `$${event.budget.toLocaleString()}` : 'N/A'}
                </dd>
              </div>
              {event.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Notes</dt>
                  <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{event.notes}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      )}

      {activeTab === 'notes' && (
        <NotesTab entityId={event.id} entityType="event" />
      )}

      {activeTab === 'timeline' && (
        <EventTimeline event={event} />
      )}

      {activeTab !== 'overview' && activeTab !== 'notes' && activeTab !== 'timeline' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-12 text-center">
          {activeTab === 'run_sheet' && <FileText className="mx-auto h-12 w-12 text-gray-400" />}
          {activeTab === 'financials' && <DollarSign className="mx-auto h-12 w-12 text-gray-400" />}
          {activeTab === 'tasks' && <CheckSquare className="mx-auto h-12 w-12 text-gray-400" />}
          
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {tabs.find(t => t.id === activeTab)?.label}
          </h3>
          <p className="mt-1 text-sm text-gray-500">This feature is coming soon.</p>
        </div>
      )}
    </div>
  );
}
