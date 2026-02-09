import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, DollarSign, ChevronRight } from 'lucide-react';
import { payrollService } from '../../services/payrollService';
import type { PayrollRun } from '../../types/staff';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function PayrollList() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadRuns();
  }, []);

  const loadRuns = async () => {
    try {
      const data = await payrollService.getPayrollRuns();
      setRuns(data);
    } catch (error) {
      console.error('Error loading payroll runs:', error);
      // toast.error('Failed to load payroll runs');
    }
  };

  const handleGenerateRun = async () => {
    try {
      setIsGenerating(true);
      const date = new Date(selectedDate);
      await payrollService.createPayrollRun(date);
      toast.success('Payroll run generated successfully');
      loadRuns();
    } catch (error: any) {
      console.error('Error generating run:', error);
      toast.error(error.message || 'Failed to generate run');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
            Payroll Management
          </h2>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0">
          <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 dark:bg-gray-800 p-2 rounded-md shadow-sm mr-2">
            <span className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">Week of:</span>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border-gray-300 rounded-md text-sm focus:ring-primary focus:border-primary"
            />
          </div>
          <button
            type="button"
            onClick={handleGenerateRun}
            disabled={isGenerating}
            className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 disabled:opacity-50"
          >
            <Plus className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
            {isGenerating ? 'Generating...' : 'Generate Run'}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <ul role="list" className="divide-y divide-gray-200">
          {runs.length === 0 ? (
            <li className="px-4 py-12 text-center text-gray-500 dark:text-gray-400 dark:text-gray-400">
              No payroll runs found. Generate one to get started.
            </li>
          ) : (
            runs.map((run) => (
              <li key={run.id}>
                <Link to={`/payroll/${run.id}`} className="block hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700">
                  <div className="flex items-center px-4 py-4 sm:px-6">
                    <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                      <div className="truncate">
                        <div className="flex text-sm">
                          <p className="truncate font-medium text-primary">
                            {format(new Date(run.period_start), 'MMM d')} - {format(new Date(run.period_end), 'MMM d, yyyy')}
                          </p>
                          <p className="ml-1 flex-shrink-0 font-normal text-gray-500 dark:text-gray-400 dark:text-gray-400">
                            (Paid: {format(new Date(run.payment_date), 'MMM d')})
                          </p>
                        </div>
                        <div className="mt-2 flex">
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                            <DollarSign className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400" aria-hidden="true" />
                            <p>
                              Total: <span className="font-medium text-gray-900 dark:text-white dark:text-white">${run.total_amount.toLocaleString()}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex-shrink-0 sm:ml-5 sm:mt-0">
                        <div className="flex overflow-hidden -space-x-1">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            run.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {run.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="ml-5 flex-shrink-0">
                      <ChevronRight className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                  </div>
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
