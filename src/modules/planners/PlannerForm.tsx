import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { plannerService } from '../../services/plannerService';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';

const plannerSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  company: z.string().optional(),
  website: z.string().optional(),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
});

type PlannerFormData = z.infer<typeof plannerSchema>;

export default function PlannerForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const isEditMode = !!id;

  const { register, handleSubmit, formState: { errors }, reset } = useForm<PlannerFormData>({
    resolver: zodResolver(plannerSchema),
  });

  useEffect(() => {
    if (isEditMode) {
      loadPlanner();
    }
  }, [id]);

  const loadPlanner = async () => {
    try {
      setLoading(true);
      const planner = await plannerService.getPlanner(id!);
      if (planner) {
        reset(planner);
      } else {
        toast.error('Planner not found');
        navigate('/planners');
      }
    } catch (error) {
      toast.error('Failed to load planner');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: PlannerFormData) => {
    try {
      setLoading(true);
      if (isEditMode) {
        await plannerService.updatePlanner(id!, data);
        toast.success('Planner updated successfully');
      } else {
        await plannerService.createPlanner(data);
        toast.success('Planner created successfully');
      }
      navigate('/planners');
    } catch (error) {
      toast.error(isEditMode ? 'Failed to update planner' : 'Failed to create planner');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/planners')}
          className="p-2 rounded-full hover:bg-gray-100"
        >
          <ArrowLeft className="h-6 w-6 text-gray-500" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditMode ? 'Edit Planner' : 'New Planner'}
        </h1>
      </div>

      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                First Name
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
                Last Name
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

            <div className="sm:col-span-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  type="email"
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
                Phone Number
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
              <label htmlFor="company" className="block text-sm font-medium text-gray-700">
                Company
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="company"
                  {...register('company')}
                  className="shadow-sm focus:ring-pink-500 focus:border-pink-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                Website
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="website"
                  {...register('website')}
                  className="shadow-sm focus:ring-pink-500 focus:border-pink-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="https://example.com"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="instagram" className="block text-sm font-medium text-gray-700">
                Instagram
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="instagram"
                  {...register('instagram')}
                  className="shadow-sm focus:ring-pink-500 focus:border-pink-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="@username"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="facebook" className="block text-sm font-medium text-gray-700">
                Facebook
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="facebook"
                  {...register('facebook')}
                  className="shadow-sm focus:ring-pink-500 focus:border-pink-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="Profile URL or Username"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/planners')}
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
