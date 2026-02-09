import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save, Upload, CreditCard, Calendar, MapPin, Phone, Mail, User } from 'lucide-react';
import { staffService } from '../../services/staffService';
import type { StaffProfile } from '../../types/staff';
import toast from 'react-hot-toast';

interface Props {
  userId?: string;
}

export default function StaffProfileDetails({ userId: propUserId }: Props) {
  const { id: paramId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const id = propUserId || paramId;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'personal' | 'id' | 'banking'>('personal');

  const { register, handleSubmit, reset, setValue, watch } = useForm<StaffProfile>();
  const isDriver = watch('is_driver');

  useEffect(() => {
    if (id) {
      loadProfile(id);
    }
  }, [id]);

  const loadProfile = async (userId: string) => {
    try {
      const data = await staffService.getStaffProfile(userId);
      if (data) {
        setProfile(data);
        reset(data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load staff profile');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: StaffProfile) => {
    if (!id) return;
    setSaving(true);
    try {
      await staffService.updateStaffProfile(id, data);
      toast.success('Profile updated successfully');
      loadProfile(id);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // Mock upload handler
  const handleFileUpload = (field: 'id_front_url' | 'id_back_url') => {
    // In a real app, this would upload to Supabase Storage
    const mockUrl = `https://placehold.co/600x400?text=${field === 'id_front_url' ? 'ID+Front' : 'ID+Back'}`;
    setValue(field, mockUrl);
    toast.success('File uploaded (mock)');
  };

  if (loading) return <div className="flex justify-center items-center h-64">Loading...</div>;
  if (!profile) return <div className="text-center py-12">Staff member not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate(-1)} className="text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">
            {profile.first_name} {profile.last_name}
          </h1>
        </div>
        <button
          onClick={handleSubmit(onSubmit)}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
        >
          <Save className="h-5 w-5 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow rounded-lg">
        <div className="border-b border-gray-200 dark:border-gray-700 dark:border-gray-700 flex">
          <button
            className={`flex-1 px-6 py-4 text-sm font-medium ${activeTab === 'personal' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}
            onClick={() => setActiveTab('personal')}
          >
            Personal Info
          </button>
          <button
            className={`flex-1 px-6 py-4 text-sm font-medium ${activeTab === 'id' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}
            onClick={() => setActiveTab('id')}
          >
            I.D.
          </button>
          <button
            className={`flex-1 px-6 py-4 text-sm font-medium ${activeTab === 'banking' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}
            onClick={() => setActiveTab('banking')}
          >
            Banking
          </button>
        </div>

        {activeTab === 'personal' && (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white mb-4 flex items-center">
              <User className="h-5 w-5 mr-2 text-gray-400" />
              Personal Information
            </h3>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">First Name</label>
                <input
                  type="text"
                  {...register('first_name')}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                <input
                  type="text"
                  {...register('last_name')}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 text-gray-500 dark:text-gray-400 dark:text-gray-400 sm:text-sm">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    disabled
                    value={profile.email}
                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border-gray-300 bg-gray-100 text-gray-500 dark:text-gray-400 dark:text-gray-400 sm:text-sm"
                  />
                </div>
              </div>
              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 text-gray-500 dark:text-gray-400 dark:text-gray-400 sm:text-sm">
                    <Phone className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    {...register('phone')}
                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border-gray-300 focus:ring-primary focus:border-primary sm:text-sm"
                  />
                </div>
              </div>
              <div className="sm:col-span-6">
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 text-gray-500 dark:text-gray-400 dark:text-gray-400 sm:text-sm">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    {...register('address')}
                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border-gray-300 focus:ring-primary focus:border-primary sm:text-sm"
                  />
                </div>
              </div>
              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 text-gray-500 dark:text-gray-400 dark:text-gray-400 sm:text-sm">
                    <Calendar className="h-4 w-4" />
                  </span>
                  <input
                    type="date"
                    {...register('date_of_birth')}
                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border-gray-300 focus:ring-primary focus:border-primary sm:text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'id' && (
          <div className="p-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white mb-4 flex items-center">
                <CreditCard className="h-5 w-5 mr-2 text-gray-400" />
                Identification
              </h3>
              <div className="space-y-6">
                <div className="flex items-center">
                  <input
                    id="is_driver"
                    type="checkbox"
                    {...register('is_driver')}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <label htmlFor="is_driver" className="ml-2 block text-sm text-gray-900 dark:text-white dark:text-white">
                    Is a Driver? (Requires Driver's License)
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">ID Type</label>
                    <select
                      {...register('id_type')}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                    >
                      <option value="INE">INE (National ID)</option>
                      <option value="Passport">Passport</option>
                      <option value="Driver License">Driver's License</option>
                      <option value="Other">Other</option>
                    </select>
                    {isDriver && (
                      <p className="mt-1 text-xs text-amber-600">Drivers must provide a valid Driver's License.</p>
                    )}
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">ID Number</label>
                    <input
                      type="text"
                      {...register('id_number')}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">Expiration Date</label>
                    <input
                      type="date"
                      {...register('id_expiration_date')}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ID Front</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-primary transition-colors">
                  <div className="space-y-1 text-center">
                    {watch('id_front_url') ? (
                      <div className="relative">
                        <img src={watch('id_front_url')} alt="ID Front" className="mx-auto h-32 object-cover rounded" />
                        <button
                          type="button"
                          onClick={() => setValue('id_front_url', '')}
                          className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200"
                        >
                          <span className="sr-only">Remove</span>
                          &times;
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600">
                          <button
                            type="button"
                            onClick={() => handleFileUpload('id_front_url')}
                            className="relative cursor-pointer bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
                          >
                            <span>Upload a file</span>
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">PNG, JPG, PDF up to 10MB</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ID Back</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-primary transition-colors">
                  <div className="space-y-1 text-center">
                    {watch('id_back_url') ? (
                      <div className="relative">
                        <img src={watch('id_back_url')} alt="ID Back" className="mx-auto h-32 object-cover rounded" />
                        <button
                          type="button"
                          onClick={() => setValue('id_back_url', '')}
                          className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200"
                        >
                          <span className="sr-only">Remove</span>
                          &times;
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600">
                          <button
                            type="button"
                            onClick={() => handleFileUpload('id_back_url')}
                            className="relative cursor-pointer bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
                          >
                            <span>Upload a file</span>
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">PNG, JPG, PDF up to 10MB</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'banking' && (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white mb-4">Banking Details</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Banco</label>
                <select
                  {...register('bank_name')}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                >
                  <option value="">Select Bank</option>
                  <option value="BBVA">BBVA</option>
                  <option value="Banamex">Banamex</option>
                  <option value="Santander">Santander</option>
                  <option value="HSBC">HSBC</option>
                  <option value="Banorte">Banorte</option>
                  <option value="Scotiabank">Scotiabank</option>
                  <option value="Inbursa">Inbursa</option>
                  <option value="Banco Azteca">Banco Azteca</option>
                  <option value="Banco del Bajío">Banco del Bajío</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Tarjeta</label>
                <input
                  type="text"
                  {...register('card_number')}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">CLABE</label>
                <input
                  type="text"
                  {...register('clabe')}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Cuenta</label>
                <input
                  type="text"
                  {...register('account_number')}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
