import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Eye, Calendar } from 'lucide-react';
import { eventService } from '../../services/eventService';
import { useConfirm } from '../../contexts/ConfirmContext';
import type { Event } from '../../types/event';
import toast from 'react-hot-toast';

export default function EventList() {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFilters, setEventFilters] = useState({ status: 'all', type: 'all', sort: 'asc' });

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const data = await eventService.getEvents();
      setEvents(data);
    } catch (error) {
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Event',
      message: 'Are you sure you want to delete this event? This action cannot be undone.',
      confirmLabel: 'Delete',
      type: 'danger'
    });

    if (confirmed) {
      try {
        await eventService.deleteEvent(id);
        toast.success('Event deleted successfully');
        loadEvents();
      } catch (error) {
        toast.error('Failed to delete event');
      }
    }
  };

  const availableStatuses = useMemo(() => {
    return Array.from(new Set(events.map(event => event.status))).sort();
  }, [events]);

  const availableEventTypes = useMemo(() => {
    return Array.from(new Set(events.map(event => event.type).filter(Boolean))).sort();
  }, [events]);

  const sortedEvents = useMemo(() => {
    const direction = eventFilters.sort === 'asc' ? 1 : -1;
    return [...events].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : Number.POSITIVE_INFINITY;
      const dateB = b.date ? new Date(b.date).getTime() : Number.POSITIVE_INFINITY;
      if (dateA === dateB) {
        return a.name.localeCompare(b.name) * direction;
      }
      return (dateA - dateB) * direction;
    });
  }, [events, eventFilters.sort]);

  const filteredEvents = sortedEvents.filter(event => {
    const matchesSearch =
      event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.status.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    const matchesStatus = eventFilters.status === 'all' || event.status === eventFilters.status;
    const matchesType = eventFilters.type === 'all' || event.type === eventFilters.type;
    return matchesStatus && matchesType;
  });

  const resetEventFilters = () => setEventFilters({ status: 'all', type: 'all', sort: 'asc' });

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">Events</h1>
        <Link
          to="/events/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Event
        </Link>
      </div>

      <div className="space-y-3">
        <div className="flex items-center px-4 py-3 bg-white dark:bg-gray-800 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg shadow-sm">
          <Search className="h-5 w-5 text-gray-400 mr-3" />
          <input
            type="text"
            placeholder="Search events..."
            className="flex-1 border-none focus:ring-0 text-gray-900 dark:text-white dark:text-white placeholder-gray-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg shadow-sm p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select
                className="w-full rounded-md border-gray-300 focus:ring-primary focus:border-primary text-sm"
                value={eventFilters.status}
                onChange={(e) => setEventFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="all">All Statuses</option>
                {availableStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Event Type</label>
              <select
                className="w-full rounded-md border-gray-300 focus:ring-primary focus:border-primary text-sm"
                value={eventFilters.type}
                onChange={(e) => setEventFilters(prev => ({ ...prev, type: e.target.value }))}
              >
                <option value="all">All Types</option>
                {availableEventTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Sort</label>
              <select
                className="w-full rounded-md border-gray-300 focus:ring-primary focus:border-primary text-sm"
                value={eventFilters.sort}
                onChange={(e) => setEventFilters(prev => ({ ...prev, sort: e.target.value as 'asc' | 'desc' }))}
              >
                <option value="asc">Date: Earliest first</option>
                <option value="desc">Date: Latest first</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={resetEventFilters}
                className="w-full px-4 py-2 text-sm font-medium text-primary hover:text-primary/80"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredEvents.map((event) => (
            <li key={event.id}>
              <div 
                onClick={() => navigate(`/events/${event.id}`)}
                className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center min-w-0 flex-1">
                  <div className="min-w-0 flex-1 px-4 md:grid md:grid-cols-2 md:gap-4">
                    <div>
                      <p className="text-sm font-medium text-primary truncate">{event.name}</p>
                      <p className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                        <Calendar className="shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        <span className="truncate">{event.date}</span>
                      </p>
                    </div>
                    <div className="hidden md:block">
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white dark:text-white">
                          Venue: <span className="text-gray-600">{event.venue_name || 'No Venue'}</span>
                        </p>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                          Guests: {event.guest_count || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Link
                    to={`/events/${event.id}`}
                    className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Eye className="h-4 w-4 mr-1" /> View
                  </Link>
                  <Link
                    to={`/events/${event.id}/edit`}
                    className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-blue-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Edit className="h-4 w-4 mr-1" /> Edit
                  </Link>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(event.id); }}
                    className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
