import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { 
  User, Calendar, MapPin, Briefcase, Phone, FileText, 
  Save
} from 'lucide-react';
import toast from 'react-hot-toast';
import { eventService } from '../../services/eventService';
import { clientService } from '../../services/clientService';
import { venueService } from '../../services/venueService';
import { plannerService } from '../../services/plannerService';
import type { Event } from '../../types/event';
import type { Client } from '../../types/client';

type Tab = 'client' | 'event' | 'venue' | 'planner' | 'dayof' | 'additional';

interface BookingFormData {
  // Client Details
  client_first_name: string;
  client_last_name: string;
  client_address: string;
  client_phone: string;
  client_email: string;
  client_role: string;
  client_social: string;

  // Event Details
  event_type: string;
  event_date: string;
  event_name: string;
  event_start_time: string;
  event_end_time: string;
  event_hashtag: string;
  guest_count: number;

  // Venue Details
  venue_name: string;
  venue_sub_location: string;
  venue_address: string;
  venue_contact_name: string;
  venue_contact_phone: string;
  venue_contact_email: string;

  // Planner Details
  planner_company: string;
  planner_first_name: string;
  planner_last_name: string;
  planner_phone: string;
  planner_email: string;
  planner_instagram: string;

  // Day-of Coordinator
  day_of_contact_name: string;
  day_of_contact_phone: string;

  // Additional
  additional_details: string;
}

export default function BookingQuestionnaire() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('client');
  const [loading, setLoading] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);
  const [client, setClient] = useState<Client | null>(null);

  const { register, handleSubmit, reset } = useForm<BookingFormData>();

  useEffect(() => {
    if (eventId) {
      loadData(eventId);
    }
  }, [eventId]);

  const loadData = async (id: string) => {
    setLoading(true);
    try {
      const eventData = await eventService.getEvent(id);
      if (!eventData) throw new Error('Event not found');
      setEvent(eventData);

      const clientData = await clientService.getClient(eventData.client_id);
      setClient(clientData);

      // Load Venue and Planner if linked
      let venueData = null;
      let plannerData = null;
      if (eventData.venue_id) {
        venueData = await venueService.getVenue(eventData.venue_id);
      }
      if (eventData.planner_id) {
        plannerData = await plannerService.getPlanner(eventData.planner_id);
      }

      // Pre-fill form
      reset({
        // Client
        client_first_name: clientData?.first_name || '',
        client_last_name: clientData?.last_name || '',
        client_address: clientData?.address || '',
        client_phone: clientData?.phone || '',
        client_email: clientData?.email || '',
        client_role: clientData?.relationship || clientData?.role || '',
        client_social: clientData?.instagram || '',

        // Event
        event_type: eventData.type || '',
        event_date: eventData.date || '',
        event_name: eventData.name || '',
        event_start_time: eventData.start_time || '',
        event_end_time: eventData.end_time || '',
        event_hashtag: eventData.hashtag || '',
        guest_count: eventData.guest_count || 0,

        // Venue
        venue_name: venueData?.name || eventData.venue_name || '',
        venue_sub_location: eventData.venue_sub_location || '',
        venue_address: venueData?.address || '', // We don't have venue_address on Event yet, assume linked venue or just display
        venue_contact_name: eventData.venue_contact_name || '',
        venue_contact_phone: eventData.venue_contact_phone || venueData?.phone || '',
        venue_contact_email: eventData.venue_contact_email || venueData?.email || '',

        // Planner
        planner_company: eventData.planner_company || plannerData?.company || '',
        planner_first_name: eventData.planner_name ? eventData.planner_name.split(' ')[0] : (plannerData?.first_name || ''),
        planner_last_name: eventData.planner_name ? eventData.planner_name.split(' ').slice(1).join(' ') : (plannerData?.last_name || ''),
        planner_phone: eventData.planner_phone || plannerData?.phone || '',
        planner_email: eventData.planner_email || plannerData?.email || '',
        planner_instagram: eventData.planner_instagram || plannerData?.instagram || '',

        // Day of
        day_of_contact_name: eventData.day_of_contact_name || '',
        day_of_contact_phone: eventData.day_of_contact_phone || '',

        // Additional
        additional_details: eventData.notes || ''
      });

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load booking data');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: BookingFormData) => {
    if (!event || !client) return;
    setLoading(true);
    try {
      // Update Client
      await clientService.updateClient(client.id, {
        first_name: data.client_first_name,
        last_name: data.client_last_name,
        address: data.client_address,
        phone: data.client_phone,
        relationship: data.client_role, // Save to relationship column which allows free text
        instagram: data.client_social
      });

      // Update Event
      await eventService.updateEvent(event.id, {
        name: data.event_name,
        date: data.event_date,
        type: data.event_type,
        start_time: data.event_start_time,
        end_time: data.event_end_time,
        hashtag: data.event_hashtag,
        guest_count: Number(data.guest_count),
        venue_name: data.venue_name,
        venue_sub_location: data.venue_sub_location,
        venue_contact_name: data.venue_contact_name,
        venue_contact_phone: data.venue_contact_phone,
        venue_contact_email: data.venue_contact_email,
        planner_company: data.planner_company,
        planner_name: `${data.planner_first_name} ${data.planner_last_name}`.trim(),
        planner_phone: data.planner_phone,
        planner_email: data.planner_email,
        planner_instagram: data.planner_instagram,
        day_of_contact_name: data.day_of_contact_name,
        day_of_contact_phone: data.day_of_contact_phone,
        notes: data.additional_details
      });

      // Note: Updating Venue/Planner entities from here would require more complex logic
      // to determine if we are updating an existing entity or creating a new one.
      // For now, we just update the Event/Client fields.

      toast.success('Booking details saved successfully');
    } catch (error) {
      console.error('Error saving data:', error);
      toast.error('Failed to save booking details');
    } finally {
      setLoading(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'client', label: 'Client Details', icon: User },
    { id: 'event', label: 'Event Details', icon: Calendar },
    { id: 'venue', label: 'Venue Details', icon: MapPin },
    { id: 'planner', label: 'Planner Details', icon: Briefcase },
    { id: 'dayof', label: 'Day-of Coordinator', icon: Phone },
    { id: 'additional', label: 'Additional', icon: FileText },
  ];

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">New Booking Questionnaire</h1>
        <p className="mt-2 text-sm text-gray-500">Please fill out all the details for the upcoming event.</p>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 min-w-[120px] py-4 px-4 text-sm font-medium text-center border-b-2 focus:outline-none flex flex-col items-center justify-center gap-2
                  ${activeTab === tab.id
                    ? 'border-pink-500 text-pink-600 bg-pink-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          {/* Client Details Tab */}
          {activeTab === 'client' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <input {...register('client_first_name')} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input {...register('client_last_name')} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Address (Complete)</label>
                  <input {...register('client_address')} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone #</label>
                  <input {...register('client_phone')} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input {...register('client_email')} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role/Relationship</label>
                  <input {...register('client_role')} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm" placeholder="e.g. Bride, Groom" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Social Media Usernames</label>
                  <input {...register('client_social')} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm" placeholder="@username" />
                </div>
              </div>
            </div>
          )}

          {/* Event Details Tab */}
          {activeTab === 'event' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Event Type</label>
                  <select {...register('event_type')} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm">
                    <option value="">Select Type</option>
                    <option value="Wedding">Wedding</option>
                    <option value="Social Event">Social Event</option>
                    <option value="Corporate Event">Corporate Event</option>
                    <option value="Convention">Convention</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Event Date</label>
                  <input type="date" {...register('event_date')} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Event Name</label>
                  <input {...register('event_name')} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Event Start Time</label>
                  <input type="time" {...register('event_start_time')} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Event End Time</label>
                  <input type="time" {...register('event_end_time')} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Event HashTag(s)</label>
                  <input {...register('event_hashtag')} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Guest Count</label>
                  <input type="number" {...register('guest_count')} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm" />
                </div>
              </div>
            </div>
          )}

          {/* Venue Details Tab */}
          {activeTab === 'venue' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Venue Name</label>
                  <input {...register('venue_name')} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Venue Sub-Location</label>
                  <input {...register('venue_sub_location')} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm" placeholder="e.g. Grand Ballroom" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Venue Address (Complete)</label>
                  <input {...register('venue_address')} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Venue Main Contact Name</label>
                  <input {...register('venue_contact_name')} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Venue Main Contact Phone #</label>
                  <input {...register('venue_contact_phone')} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Venue Main Contact Email</label>
                  <input {...register('venue_contact_email')} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm" />
                </div>
              </div>
            </div>
          )}

          {/* Planner Details Tab */}
          {activeTab === 'planner' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Planner Agency/Company Name</label>
                  <input {...register('planner_company')} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Lead Planner First Name</label>
                  <input {...register('planner_first_name')} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Lead Planner Last Name</label>
                  <input {...register('planner_last_name')} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Lead Planner Phone</label>
                  <input {...register('planner_phone')} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Lead Planner Email</label>
                  <input {...register('planner_email')} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Lead Planner Instagram Handle</label>
                  <input {...register('planner_instagram')} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm" />
                </div>
              </div>
            </div>
          )}

          {/* Day-of Coordinator Tab */}
          {activeTab === 'dayof' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <p className="text-sm text-gray-500 mb-4">If different from Lead Planner</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Day-of Contact Name</label>
                  <input {...register('day_of_contact_name')} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Day-of Contact Mobile #</label>
                  <input {...register('day_of_contact_phone')} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm" />
                </div>
              </div>
            </div>
          )}

          {/* Additional Details Tab */}
          {activeTab === 'additional' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Additional Details</label>
                <textarea {...register('additional_details')} rows={6} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm" placeholder="Any other important information..." />
              </div>
            </div>
          )}

          <div className="mt-8 pt-5 border-t border-gray-200 flex justify-between">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50"
            >
              <Save className="h-5 w-5 mr-2" />
              Save Booking Details
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
