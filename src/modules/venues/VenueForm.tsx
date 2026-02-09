import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { venueService } from '../../services/venueService';
import { loadGoogleMaps } from '../../utils/googleMapsLoader';
import type { VenueContact } from '../../types/venue';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Trash2, User, MapPin } from 'lucide-react';

// Declare Google Maps types
declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

const venueSchema = z.object({
  name: z.string().min(1, 'Venue name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  country: z.string().optional(),
  venue_area: z.enum(['Playa/Costa Mujeres', 'Cancun Z/H', 'Cancun', 'Puerto Morelos', 'Playa Del Carmen', 'Puerto Aventuras', 'Akumal', 'Tulum', 'Isla Mujeres', 'Cozumel', 'Other']).optional().or(z.literal('')),
  website: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  instagram: z.string().optional().or(z.literal('')),
  facebook: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  google_place_id: z.string().optional().or(z.literal('')),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  travel_distance_km: z.number().optional(),
  travel_time_mins: z.number().optional(),
  map_url: z.string().optional().or(z.literal('')),
  is_preferred: z.boolean().optional(),
});

const contactSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  role: z.string().min(1, 'Role is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  is_primary: z.boolean(),
});

type VenueFormData = z.infer<typeof venueSchema>;
type ContactFormData = z.infer<typeof contactSchema>;

export default function VenueForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'contacts'>('details');
  const [contacts, setContacts] = useState<VenueContact[]>([]);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const isEditMode = !!id;
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  // HQ Coordinates: 21.117218, -86.876025
  const [hqLocation] = useState<string | null>("21.117218, -86.876025");

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<VenueFormData>({
    resolver: zodResolver(venueSchema),
  });

  const { 
    register: registerContact, 
    handleSubmit: handleSubmitContact, 
    formState: { errors: contactErrors },
    reset: resetContact 
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  useEffect(() => {
    if (isEditMode) {
      loadVenue();
      loadContacts();
    }
  }, [id]);

  useEffect(() => {
    const initMaps = async () => {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.warn('Google Maps API key is missing');
        return;
      }

      try {
        await loadGoogleMaps(apiKey);
        
        if (!nameInputRef.current || !window.google) return;

        const autocomplete = new window.google.maps.places.Autocomplete(nameInputRef.current, {
          fields: ['address_components', 'geometry', 'name', 'formatted_address', 'website', 'formatted_phone_number', 'place_id', 'url'],
          types: ['establishment', 'geocode'],
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (!place.geometry || !place.geometry.location) return;

          // Update form fields
          setValue('name', place.name || '');
          setValue('google_place_id', place.place_id || '');
          setValue('latitude', place.geometry.location.lat());
          setValue('longitude', place.geometry.location.lng());
          setValue('map_url', place.url || '');
          
          if (place.website) setValue('website', place.website);
          if (place.formatted_phone_number) setValue('phone', place.formatted_phone_number);
          
          // Parse address components
          let streetNumber = '';
          let route = '';
          let city = '';
          let state = '';
          let country = '';
          let postalCode = '';

          for (const component of place.address_components || []) {
            const type = component.types[0];
            switch (type) {
              case 'street_number':
                streetNumber = component.long_name;
                break;
              case 'route':
                route = component.long_name;
                break;
              case 'locality':
                city = component.long_name;
                break;
              case 'administrative_area_level_1':
                state = component.long_name;
                break;
              case 'country':
                country = component.long_name;
                break;
              case 'postal_code':
                postalCode = component.long_name;
                break;
            }
          }

          setValue('address', `${streetNumber} ${route}`.trim() || place.formatted_address || '');
          setValue('city', city);
          setValue('state', state);
          setValue('country', country);
          setValue('zip_code', postalCode);

          // Calculate distance if HQ location is available
          if (hqLocation && place.formatted_address) {
            const service = new window.google.maps.DistanceMatrixService();
            service.getDistanceMatrix(
              {
                origins: [hqLocation],
                destinations: [place.formatted_address],
                travelMode: 'DRIVING',
                unitSystem: window.google.maps.UnitSystem.METRIC,
              },
              (response: any, status: any) => {
                if (status === 'OK' && response.rows[0].elements[0].status === 'OK') {
                  const element = response.rows[0].elements[0];
                  const distanceKm = element.distance.value / 1000;
                  const durationMins = Math.round(element.duration.value / 60);
                  
                  setValue('travel_distance_km', parseFloat(distanceKm.toFixed(1)));
                  setValue('travel_time_mins', durationMins);
                }
              }
            );
          }
        });
      } catch (error) {
        console.error('Failed to load Google Maps', error);
      }
    };

    initMaps();
  }, [hqLocation, setValue]);

  const loadVenue = async () => {
    try {
      setLoading(true);
      const venue = await venueService.getVenue(id!);
      if (venue) {
        reset(venue);
      } else {
        toast.error('Venue not found');
        navigate('/venues');
      }
    } catch (error) {
      toast.error('Failed to load venue');
    } finally {
      setLoading(false);
    }
  };

  const loadContacts = async () => {
    if (!id) return;
    try {
      const data = await venueService.getVenueContacts(id);
      setContacts(data);
    } catch (error) {
      toast.error('Failed to load contacts');
    }
  };

  const onSubmit = async (data: VenueFormData) => {
    try {
      setLoading(true);
      // Filter out empty strings for venue_area to match the type
      const cleanData = {
        ...data,
        venue_area: data.venue_area === '' ? undefined : data.venue_area
      };

      if (isEditMode) {
        await venueService.updateVenue(id!, cleanData);
        toast.success('Venue updated successfully');
      } else {
        const newVenue = await venueService.createVenue(cleanData);
        toast.success('Venue created successfully');
        // Redirect to edit mode to allow adding contacts
        navigate(`/venues/${newVenue.id}`);
      }
    } catch (error) {
      toast.error(isEditMode ? 'Failed to update venue' : 'Failed to create venue');
    } finally {
      setLoading(false);
    }
  };

  const onContactSubmit = async (data: ContactFormData) => {
    if (!id) return;
    try {
      await venueService.createVenueContact({ ...data, venue_id: id });
      toast.success('Contact added successfully');
      setIsContactModalOpen(false);
      resetContact();
      loadContacts();
    } catch (error) {
      toast.error('Failed to add contact');
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      try {
        await venueService.deleteVenueContact(contactId);
        toast.success('Contact deleted');
        loadContacts();
      } catch (error) {
        toast.error('Failed to delete contact');
      }
    }
  };

  if (loading && isEditMode && !contacts.length) { // Only show full loading if initial load
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/venues')}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="h-6 w-6 text-gray-500 dark:text-gray-400 dark:text-gray-400" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">
            {isEditMode ? 'Edit Venue' : 'New Venue'}
          </h1>
        </div>
      </div>

      {/* Tabs */}
      {isEditMode && (
        <div className="border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('details')}
              className={`${
                activeTab === 'details'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('contacts')}
              className={`${
                activeTab === 'contacts'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Contacts
            </button>
          </nav>
        </div>
      )}

      {/* Details Tab */}
      <div className={activeTab === 'details' ? 'block' : 'hidden'}>
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow px-4 py-5 sm:rounded-lg sm:p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-6">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Venue Name
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="name"
                    {...(() => {
                      const { ref, ...rest } = register('name');
                      return {
                        ...rest,
                        ref: (e: HTMLInputElement | null) => {
                          ref(e);
                          nameInputRef.current = e;
                        }
                      };
                    })()}
                    className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="Start typing to search for a venue..."
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>
              </div>

              <div className="sm:col-span-6">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  Street Address
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="address"
                    {...register('address')}
                    className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                  {errors.address && (
                    <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
                  )}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="venue_area" className="block text-sm font-medium text-gray-700">
                  Venue Area
                </label>
                <div className="mt-1">
                  <select
                    id="venue_area"
                    {...register('venue_area')}
                    className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                  >
                    <option value="">Select Area</option>
                    <option value="Playa/Costa Mujeres">Playa/Costa Mujeres</option>
                    <option value="Cancun Z/H">Cancun Z/H</option>
                    <option value="Cancun">Cancun</option>
                    <option value="Puerto Morelos">Puerto Morelos</option>
                    <option value="Playa Del Carmen">Playa Del Carmen</option>
                    <option value="Puerto Aventuras">Puerto Aventuras</option>
                    <option value="Akumal">Akumal</option>
                    <option value="Tulum">Tulum</option>
                    <option value="Isla Mujeres">Isla Mujeres</option>
                    <option value="Cozumel">Cozumel</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                  City
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="city"
                    {...register('city')}
                    className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                  State / Province
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="state"
                    {...register('state')}
                    className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="zip_code" className="block text-sm font-medium text-gray-700">
                  Zip / Postal Code
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="zip_code"
                    {...register('zip_code')}
                    className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                  Country
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="country"
                    {...register('country')}
                    className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="travel_distance_km" className="block text-sm font-medium text-gray-700">
                  Distance from HQ (km)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    step="0.1"
                    id="travel_distance_km"
                    {...register('travel_distance_km', { valueAsNumber: true })}
                    readOnly
                    className="shadow-sm bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="travel_time_mins" className="block text-sm font-medium text-gray-700">
                  Travel Time (mins)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    id="travel_time_mins"
                    {...register('travel_time_mins', { valueAsNumber: true })}
                    readOnly
                    className="shadow-sm bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="map_url" className="block text-sm font-medium text-gray-700">
                  Google Maps Link
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="text"
                    id="map_url"
                    {...register('map_url')}
                    readOnly
                    className="focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md bg-gray-50 dark:bg-gray-700 dark:bg-gray-700"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                </div>
              </div>

              <div className="sm:col-span-6">
                <div className="relative flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="is_preferred"
                      type="checkbox"
                      {...register('is_preferred')}
                      className="focus:ring-primary h-4 w-4 text-primary border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="is_preferred" className="font-medium text-gray-700">
                      Preferred Vendor Venue
                    </label>
                    <p className="text-gray-500">
                      Mark this venue as a partner. Leads from this venue will be automatically tagged as "Preferred Vendor".
                    </p>
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                  Website
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="website"
                    {...register('website')}
                    className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="phone"
                    {...register('phone')}
                    className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="instagram" className="block text-sm font-medium text-gray-700">
                  Instagram
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="instagram"
                    {...register('instagram')}
                    className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="@username"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="facebook" className="block text-sm font-medium text-gray-700">
                  Facebook
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="facebook"
                    {...register('facebook')}
                    className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="Profile URL or Username"
                  />
                </div>
              </div>

              <div className="sm:col-span-6">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <div className="mt-1">
                  <textarea
                    id="notes"
                    rows={3}
                    {...register('notes')}
                    className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => navigate('/venues')}
                className="bg-white dark:bg-gray-800 dark:bg-gray-800 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Contacts Tab */}
      <div className={activeTab === 'contacts' ? 'block' : 'hidden'}>
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="sm:flex sm:items-center">
              <div className="sm:flex-auto">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white dark:text-white">Venue Contacts</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                  A list of all contacts associated with this venue including their role and contact information.
                </p>
              </div>
              <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                <button
                  type="button"
                  onClick={() => setIsContactModalOpen(true)}
                  className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </button>
              </div>
            </div>
            <div className="mt-8 flex flex-col">
              <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50 dark:bg-gray-700 dark:bg-gray-700">
                        <tr>
                          <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white dark:text-white sm:pl-6">
                            Name
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white dark:text-white">
                            Role
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white dark:text-white">
                            Email
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white dark:text-white">
                            Phone
                          </th>
                          <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white dark:bg-gray-800 dark:bg-gray-800">
                        {contacts.map((contact) => (
                          <tr key={contact.id}>
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white dark:text-white sm:pl-6">
                              {contact.first_name} {contact.last_name}
                              {contact.is_primary && (
                                <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                                  Primary
                                </span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">{contact.role}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">{contact.email}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">{contact.phone}</td>
                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                              <button
                                onClick={() => handleDeleteContact(contact.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {contacts.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-4 text-center text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                              No contacts added yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Contact Modal */}
      {isContactModalOpen && (
        <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-50 dark:bg-gray-700 dark:bg-gray-7000 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setIsContactModalOpen(false)}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-pink-100">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white dark:text-white" id="modal-title">
                    Add Venue Contact
                  </h3>
                  <div className="mt-2">
                    <form onSubmit={handleSubmitContact(onContactSubmit)} className="space-y-4 text-left">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">First Name</label>
                          <input
                            type="text"
                            {...registerContact('first_name')}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                          />
                          {contactErrors.first_name && <p className="text-red-600 text-xs mt-1">{contactErrors.first_name.message}</p>}
                        </div>
                        <div>
                          <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">Last Name</label>
                          <input
                            type="text"
                            {...registerContact('last_name')}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                          />
                          {contactErrors.last_name && <p className="text-red-600 text-xs mt-1">{contactErrors.last_name.message}</p>}
                        </div>
                      </div>

                      <div>
                        <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role / Title</label>
                        <input
                          type="text"
                          {...registerContact('role')}
                          placeholder="e.g. Wedding Planner, Accounting"
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                        />
                        {contactErrors.role && <p className="text-red-600 text-xs mt-1">{contactErrors.role.message}</p>}
                      </div>

                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                          type="email"
                          {...registerContact('email')}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                        />
                        {contactErrors.email && <p className="text-red-600 text-xs mt-1">{contactErrors.email.message}</p>}
                      </div>

                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</label>
                        <input
                          type="text"
                          {...registerContact('phone')}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                        />
                      </div>

                      <div className="flex items-center">
                        <input
                          id="is_primary"
                          type="checkbox"
                          {...registerContact('is_primary')}
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        <label htmlFor="is_primary" className="ml-2 block text-sm text-gray-900 dark:text-white dark:text-white">
                          Set as Primary Contact
                        </label>
                      </div>

                      <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                        <button
                          type="submit"
                          className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:col-start-2 sm:text-sm"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsContactModalOpen(false)}
                          className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 dark:bg-gray-800 text-base font-medium text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:col-start-1 sm:text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
