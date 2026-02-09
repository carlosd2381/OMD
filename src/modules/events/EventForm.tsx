import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { eventService } from '../../services/eventService';
import { clientService } from '../../services/clientService';
import { venueService } from '../../services/venueService';
import type { Event } from '../../types/event';
import type { Client } from '../../types/client';
import type { Venue } from '../../types/venue';
import toast from 'react-hot-toast';

export default function EventForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  
  const [formData, setFormData] = useState<Partial<Event>>({
    name: '',
    date: '',
    client_id: '',
    secondary_client_id: '',
    venue_id: '',
    status: 'inquiry',
    guest_count: 0,
    budget: 0,
    notes: ''
  });

  useEffect(() => {
    loadClients();
    loadVenues();
    if (isEditing && id) {
      loadEvent(id);
    }
  }, [isEditing, id]);

  const loadClients = async () => {
    try {
      const data = await clientService.getClients();
      setClients(data);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error('Failed to load clients');
    }
  };

  const loadVenues = async () => {
    try {
      const data = await venueService.getVenues();
      setVenues(data);
    } catch (error) {
      console.error('Error loading venues:', error);
      toast.error('Failed to load venues');
    }
  };

  const loadEvent = async (eventId: string) => {
    try {
      setLoading(true);
      const data = await eventService.getEvent(eventId);
      if (data) {
        setFormData(data);
      }
    } catch (error) {
      toast.error('Failed to load event');
      navigate('/events');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Sanitize form data
      const payload: any = { ...formData };
      
      // Convert empty strings to null for foreign keys
      payload.venue_id = payload.venue_id || null;
      payload.secondary_client_id = payload.secondary_client_id || null;

      // Remove system fields that shouldn't be sent to the API
      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;

      if (isEditing && id) {
        await eventService.updateEvent(id, payload);
        toast.success('Event updated successfully');
      } else {
        await eventService.createEvent(payload as any);
        toast.success('Event created successfully');
      }
      navigate('/events');
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (loading && isEditing) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/events" className="text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">
            {isEditing ? 'Edit Event' : 'New Event'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-gray-200 bg-white dark:bg-gray-800 dark:bg-gray-800 p-6 shadow rounded-lg">
        <div className="space-y-6 sm:space-y-5">
          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 dark:border-gray-700 dark:border-gray-700 sm:pt-5">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">
              Event Name
            </label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <input
                type="text"
                name="name"
                id="name"
                required
                value={formData.name || ''}
                onChange={handleChange}
                className="max-w-lg block w-full shadow-sm focus:ring-primary focus:border-primary sm:max-w-xs sm:text-sm border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 dark:border-gray-700 dark:border-gray-700 sm:pt-5">
            <label htmlFor="client_id" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">
              Primary Client
            </label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <select
                id="client_id"
                name="client_id"
                required
                value={formData.client_id || ''}
                onChange={handleChange}
                className="max-w-lg block w-full shadow-sm focus:ring-primary focus:border-primary sm:max-w-xs sm:text-sm border-gray-300 rounded-md"
              >
                <option value="">Select a client</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.first_name} {client.last_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 dark:border-gray-700 dark:border-gray-700 sm:pt-5">
            <label htmlFor="secondary_client_id" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">
              Secondary Client (Optional)
            </label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <select
                id="secondary_client_id"
                name="secondary_client_id"
                value={formData.secondary_client_id || ''}
                onChange={handleChange}
                className="max-w-lg block w-full shadow-sm focus:ring-primary focus:border-primary sm:max-w-xs sm:text-sm border-gray-300 rounded-md"
              >
                <option value="">None</option>
                {clients.filter(c => c.id !== formData.client_id).map(client => (
                  <option key={client.id} value={client.id}>
                    {client.first_name} {client.last_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 dark:border-gray-700 dark:border-gray-700 sm:pt-5">
            <label htmlFor="venue_id" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">
              Venue
            </label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <select
                id="venue_id"
                name="venue_id"
                value={formData.venue_id || ''}
                onChange={handleChange}
                className="max-w-lg block w-full shadow-sm focus:ring-primary focus:border-primary sm:max-w-xs sm:text-sm border-gray-300 rounded-md"
              >
                <option value="">No Venue Assigned</option>
                {venues.map(venue => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 dark:border-gray-700 dark:border-gray-700 sm:pt-5">
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">
              Date
            </label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <input
                type="date"
                name="date"
                id="date"
                required
                value={formData.date || ''}
                onChange={handleChange}
                className="max-w-lg block w-full shadow-sm focus:ring-primary focus:border-primary sm:max-w-xs sm:text-sm border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 dark:border-gray-700 dark:border-gray-700 sm:pt-5">
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">
              Status
            </label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <select
                id="status"
                name="status"
                value={formData.status || 'inquiry'}
                onChange={handleChange}
                className="max-w-lg block w-full shadow-sm focus:ring-primary focus:border-primary sm:max-w-xs sm:text-sm border-gray-300 rounded-md"
              >
                <option value="inquiry">Inquiry</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 dark:border-gray-700 dark:border-gray-700 sm:pt-5">
            <label htmlFor="guest_count" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">
              Guest Count
            </label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <input
                type="number"
                name="guest_count"
                id="guest_count"
                value={formData.guest_count || ''}
                onChange={handleChange}
                className="max-w-lg block w-full shadow-sm focus:ring-primary focus:border-primary sm:max-w-xs sm:text-sm border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 dark:border-gray-700 dark:border-gray-700 sm:pt-5">
            <label htmlFor="budget" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">
              Budget
            </label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <input
                type="number"
                name="budget"
                id="budget"
                value={formData.budget || ''}
                onChange={handleChange}
                className="max-w-lg block w-full shadow-sm focus:ring-primary focus:border-primary sm:max-w-xs sm:text-sm border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 dark:border-gray-700 dark:border-gray-700 sm:pt-5">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">
              Notes
            </label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <textarea
                id="notes"
                name="notes"
                rows={3}
                value={formData.notes || ''}
                onChange={handleChange}
                className="max-w-lg shadow-sm block w-full focus:ring-primary focus:border-primary sm:text-sm border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>

        <div className="pt-5">
          <div className="flex justify-end">
            <Link
              to="/events"
              className="bg-white dark:bg-gray-800 dark:bg-gray-800 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
            >
              <Save className="h-5 w-5 mr-2" />
              Save
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
