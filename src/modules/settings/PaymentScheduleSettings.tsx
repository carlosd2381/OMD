import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Clock, AlertCircle, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { settingsService } from '../../services/settingsService';

type DueType = 'on_booking' | 'before_event' | 'after_event' | 'custom';

interface Milestone {
  id: string;
  name: string;
  percentage: number;
  dueType: DueType;
  daysOffset: number; // 0 for on_booking
}

interface Schedule {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  milestones: Milestone[];
}

export default function PaymentScheduleSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  // Form state for adding/editing
  const [formData, setFormData] = useState<Schedule>({
    id: '',
    name: '',
    description: '',
    isDefault: false,
    milestones: []
  });

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const data = await settingsService.getPaymentSchedules();
      const mapped: Schedule[] = data.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        isDefault: item.is_default || false,
        milestones: (item.milestones as any[])?.map((m: any) => ({
            id: m.id || Math.random().toString(36).substr(2, 9),
            name: m.name,
            percentage: m.percentage,
            dueType: m.dueType,
            daysOffset: m.daysOffset
        })) || []
      }));
      setSchedules(mapped);
    } catch (error) {
      console.error('Error loading schedules:', error);
      toast.error('Failed to load payment schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    const newSchedule: Schedule = {
      id: 'new_' + Date.now().toString(),
      name: 'New Schedule',
      description: '',
      isDefault: false,
      milestones: [
        { id: Date.now().toString() + '_1', name: 'Deposit', percentage: 50, dueType: 'on_booking', daysOffset: 0 },
        { id: Date.now().toString() + '_2', name: 'Balance', percentage: 50, dueType: 'before_event', daysOffset: 0 }
      ]
    };
    setSchedules([...schedules, newSchedule]);
    setEditingId(newSchedule.id);
    setFormData(newSchedule);
  };

  const handleEdit = (schedule: Schedule) => {
    setEditingId(schedule.id);
    setFormData(JSON.parse(JSON.stringify(schedule))); // Deep copy
  };

  const handleCancelEdit = () => {
    if (editingId?.startsWith('new_')) {
        setSchedules(prev => prev.filter(s => s.id !== editingId));
    }
    setEditingId(null);
  };

  const handleSaveEdit = async () => {
    // Validate percentages sum to 100
    const total = formData.milestones.reduce((sum, m) => sum + m.percentage, 0);
    if (Math.abs(total - 100) > 0.1) {
      toast.error(`Total percentage must be 100%. Current: ${total}%`);
      return;
    }

    try {
        const payload = {
            name: formData.name,
            description: formData.description,
            is_default: formData.isDefault,
            milestones: formData.milestones
        };

        if (formData.id.startsWith('new_')) {
            await settingsService.createPaymentSchedule(payload as any);
            toast.success('Schedule created');
        } else {
            await settingsService.updatePaymentSchedule(formData.id, payload as any);
            toast.success('Schedule updated');
        }
        
        await loadSchedules();
        setEditingId(null);
    } catch (error) {
        console.error('Error saving schedule:', error);
        toast.error('Failed to save schedule');
    }
  };

  const handleDelete = async (id: string) => {
    const schedule = schedules.find(s => s.id === id);
    if (schedule?.isDefault) {
      toast.error('Cannot delete the default schedule');
      return;
    }
    if (confirm('Are you sure you want to delete this schedule?')) {
        try {
            if (id.startsWith('new_')) {
                setSchedules(prev => prev.filter(s => s.id !== id));
            } else {
                await settingsService.deletePaymentSchedule(id);
                await loadSchedules();
            }
            toast.success('Schedule deleted');
        } catch (error) {
            console.error('Error deleting schedule:', error);
            toast.error('Failed to delete schedule');
        }
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
        // First, unset any existing default
        const currentDefault = schedules.find(s => s.isDefault);
        if (currentDefault && currentDefault.id !== id) {
            await settingsService.updatePaymentSchedule(currentDefault.id, { is_default: false });
        }
        
        // Set new default
        await settingsService.updatePaymentSchedule(id, { is_default: true });
        
        await loadSchedules();
        toast.success('Default schedule updated');
    } catch (error) {
        console.error('Error setting default schedule:', error);
        toast.error('Failed to update default schedule');
    }
  };

  const updateMilestone = (index: number, field: keyof Milestone, value: any) => {
    const newMilestones = [...formData.milestones];
    newMilestones[index] = { ...newMilestones[index], [field]: value };
    setFormData({ ...formData, milestones: newMilestones });
  };

  const addMilestone = () => {
    const newMilestone: Milestone = {
      id: Date.now().toString(),
      name: 'New Payment',
      percentage: 0,
      dueType: 'before_event',
      daysOffset: 0
    };
    setFormData({ ...formData, milestones: [...formData.milestones, newMilestone] });
  };

  const removeMilestone = (index: number) => {
    const newMilestones = formData.milestones.filter((_, i) => i !== index);
    setFormData({ ...formData, milestones: newMilestones });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/settings')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-6 w-6 text-gray-500" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Payment Schedules</h2>
            <p className="text-sm text-gray-500">Define standard payment terms for your events.</p>
          </div>
        </div>
        <button
          onClick={handleAddNew}
          disabled={editingId !== null}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 disabled:opacity-50"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Schedule
        </button>
      </div>

      {loading && schedules.length === 0 ? (
          <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-pink-500 border-t-transparent"></div>
              <p className="mt-2 text-gray-500">Loading schedules...</p>
          </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
            {schedules.map((schedule) => (
            <div 
                key={schedule.id} 
                className={`bg-white shadow sm:rounded-lg border-l-4 ${schedule.isDefault ? 'border-pink-500' : 'border-gray-200'} overflow-hidden`}
            >
                {editingId === schedule.id ? (
                // Edit Mode
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Schedule Name</label>
                        <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <input
                        type="text"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                        />
                    </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-4">Payment Milestones</h4>
                    <div className="space-y-3">
                        {formData.milestones.map((milestone, index) => (
                        <div key={milestone.id} className="flex items-center gap-3 bg-gray-50 p-3 rounded-md">
                            <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-500">Name</label>
                            <input
                                type="text"
                                value={milestone.name}
                                onChange={(e) => updateMilestone(index, 'name', e.target.value)}
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                            />
                            </div>
                            <div className="w-24">
                            <label className="block text-xs font-medium text-gray-500">Percent %</label>
                            <input
                                type="number"
                                value={milestone.percentage}
                                onChange={(e) => updateMilestone(index, 'percentage', parseFloat(e.target.value))}
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                            />
                            </div>
                            <div className="w-40">
                            <label className="block text-xs font-medium text-gray-500">Due</label>
                            <select
                                value={milestone.dueType}
                                onChange={(e) => updateMilestone(index, 'dueType', e.target.value)}
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                            >
                                <option value="on_booking">On Booking</option>
                                <option value="before_event">Before Event</option>
                                <option value="after_event">After Event</option>
                            </select>
                            </div>
                            {milestone.dueType !== 'on_booking' && (
                            <div className="w-32">
                                <label className="block text-xs font-medium text-gray-500">Days Offset</label>
                                <div className="relative mt-1 rounded-md shadow-sm">
                                <input
                                    type="number"
                                    value={milestone.daysOffset}
                                    onChange={(e) => updateMilestone(index, 'daysOffset', parseInt(e.target.value))}
                                    className="block w-full border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                                />
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <span className="text-gray-500 sm:text-xs">days</span>
                                </div>
                                </div>
                            </div>
                            )}
                            <div className="pt-5">
                            <button
                                onClick={() => removeMilestone(index)}
                                className="text-red-600 hover:text-red-800"
                            >
                                <Trash2 className="h-5 w-5" />
                            </button>
                            </div>
                        </div>
                        ))}
                    </div>
                    <button
                        onClick={addMilestone}
                        className="mt-3 text-sm text-pink-600 hover:text-pink-800 font-medium flex items-center"
                    >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Milestone
                    </button>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSaveEdit}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700"
                    >
                        Save Schedule
                    </button>
                    </div>
                </div>
                ) : (
                // View Mode
                <div className="p-6">
                    <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <Clock className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                        <h3 className="text-lg font-medium text-gray-900 flex items-center">
                            {schedule.name}
                            {schedule.isDefault && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                                Default
                            </span>
                            )}
                        </h3>
                        <p className="text-sm text-gray-500">{schedule.description}</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        {!schedule.isDefault && (
                        <button
                            onClick={() => handleSetDefault(schedule.id)}
                            className="text-sm text-gray-500 hover:text-pink-600 px-3 py-1"
                        >
                            Set as Default
                        </button>
                        )}
                        <button
                        onClick={() => handleEdit(schedule)}
                        className="text-indigo-600 hover:text-indigo-900 px-3 py-1 text-sm font-medium"
                        >
                            Edit
                        </button>
                        {!schedule.isDefault && (
                        <button
                            onClick={() => handleDelete(schedule.id)}
                            className="text-red-600 hover:text-red-900 px-3 py-1 text-sm font-medium"
                        >
                            Delete
                        </button>
                        )}
                    </div>
                    </div>
                    
                    <div className="mt-6 border-t border-gray-100 pt-4">
                    <div className="flow-root">
                        <ul className="-mb-8">
                        {schedule.milestones.map((milestone, idx) => (
                            <li key={milestone.id}>
                            <div className="relative pb-8">
                                {idx !== schedule.milestones.length - 1 && (
                                <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                                )}
                                <div className="relative flex space-x-3">
                                <div>
                                    <span className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center ring-8 ring-white">
                                    <Calendar className="h-4 w-4 text-gray-500" />
                                    </span>
                                </div>
                                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                    <div>
                                    <p className="text-sm text-gray-500">
                                        <span className="font-medium text-gray-900">{milestone.name}</span>
                                        {' '}({milestone.percentage}%)
                                    </p>
                                    </div>
                                    <div className="whitespace-nowrap text-right text-sm text-gray-500">
                                    {milestone.dueType === 'on_booking' ? (
                                        <span className="text-green-600 font-medium">Due on Booking</span>
                                    ) : (
                                        <span>
                                        {milestone.daysOffset} days {milestone.dueType.replace('_', ' ')}
                                        </span>
                                    )}
                                    </div>
                                </div>
                                </div>
                            </div>
                            </li>
                        ))}
                        </ul>
                    </div>
                    </div>
                </div>
                )}
            </div>
            ))}
        </div>
      )}

      <div className="rounded-md bg-blue-50 p-4">
        <div className="flex">
          <div className="shrink-0">
            <AlertCircle className="h-5 w-5 text-blue-400" aria-hidden="true" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Suggestions & Tips</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>Payment Reminders:</strong> Consider setting up automated email reminders for upcoming payments in the "Automations" section.
                </li>
                <li>
                  <strong>Fixed Amounts:</strong> While these schedules use percentages, you can override specific amounts (like a fixed  MXN retainer) directly on individual Quotes/Invoices.
                </li>
                <li>
                  <strong>Late Fees:</strong> You can define late fee policies in your Contract Templates.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
