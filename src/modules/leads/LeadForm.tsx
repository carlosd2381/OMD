import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { leadService } from '../../services/leadService';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';

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

const SERVICE_OPTIONS = [
  'Mini-Churros',
  'Mini-Pancakes',
  'Mini-Waffles',
  'Mini-Crepes',
  'Mini-Conchas',
  'Mini-Donuts',
  'Rollz',
  'Ice Cream/Sorbet',
  'Cannolis',
  'S’mores Bar',
  'Chocolate Fountains'
];

export default function LeadForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const isEditMode = !!id;

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      status: 'New',
      services_interested: []
    }
  });

  const selectedServices = watch('services_interested') || [];

  useEffect(() => {
    if (isEditMode) {
      loadLead();
    }
  }, [id]);

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
    }
  };

  const handleServiceToggle = (service: string) => {
    const current = selectedServices;
    const updated = current.includes(service)
      ? current.filter(s => s !== service)
      : [...current, service];
    setValue('services_interested', updated);
  };

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
          <ArrowLeft className="h-6 w-6 text-gray-500" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditMode ? 'Edit Lead' : 'New Lead'}
        </h1>
      </div>

      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Client Details Section */}
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900">Client Details</h3>
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
                    className="shadow-sm focus:ring-pink-500 focus:border-pink-500 block w-full sm:text-sm border-gray-300 rounded-md"
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
                    className="shadow-sm focus:ring-pink-500 focus:border-pink-500 block w-full sm:text-sm border-gray-300 rounded-md"
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
                    className="shadow-sm focus:ring-pink-500 focus:border-pink-500 block w-full sm:text-sm border-gray-300 rounded-md"
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
                    className="shadow-sm focus:ring-pink-500 focus:border-pink-500 block w-full sm:text-sm border-gray-300 rounded-md"
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
                    className="shadow-sm focus:ring-pink-500 focus:border-pink-500 block w-full sm:text-sm border-gray-300 rounded-md"
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

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Event Details</h3>
            <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="event_type" className="block text-sm font-medium text-gray-700">
                  Type of Event
                </label>
                <div className="mt-1">
                  <select
                    id="event_type"
                    {...register('event_type')}
                    className="shadow-sm focus:ring-pink-500 focus:border-pink-500 block w-full sm:text-sm border-gray-300 rounded-md"
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
                    className="shadow-sm focus:ring-pink-500 focus:border-pink-500 block w-full sm:text-sm border-gray-300 rounded-md"
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
                    className="shadow-sm focus:ring-pink-500 focus:border-pink-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="venue_name" className="block text-sm font-medium text-gray-700">
                  Venue Name
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="venue_name"
                    {...register('venue_name')}
                    className="shadow-sm focus:ring-pink-500 focus:border-pink-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="sm:col-span-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Services Interested In
                </label>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {SERVICE_OPTIONS.map((service) => (
                    <div key={service} className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id={`service-${service}`}
                          type="checkbox"
                          checked={selectedServices.includes(service)}
                          onChange={() => handleServiceToggle(service)}
                          className="focus:ring-pink-500 h-4 w-4 text-pink-600 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor={`service-${service}`} className="font-medium text-gray-700">
                          {service}
                        </label>
                      </div>
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
                    className="shadow-sm focus:ring-pink-500 focus:border-pink-500 block w-full sm:text-sm border-gray-300 rounded-md"
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
                    className="shadow-sm focus:ring-pink-500 focus:border-pink-500 block w-full sm:text-sm border-gray-300 rounded-md"
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
                    className="shadow-sm focus:ring-pink-500 focus:border-pink-500 block w-full sm:text-sm border-gray-300 rounded-md"
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

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/leads')}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
