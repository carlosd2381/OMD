import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { leadService } from '../../services/leadService';
import { productService } from '../../services/productService';
import { venueService } from '../../services/venueService';
import { clientService } from '../../services/clientService';
import { eventService } from '../../services/eventService';
import { loadGoogleMaps } from '../../utils/googleMapsLoader';
import type { Product } from '../../types/product';
import type { Venue } from '../../types/venue';
import toast from 'react-hot-toast';
import { ArrowLeft, ChevronDown, ChevronUp, X, MapPin, Building2, Loader2 } from 'lucide-react';

// Declare Google Maps types
declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

const leadSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  role: z.enum(['Bride', 'Groom', 'Parent', 'External Planner', 'Hotel/Resort', 'Private Venue']).optional(),
  event_type: z.enum(['Wedding', 'Social Event', 'Corporate Event', 'Convention', 'Other']).optional(),
  event_date: z.string().optional(),
  guest_count: z.number().min(0).optional(),
  venue_name: z.string().optional(),
  services_interested: z.array(z.string()).optional(),
  notes: z.string().optional(),
  lead_source: z.enum(['Website', 'Facebook', 'Facebook Group', 'Instagram', 'TikTok', 'External Planner', 'Hotel/Venue', 'Hotel/Venue PV', 'Vendor Referral', 'Client Referral', 'Other']).optional(),
  status: z.enum(['New', 'Contacted', 'Qualified', 'Converted', 'Lost']),
});

type LeadFormData = z.infer<typeof leadSchema>;

export default function LeadForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<'save' | 'convert' | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [localVenues, setLocalVenues] = useState<Venue[]>([]);
  const [venueSuggestions, setVenueSuggestions] = useState<{ name: string; source: 'local' | 'google'; address?: string; is_preferred?: boolean }[]>([]);
  const [showVenueSuggestions, setShowVenueSuggestions] = useState(false);
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const isEditMode = !!id;
  const autocompleteService = useRef<any>(null);

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      status: 'New',
      event_type: 'Wedding',
      services_interested: []
    }
  });

  const selectedServices = watch('services_interested') || [];

  useEffect(() => {
    loadProducts();
    loadVenues();
    if (isEditMode) {
      loadLead();
    }
  }, [id]);

  const loadProducts = async () => {
    try {
      const data = await productService.getProducts();
      setProducts(data.filter(p => p.is_active));
    } catch (error) {
      console.error('Failed to load products', error);
    }
  };

  const loadVenues = async () => {
    try {
      const data = await venueService.getVenues();
      setLocalVenues(data);
    } catch (error) {
      console.error('Failed to load venues', error);
    }
  };

  useEffect(() => {
    const initMaps = async () => {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.warn('Google Maps API key is missing');
        return;
      }

      try {
        await loadGoogleMaps(apiKey);
        if (window.google && window.google.maps && window.google.maps.places) {
          autocompleteService.current = new window.google.maps.places.AutocompleteService();
        }
      } catch (error) {
        console.error('Error loading Google Maps:', error);
      }
    };

    initMaps();
  }, []);

  const handleVenueSearch = (input: string) => {
    setValue('venue_name', input);
    
    if (!input || input.length < 2) {
      setVenueSuggestions([]);
      setShowVenueSuggestions(false);
      return;
    }

    // 1. Search local venues
    const localMatches = localVenues
      .filter(v => v.name.toLowerCase().includes(input.toLowerCase()))
      .map(v => ({ 
        name: v.name, 
        source: 'local' as const, 
        address: v.address,
        is_preferred: v.is_preferred 
      }));

    // 2. Search Google Places
    if (autocompleteService.current) {
      autocompleteService.current.getPlacePredictions(
        { input, types: ['establishment', 'geocode'] },
        (predictions: any[], status: any) => {
          const googleMatches = (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) 
            ? predictions.map(p => ({ 
                name: p.structured_formatting.main_text, 
                source: 'google' as const,
                address: p.structured_formatting.secondary_text,
                is_preferred: false
              }))
            : [];
          
          // Combine and deduplicate (prefer local)
          const combined: { name: string; source: 'local' | 'google'; address?: string; is_preferred?: boolean }[] = [...localMatches];
          googleMatches.forEach(g => {
            if (!combined.some(l => l.name.toLowerCase() === g.name.toLowerCase())) {
              combined.push(g);
            }
          });

          setVenueSuggestions(combined);
          setShowVenueSuggestions(true);
        }
      );
    } else {
      setVenueSuggestions(localMatches);
      setShowVenueSuggestions(localMatches.length > 0);
    }
  };

  const loadLead = async () => {
    try {
      setLoading(true);
      const lead = await leadService.getLead(id!);
      if (lead) {
        reset(lead);
      } else {
        toast.error('Lead not found');
        navigate('/leads');
      }
    } catch (error) {
      toast.error('Failed to load lead');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: LeadFormData) => {
    try {
      setActionInProgress('save');
      setLoading(true);
      if (isEditMode) {
        await leadService.updateLead(id!, data);
        toast.success('Lead updated successfully');
      } else {
        await leadService.createLead(data);
        toast.success('Lead created successfully');
      }
      navigate('/leads');
    } catch (error) {
      toast.error(isEditMode ? 'Failed to update lead' : 'Failed to create lead');
    } finally {
      setLoading(false);
      setActionInProgress(null);
    }
  };

  const handleConvertToClient = async (data: LeadFormData) => {
    try {
      setActionInProgress('convert');
      setLoading(true);

      const savedLead = isEditMode
        ? await leadService.updateLead(id!, data)
        : await leadService.createLead(data);

      const newClient = await clientService.createClient({
        first_name: savedLead.first_name,
        last_name: savedLead.last_name,
        email: savedLead.email,
        phone: savedLead.phone,
        role: savedLead.role,
        type: 'Direct',
        lead_source: savedLead.lead_source,
        notes: savedLead.notes,
      });

      await eventService.createEvent({
        name: `${savedLead.first_name} ${savedLead.last_name}'s Event`,
        date: savedLead.event_date || new Date().toISOString(),
        type: savedLead.event_type || 'wedding',
        client_id: newClient.id,
        status: 'inquiry',
        guest_count: savedLead.guest_count,
        budget: savedLead.budget,
        venue_name: savedLead.venue_name,
        services: savedLead.services_interested,
        notes: savedLead.notes
      });

      await leadService.updateLead(savedLead.id, { status: 'Converted' });

      toast.success('Lead converted to Client successfully!');
      navigate(`/clients/${newClient.id}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to convert lead');
    } finally {
      setLoading(false);
      setActionInProgress(null);
    }
  };

  const handleServiceToggle = (serviceName: string) => {
    const current = selectedServices;
    const updated = current.includes(serviceName)
      ? current.filter(s => s !== serviceName)
      : [...current, serviceName];
    setValue('services_interested', updated);
  };

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category) 
        : [...prev, category]
    );
  };

  // Group products by category
  const productsByCategory = products.reduce((acc, product) => {
    let category = product.category || 'Other';
    
    // Custom grouping for Lead Form
    if (category === 'Churros - Ice Cream') category = 'Churros';
    if (category === 'Donuts - Ice Cream') category = 'Donuts';
    if (category === 'Pancakes - Ice Cream') category = 'Pancakes';
    if (category === 'Waffles - Ice Cream') category = 'Waffles';
    
    if (['Ice Cream', 'Sorbet', 'Rolls'].includes(category)) {
      category = 'Ice Cream, Sorbet and Rolls';
    }

    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  const categories = Object.keys(productsByCategory).sort();

  useEffect(() => {
    if (openCategories.length === 0) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-services-dropdown]')) return;
      setOpenCategories([]);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openCategories]);

  if (loading && isEditMode) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/leads')}
          className="p-2 rounded-full hover:bg-gray-100"
        >
          <ArrowLeft className="h-6 w-6 text-gray-500 dark:text-gray-400 dark:text-gray-400" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">
          {isEditMode ? 'Edit Lead' : 'New Lead'}
        </h1>
      </div>

      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Client Details Section */}
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white dark:text-white">Client Details</h3>
            <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                  First name
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="first_name"
                    {...register('first_name')}
                    className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                  {errors.first_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.first_name.message}</p>
                  )}
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                  Last name
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="last_name"
                    {...register('last_name')}
                    className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                  {errors.last_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.last_name.message}</p>
                  )}
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="mt-1">
                  <input
                    type="email"
                    id="email"
                    {...register('email')}
                    className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Mobile Phone
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

              <div className="sm:col-span-3">
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  Role:
                </label>
                <div className="mt-1">
                  <select
                    id="role"
                    {...register('role')}
                    className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                  >
                    <option value="">Select Role</option>
                    <option value="Bride">Bride</option>
                    <option value="Groom">Groom</option>
                    <option value="Parent">Parent</option>
                    <option value="External Planner">External Planner</option>
                    <option value="Hotel/Resort">Hotel/Resort</option>
                    <option value="Private Venue">Private Venue</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white dark:text-white">Event Details</h3>
            <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="event_type" className="block text-sm font-medium text-gray-700">
                  Type of Event
                </label>
                <div className="mt-1">
                  <select
                    id="event_type"
                    {...register('event_type')}
                    className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                  >
                    <option value="">Select Type</option>
                    <option value="Wedding">Wedding</option>
                    <option value="Social Event">Social Event</option>
                    <option value="Corporate Event">Corporate Event</option>
                    <option value="Convention">Convention</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="event_date" className="block text-sm font-medium text-gray-700">
                  Event Date
                </label>
                <div className="mt-1">
                  <input
                    type="date"
                    id="event_date"
                    {...register('event_date')}
                    className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="guest_count" className="block text-sm font-medium text-gray-700">
                  Approximate Guest Count
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    id="guest_count"
                    {...register('guest_count', { valueAsNumber: true })}
                    className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="sm:col-span-3 relative">
                <label htmlFor="venue_name" className="block text-sm font-medium text-gray-700">
                  Venue Name
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="venue_name"
                    autoComplete="off"
                    {...register('venue_name')}
                    onChange={(e) => handleVenueSearch(e.target.value)}
                    onBlur={() => {
                      // Delay hiding to allow click event on suggestion
                      setTimeout(() => setShowVenueSuggestions(false), 200);
                    }}
                    className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="Start typing to search for a venue..."
                  />
                </div>
                {showVenueSuggestions && venueSuggestions.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 dark:bg-gray-800 shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                    {venueSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100"
                        onClick={() => {
                          setValue('venue_name', suggestion.name);
                          if (suggestion.source === 'local') {
                            if (suggestion.is_preferred) {
                              setValue('lead_source', 'Hotel/Venue PV');
                              toast.success('Preferred Vendor Venue detected!');
                            } else {
                              setValue('lead_source', 'Hotel/Venue');
                            }
                          }
                          setShowVenueSuggestions(false);
                        }}
                      >
                        <div className="flex items-center">
                          {suggestion.source === 'local' ? (
                            <Building2 className={`h-4 w-4 mr-2 ${suggestion.is_preferred ? 'text-yellow-500' : 'text-primary'}`} />
                          ) : (
                            <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                          )}
                          <div>
                            <span className="block truncate font-medium">
                              {suggestion.name}
                              {suggestion.is_preferred && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Preferred
                                </span>
                              )}
                            </span>
                            {suggestion.address && (
                              <span className="block truncate text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">
                                {suggestion.address}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="sm:col-span-6">
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Services Interested In
                </label>
                
                {/* Selected Services Summary */}
                {selectedServices.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {selectedServices.map(service => (
                      <span key={service} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                        {service}
                        <button
                          type="button"
                          onClick={() => handleServiceToggle(service)}
                          className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full text-primary/60 hover:bg-secondary hover:text-primary/80 focus:outline-none"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {categories.map((category) => (
                    <div key={category} className="relative" data-services-dropdown>
                      <button
                        type="button"
                        onClick={() => toggleCategory(category)}
                        className="w-full bg-white dark:bg-gray-800 dark:bg-gray-800 border border-gray-300 rounded-md shadow-sm px-4 py-2 text-left cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm flex justify-between items-center"
                      >
                        <span className="font-medium text-gray-900 dark:text-white dark:text-white">{category}</span>
                        {openCategories.includes(category) ? (
                          <ChevronUp className="h-4 w-4 text-gray-500 dark:text-gray-400 dark:text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400 dark:text-gray-400" />
                        )}
                      </button>
                      
                      {openCategories.includes(category) && (
                        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 dark:bg-gray-800 shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                          {productsByCategory[category].map((product) => (
                            <div
                              key={product.id}
                              className="relative flex items-start py-2 px-4 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 cursor-pointer"
                              onClick={() => handleServiceToggle(product.name)}
                            >
                              <div className="flex items-center h-5">
                                <input
                                  id={`product-${product.id}`}
                                  type="checkbox"
                                  checked={selectedServices.includes(product.name)}
                                  onChange={() => {}} // Handled by parent div click
                                  className="focus:ring-primary h-4 w-4 text-primary border-gray-300 rounded"
                                />
                              </div>
                              <div className="ml-3 text-sm">
                                <label htmlFor={`product-${product.id}`} className="font-medium text-gray-700 cursor-pointer">
                                  {product.name}
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-6">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Other Information
                </label>
                <div className="mt-1">
                  <textarea
                    id="notes"
                    rows={4}
                    {...register('notes')}
                    className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="Please let us know any other information you would like for us to know."
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="lead_source" className="block text-sm font-medium text-gray-700">
                  Lead Source
                </label>
                <div className="mt-1">
                  <select
                    id="lead_source"
                    {...register('lead_source')}
                    className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                  >
                    <option value="">Select Source</option>
                    <option value="Website">Website</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Facebook Group">Facebook Group</option>
                    <option value="Instagram">Instagram</option>
                    <option value="TikTok">TikTok</option>
                    <option value="External Planner">External Planner</option>
                    <option value="Hotel/Venue">Hotel/Venue</option>
                    <option value="Hotel/Venue PV">Hotel/Venue PV</option>
                    <option value="Vendor Referral">Vendor Referral</option>
                    <option value="Client Referral">Client Referral</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <div className="mt-1">
                  <select
                    id="status"
                    {...register('status')}
                    className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Converted">Converted</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/leads')}
              disabled={actionInProgress !== null}
              className="bg-white dark:bg-gray-800 dark:bg-gray-800 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || actionInProgress !== null}
              className="inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
            >
              {actionInProgress === 'save' && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {actionInProgress === 'save' ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={handleSubmit(handleConvertToClient)}
              disabled={actionInProgress !== null}
              className="inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
            >
              {actionInProgress === 'convert' && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {actionInProgress === 'convert' ? 'Converting...' : 'Convert to Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
