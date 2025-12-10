import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Calendar, Mail, Eye } from 'lucide-react';
import { leadService } from '../../services/leadService';
import type { Lead } from '../../types/lead';
import toast from 'react-hot-toast';

export default function LeadList() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      const data = await leadService.getLeads();
      setLeads(data);
    } catch (error) {
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      try {
        await leadService.deleteLead(id);
        toast.success('Lead deleted successfully');
        loadLeads();
      } catch (error) {
        toast.error('Failed to delete lead');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'bg-blue-100 text-blue-800';
      case 'Contacted': return 'bg-yellow-100 text-yellow-800';
      case 'Qualified': return 'bg-green-100 text-green-800';
      case 'Converted': return 'bg-purple-100 text-purple-800';
      case 'Lost': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredLeads = leads.filter(lead =>
    lead.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <Link
          to="/leads/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Lead
        </Link>
      </div>

      <div className="flex items-center px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm">
        <Search className="h-5 w-5 text-gray-400 mr-3" />
        <input
          type="text"
          placeholder="Search leads..."
          className="flex-1 border-none focus:ring-0 text-gray-900 placeholder-gray-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredLeads.map((lead) => (
            <li key={lead.id}>
              <div 
                onClick={() => navigate(`/leads/${lead.id}`)}
                className="px-4 py-4 sm:px-6 hover:bg-gray-50 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center min-w-0 flex-1">
                  <div className="min-w-0 flex-1 px-4 md:grid md:grid-cols-2 md:gap-4">
                    <div>
                      <p className="text-sm font-medium text-pink-600 truncate">
                        {lead.first_name} {lead.last_name}
                      </p>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <Mail className="shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        <span className="truncate">{lead.email}</span>
                      </div>
                    </div>
                    <div className="hidden md:block">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {lead.event_date || 'No date set'}
                        <span className={`ml-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                          {lead.status}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-gray-500">
                        {lead.event_type} • {lead.guest_count ? `${lead.guest_count} guests` : 'Guests TBD'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Link 
                    to={`/leads/${lead.id}`} 
                    className="text-gray-400 hover:text-gray-500" 
                    title="View"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Eye className="h-5 w-5" />
                  </Link>
                  <Link 
                    to={`/leads/${lead.id}/edit`} 
                    className="text-gray-400 hover:text-gray-500" 
                    title="Edit"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Edit className="h-5 w-5" />
                  </Link>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(lead.id); }} 
                    className="text-gray-400 hover:text-red-500" 
                    title="Delete"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
