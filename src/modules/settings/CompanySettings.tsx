import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { settingsService } from '../../services/settingsService';
import { loadGoogleMaps } from '../../utils/googleMapsLoader';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, MapPin, Globe, Mail, Phone, Facebook, Instagram } from 'lucide-react';

const companySchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  address: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  phone: z.string().optional(),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  tiktok: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

type CompanyFormData = z.infer<typeof companySchema>;

export default function CompanySettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const addressInputRef = useRef<HTMLInputElement | null>(null);

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
  });

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    const initMaps = async () => {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) return;

      try {
        await loadGoogleMaps(apiKey);
        
        if (!addressInputRef.current || !window.google) return;

        const autocomplete = new window.google.maps.places.Autocomplete(addressInputRef.current, {
          fields: ['geometry', 'name', 'formatted_address', 'website', 'formatted_phone_number'],
          types: ['establishment', 'geocode'],
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (!place.geometry || !place.geometry.location) return;

          setValue('address', place.formatted_address || '');
          setValue('latitude', place.geometry.location.lat());
          setValue('longitude', place.geometry.location.lng());
          
          if (place.website) setValue('website', place.website);
          if (place.formatted_phone_number) setValue('phone', place.formatted_phone_number);
        });
      } catch (error) {
        console.error('Failed to load Google Maps', error);
      }
    };

    initMaps();
  }, [setValue]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const settings = await settingsService.getBrandingSettings();
      if (settings) {
        reset({
          company_name: settings.company_name,
          address: settings.address || '',
          email: settings.email || '',
          website: settings.website || '',
          phone: settings.phone || '',
          instagram: settings.instagram || '',
          facebook: settings.facebook || '',
          tiktok: settings.tiktok || '',
          latitude: settings.latitude || undefined,
          longitude: settings.longitude || undefined,
        });
      }
    } catch (error) {
      toast.error('Failed to load company settings');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: CompanyFormData) => {
    try {
      setLoading(true);
      await settingsService.updateBrandingSettings(data);
      toast.success('Company details updated successfully');
    } catch (error) {
      toast.error('Failed to update company details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/settings')}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="h-6 w-6 text-gray-500 dark:text-gray-400 dark:text-gray-400" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">Company Details</h1>
        </div>
        <button
          onClick={handleSubmit(onSubmit)}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
        >
          <Save className="h-5 w-5 mr-2" />
          Save Changes
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            
            <div className="sm:col-span-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white dark:text-white">General Information</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                This information will be used throughout the app and on documents.
              </p>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">
                Company Name
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="company_name"
                  {...register('company_name')}
                  className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                />
                {errors.company_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.company_name.message}</p>
                )}
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  type="email"
                  id="email"
                  {...register('email')}
                  className="focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                  placeholder="contact@company.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="sm:col-span-6">
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                Address (Search with Google Maps)
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  type="text"
                  id="address"
                  {...(() => {
                    const { ref, ...rest } = register('address');
                    return {
                      ...rest,
                      ref: (e: HTMLInputElement | null) => {
                        ref(e);
                        addressInputRef.current = e;
                      }
                    };
                  })()}
                  className="focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                  placeholder="Start typing to search..."
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="latitude" className="block text-sm font-medium text-gray-700">
                Latitude
              </label>
              <div className="mt-1">
                <input
                  type="number"
                  step="any"
                  id="latitude"
                  {...register('latitude', { valueAsNumber: true })}
                  className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md bg-gray-50 dark:bg-gray-700 dark:bg-gray-700"
                  readOnly
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="longitude" className="block text-sm font-medium text-gray-700">
                Longitude
              </label>
              <div className="mt-1">
                <input
                  type="number"
                  step="any"
                  id="longitude"
                  {...register('longitude', { valueAsNumber: true })}
                  className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md bg-gray-50 dark:bg-gray-700 dark:bg-gray-700"
                  readOnly
                />
              </div>
            </div>

            <div className="sm:col-span-6 border-t border-gray-200 dark:border-gray-700 dark:border-gray-700 pt-6 mt-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white dark:text-white">Online Presence</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                Website and social media links.
              </p>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                Website
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Globe className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  type="text"
                  id="website"
                  {...register('website')}
                  className="focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                  placeholder="https://example.com"
                />
              </div>
              {errors.website && (
                <p className="mt-1 text-sm text-red-600">{errors.website.message}</p>
              )}
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  type="text"
                  id="phone"
                  {...register('phone')}
                  className="focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="instagram" className="block text-sm font-medium text-gray-700">
                Instagram
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Instagram className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  type="text"
                  id="instagram"
                  {...register('instagram')}
                  className="focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                  placeholder="@username"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="facebook" className="block text-sm font-medium text-gray-700">
                Facebook
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Facebook className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  type="text"
                  id="facebook"
                  {...register('facebook')}
                  className="focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                  placeholder="Page URL or Name"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="tiktok" className="block text-sm font-medium text-gray-700">
                TikTok
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="tiktok"
                  {...register('tiktok')}
                  className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="@username"
                />
              </div>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
}
