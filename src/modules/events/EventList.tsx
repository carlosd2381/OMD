import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Eye, Calendar } from 'lucide-react';
import { eventService } from '../../services/eventService';
import type { Event } from '../../types/event';
import toast from 'react-hot-toast';

export default function EventList() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await eventService.deleteEvent(id);
        toast.success('Event deleted successfully');
        loadEvents();
      } catch (error) {
        toast.error('Failed to delete event');
      }
    }
  };

  const filteredEvents = events.filter(event =>
    event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Events</h1>
        <Link
          to="/events/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Event
        </Link>
      </div>

      <div className="flex items-center px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm">
        <Search className="h-5 w-5 text-gray-400 mr-3" />
        <input
          type="text"
          placeholder="Search events..."
          className="flex-1 border-none focus:ring-0 text-gray-900 placeholder-gray-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredEvents.map((event) => (
            <li key={event.id}>
              <div 
                onClick={() => navigate(`/events/${event.id}`)}
                className="px-4 py-4 sm:px-6 hover:bg-gray-50 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center min-w-0 flex-1">
                  <div className="min-w-0 flex-1 px-4 md:grid md:grid-cols-2 md:gap-4">
                    <div>
                      <p className="text-sm font-medium text-pink-600 truncate">{event.name}</p>
                      <p className="mt-1 flex items-center text-sm text-gray-500">
                        <Calendar className="shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        <span className="truncate">{event.date}</span>
                      </p>
                    </div>
                    <div className="hidden md:block">
                      <div>
                        <p className="text-sm text-gray-900">
                          Status: <span className={`capitalize ${
                            event.status === 'confirmed' ? 'text-green-600' :
                            event.status === 'inquiry' ? 'text-yellow-600' :
                            event.status === 'completed' ? 'text-blue-600' : 'text-red-600'
                          }`}>{event.status}</span>
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          Guests: {event.guest_count || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Link
                    to={`/events/${event.id}`}
                    className="text-gray-400 hover:text-gray-500"
                    title="View Details"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Eye className="h-5 w-5" />
                  </Link>
                  <Link
                    to={`/events/${event.id}/edit`}
                    className="text-gray-400 hover:text-gray-500"
                    title="Edit"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Edit className="h-5 w-5" />
                  </Link>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(event.id); }}
                    className="text-gray-400 hover:text-red-500"
                    title="Delete"
                  >
                    <Trash2 className="h-5 w-5" />
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
