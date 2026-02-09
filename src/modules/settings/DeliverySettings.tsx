import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Truck, Save, Settings, Calculator } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { settingsService } from '../../services/settingsService';
import toast from 'react-hot-toast';

const deliverySchema = z.object({
  hq_address: z.string().min(1, 'HQ Address is required'),
  fuel_consumption: z.number().min(0, 'Fuel consumption must be positive'),
  fuel_price: z.number().min(0, 'Fuel price must be positive'),
  cost_per_km: z.number().min(0, 'Base fee must be positive'),
  setup_time: z.number().min(0, 'Setup time must be positive'),
  buffer_time: z.number().min(0, 'Buffer time must be positive'),
  // Legacy fields - keep them valid but hidden
  base_fee: z.number().optional(),
  free_radius_km: z.number().optional(),
  min_fee: z.number().optional(),
});

type DeliveryFormData = z.infer<typeof deliverySchema>;

export default function DeliverySettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<DeliveryFormData>({
    resolver: zodResolver(deliverySchema),
    defaultValues: {
      hq_address: '',
      fuel_consumption: 0,
      fuel_price: 0,
      cost_per_km: 0,
      setup_time: 0,
      buffer_time: 0,
      base_fee: 0,
      free_radius_km: 0,
      min_fee: 0,
    }
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await settingsService.getDeliverySettings();
      if (data) {
        reset({
          hq_address: data.hq_address || '',
          fuel_consumption: data.fuel_consumption || 0,
          fuel_price: data.fuel_price || 0,
          cost_per_km: data.cost_per_km || 0,
          setup_time: data.setup_time || 0,
          buffer_time: data.buffer_time || 0,
          base_fee: data.base_fee || 0,
          free_radius_km: data.free_radius_km || 0,
          min_fee: data.min_fee || 0,
        });
      }
    } catch (error) {
      console.error('Error loading delivery settings:', error);
    }
  };

  const onSubmit = async (data: DeliveryFormData) => {
    try {
      setLoading(true);
      // Ensure legacy fields are present if not in form
      const payload = {
        ...data,
        base_fee: data.base_fee ?? 0,
        free_radius_km: data.free_radius_km ?? 0,
        min_fee: data.min_fee ?? 0,
      };
      await settingsService.updateDeliverySettings(payload);
      toast.success('Delivery settings saved successfully');
    } catch (error) {
      console.error('Error saving delivery settings:', error);
      toast.error('Failed to save delivery settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Settings
        </button>
        <div className="flex items-center">
          <div className="p-2 bg-pink-100 rounded-lg mr-3">
            <Truck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">Travel Calculation</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">Automatic calculation of distance, time, and travel costs from your HQ</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700 dark:bg-gray-700">
          <div className="flex items-center">
            <Truck className="h-5 w-5 text-blue-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white">Travel Calculator</h2>
          </div>
          <div className="flex items-center space-x-4">
            <Settings className="h-5 w-5 text-gray-400" />
            <button
              type="button"
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Calculator className="h-4 w-4 mr-1" />
              Calculate
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white mb-4">Travel Settings</h3>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="hq_address" className="block text-sm font-medium text-gray-700">
                  HQ Address
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    {...register('hq_address')}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    placeholder="Enter your HQ address"
                  />
                </div>
                {errors.hq_address && (
                  <p className="mt-1 text-sm text-red-600">{errors.hq_address.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="fuel_consumption" className="block text-sm font-medium text-gray-700">
                  Fuel Consumption (L/100km)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    step="0.1"
                    {...register('fuel_consumption', { valueAsNumber: true })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  />
                </div>
                {errors.fuel_consumption && (
                  <p className="mt-1 text-sm text-red-600">{errors.fuel_consumption.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="fuel_price" className="block text-sm font-medium text-gray-700">
                  Fuel Price (MXN/L)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    step="0.01"
                    {...register('fuel_price', { valueAsNumber: true })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  />
                </div>
                {errors.fuel_price && (
                  <p className="mt-1 text-sm text-red-600">{errors.fuel_price.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="cost_per_km" className="block text-sm font-medium text-gray-700">
                  Base Fee (MXN/km)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    step="0.01"
                    {...register('cost_per_km', { valueAsNumber: true })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  />
                </div>
                {errors.cost_per_km && (
                  <p className="mt-1 text-sm text-red-600">{errors.cost_per_km.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="setup_time" className="block text-sm font-medium text-gray-700">
                  Setup Time (minutes)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    {...register('setup_time', { valueAsNumber: true })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  />
                </div>
                {errors.setup_time && (
                  <p className="mt-1 text-sm text-red-600">{errors.setup_time.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="buffer_time" className="block text-sm font-medium text-gray-700">
                  Buffer Time (minutes)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    {...register('buffer_time', { valueAsNumber: true })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  />
                </div>
                {errors.buffer_time && (
                  <p className="mt-1 text-sm text-red-600">{errors.buffer_time.message}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700 dark:border-gray-700">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
