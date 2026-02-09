import { useState, useEffect } from 'react';
import { Calendar, User, DollarSign, FileText, MapPin } from 'lucide-react';
import { staffService } from '../../services/staffService';
import { supabase } from '../../lib/supabase';
import type { EventStaffAssignment } from '../../types/staff';
import StaffProfileDetails from './StaffProfileDetails';
import toast from 'react-hot-toast';

export default function StaffDashboard() {
  const [activeTab, setActiveTab] = useState<'schedule' | 'profile' | 'pay'>('schedule');
  const [assignments, setAssignments] = useState<EventStaffAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const schedule = await staffService.getStaffSchedule(user.id);
        setAssignments(schedule);
      }
    } catch (error) {
      console.error('Error loading staff data:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64">Loading...</div>;

  const upcomingAssignments = assignments.filter(a => 
    a.status !== 'completed' && a.status !== 'declined'
  );

  const pastAssignments = assignments.filter(a => 
    a.status === 'completed'
  );

  return (
    <div className="space-y-6">
      {/* Mobile-friendly Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`${
              activeTab === 'schedule'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Calendar className="mr-2 h-5 w-5" />
            My Schedule
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`${
              activeTab === 'profile'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <User className="mr-2 h-5 w-5" />
            My Profile
          </button>
          <button
            onClick={() => setActiveTab('pay')}
            className={`${
              activeTab === 'pay'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <DollarSign className="mr-2 h-5 w-5" />
            Pay Stubs
          </button>
        </nav>
      </div>

      {/* Content Area */}
      <div className="min-h-[400px]">
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white">Upcoming Events</h2>
            {upcomingAssignments.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 dark:text-gray-400">No upcoming events assigned.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {upcomingAssignments.map((assignment) => (
                  <div key={assignment.id} className="bg-white dark:bg-gray-800 dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <div className="flex items-center justify-between mb-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {assignment.role}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                          {assignment.event?.date}
                        </span>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white mb-2">
                        {assignment.event?.name}
                      </h3>
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 mb-4">
                        <MapPin className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {assignment.event?.venue_name || 'TBD'}
                      </div>
                      
                      <div className="border-t border-gray-200 dark:border-gray-700 dark:border-gray-700 pt-4 mt-4">
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-gray-900 dark:text-white dark:text-white">
                            <span className="font-medium">Pay:</span> ${assignment.pay_rate} ({assignment.pay_type})
                          </div>
                          {/* Placeholder for Run Sheet Link */}
                          <button className="text-primary hover:text-primary/80 text-sm font-medium flex items-center">
                            <FileText className="h-4 w-4 mr-1" /> Run Sheet
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && userId && (
          <StaffProfileDetails userId={userId} />
        )}

        {activeTab === 'pay' && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white">Payment History</h2>
            <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {pastAssignments.filter(a => a.is_paid).length === 0 ? (
                  <li className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 dark:text-gray-400 text-sm">
                    No payment records found.
                  </li>
                ) : (
                  pastAssignments.filter(a => a.is_paid).map((assignment) => (
                    <li key={assignment.id} className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white dark:text-white">
                            {assignment.event?.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                            {assignment.event?.date} • {assignment.role}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-green-600">
                            +${assignment.total_pay || assignment.pay_rate}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">
                            Paid on {assignment.paid_at ? new Date(assignment.paid_at).toLocaleDateString() : '-'}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
