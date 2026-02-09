import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Briefcase, Eye } from 'lucide-react';
import { plannerService } from '../../services/plannerService';
import type { Planner } from '../../types/planner';
import toast from 'react-hot-toast';
import { formatPhoneNumber } from '../../utils/formatters';

export default function PlannerList() {
  const navigate = useNavigate();
  const [planners, setPlanners] = useState<Planner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadPlanners();
  }, []);

  const loadPlanners = async () => {
    try {
      const data = await plannerService.getPlanners();
      setPlanners(data);
    } catch (error) {
      toast.error('Failed to load planners');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this planner?')) {
      try {
        await plannerService.deletePlanner(id);
        toast.success('Planner deleted successfully');
        loadPlanners();
      } catch (error) {
        toast.error('Failed to delete planner');
      }
    }
  };

  const filteredPlanners = planners.filter(planner =>
    planner.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    planner.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    planner.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (planner.company && planner.company.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">Planners</h1>
        <Link
          to="/planners/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Planner
        </Link>
      </div>

      <div className="flex items-center px-4 py-3 bg-white dark:bg-gray-800 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg shadow-sm">
        <Search className="h-5 w-5 text-gray-400 mr-3" />
        <input
          type="text"
          placeholder="Search planners..."
          className="flex-1 border-none focus:ring-0 text-gray-900 dark:text-white dark:text-white placeholder-gray-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredPlanners.map((planner) => (
            <li key={planner.id}>
              <div 
                onClick={() => navigate(`/planners/${planner.id}`)}
                className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center min-w-0 flex-1">
                  <div className="min-w-0 flex-1 px-4 md:grid md:grid-cols-2 md:gap-4">
                    <div>
                      <p className="text-sm font-medium text-primary truncate">{planner.first_name} {planner.last_name}</p>
                      <p className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                        <span className="truncate">{planner.email}</span>
                      </p>
                    </div>
                    <div className="hidden md:block">
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white dark:text-white flex items-center">
                          <Briefcase className="shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                          {planner.company || <span className="text-gray-400 italic">No Company</span>}
                        </p>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                          {formatPhoneNumber(planner.phone) || <span className="text-gray-400 italic">No Phone</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Link
                    to={`/planners/${planner.id}`}
                    className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Eye className="h-4 w-4 mr-1" /> View
                  </Link>
                  <Link
                    to={`/planners/${planner.id}/edit`}
                    className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-blue-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Edit className="h-4 w-4 mr-1" /> Edit
                  </Link>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(planner.id); }}
                    className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
          {filteredPlanners.length === 0 && (
            <li className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 dark:text-gray-400">
              No planners found.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
