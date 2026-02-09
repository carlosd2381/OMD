import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Download, Printer } from 'lucide-react';
import { payrollService } from '../../services/payrollService';
import type { PayrollRun, EventStaffAssignment } from '../../types/staff';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function PayrollRunDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [run, setRun] = useState<PayrollRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (id) loadRunDetails();
  }, [id]);

  const loadRunDetails = async () => {
    try {
      if (!id) return;
      const data = await payrollService.getPayrollRunDetails(id);
      setRun(data);
    } catch (error) {
      console.error('Error loading run details:', error);
      toast.error('Failed to load payroll run details');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayment = async () => {
    if (!run || !confirm('Are you sure you want to mark this run as PAID? This cannot be undone.')) return;
    
    try {
      setProcessing(true);
      await payrollService.processPayrollRun(run.id);
      toast.success('Payroll run processed successfully');
      loadRunDetails();
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!run) return <div>Run not found</div>;

  // Group items by staff member for display
  const staffGroups = (run.items || []).reduce((acc, item) => {
    const staffId = item.staff_id;
    if (!acc[staffId]) {
      acc[staffId] = {
        staff: item.staff,
        items: [],
        total: 0
      };
    }
    acc[staffId].items.push(item);
    acc[staffId].total += (item.total_pay || item.pay_rate || 0);
    return acc;
  }, {} as Record<string, { staff: any, items: EventStaffAssignment[], total: number }>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/payroll')} className="text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">
              Payroll Run: {format(new Date(run.period_start), 'MMM d')} - {format(new Date(run.period_end), 'MMM d')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
              Status: <span className="font-medium uppercase">{run.status}</span> • Payment Date: {format(new Date(run.payment_date), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </button>
          <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
          {run.status !== 'paid' && (
            <button
              onClick={handleProcessPayment}
              disabled={processing}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              <Check className="h-4 w-4 mr-2" />
              {processing ? 'Processing...' : 'Mark as Paid'}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white dark:text-white">Summary</h3>
          <dl className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="px-4 py-5 bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 shadow rounded-lg overflow-hidden sm:p-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 truncate">Total Staff</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white dark:text-white">{Object.keys(staffGroups).length}</dd>
            </div>
            <div className="px-4 py-5 bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 shadow rounded-lg overflow-hidden sm:p-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 truncate">Total Assignments</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white dark:text-white">{(run.items || []).length}</dd>
            </div>
            <div className="px-4 py-5 bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 shadow rounded-lg overflow-hidden sm:p-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 truncate">Total Payout</dt>
              <dd className="mt-1 text-3xl font-semibold text-green-600">${run.total_amount.toLocaleString()}</dd>
            </div>
          </dl>
        </div>
        
        <ul className="divide-y divide-gray-200">
          {Object.values(staffGroups).map((group: any, idx) => (
            <li key={idx} className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-pink-100 flex items-center justify-center text-primary font-bold">
                    {group.staff?.first_name?.[0]}{group.staff?.last_name?.[0]}
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white">
                      {group.staff?.first_name} {group.staff?.last_name}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">{group.items.length} assignments</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900 dark:text-white dark:text-white">${group.total.toLocaleString()}</p>
                </div>
              </div>
              
              <div className="ml-14 mt-2">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 dark:bg-gray-700 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider">Event</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider">Date</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider">Role</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 dark:bg-gray-800 divide-y divide-gray-200">
                    {group.items.map((item: EventStaffAssignment) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white dark:text-white">{item.event?.name}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">{item.event?.date}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">{item.role}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white dark:text-white text-right">${item.total_pay || item.pay_rate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
