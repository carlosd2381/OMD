import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Calendar, Mail, Eye } from 'lucide-react';
import { leadService } from '../../services/leadService';
import { useConfirm } from '../../contexts/ConfirmContext';
import type { Lead } from '../../types/lead';
import toast from 'react-hot-toast';

export default function LeadList() {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'converted' | 'archived'>('active');
  const [leadFilters, setLeadFilters] = useState({ eventType: 'all', leadSource: 'all', sort: 'asc' as 'asc' | 'desc' });

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
    const confirmed = await confirm({
      title: 'Delete Lead',
      message: 'Are you sure you want to delete this lead? This action cannot be undone.',
      confirmLabel: 'Delete',
      type: 'danger'
    });

    if (confirmed) {
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

  const availableEventTypes = useMemo(() => {
    return Array.from(new Set(leads.map(lead => lead.event_type).filter(Boolean))).sort();
  }, [leads]);

  const availableLeadSources = useMemo(() => {
    return Array.from(new Set(leads.map(lead => lead.lead_source).filter(Boolean))).sort();
  }, [leads]);

  const sortedLeads = useMemo(() => {
    const direction = leadFilters.sort === 'asc' ? 1 : -1;
    return [...leads].sort((a, b) => {
      const dateA = a.event_date ? new Date(a.event_date).getTime() : Number.POSITIVE_INFINITY;
      const dateB = b.event_date ? new Date(b.event_date).getTime() : Number.POSITIVE_INFINITY;
      if (dateA === dateB) {
        return a.last_name.localeCompare(b.last_name) * direction;
      }
      return (dateA - dateB) * direction;
    });
  }, [leads, leadFilters.sort]);

  const filteredLeads = sortedLeads.filter(lead => {
    const matchesSearch = 
      lead.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'active') {
      return lead.status !== 'Converted' && lead.status !== 'Lost';
    } else if (activeTab === 'converted') {
      return lead.status === 'Converted';
    } else { // archived
      return lead.status === 'Lost';
    }
  }).filter(lead => {
    const matchesEventType = leadFilters.eventType === 'all' || lead.event_type === leadFilters.eventType;
    const matchesSource = leadFilters.leadSource === 'all' || lead.lead_source === leadFilters.leadSource;
    return matchesEventType && matchesSource;
  });

  const resetLeadFilters = () => setLeadFilters({ eventType: 'all', leadSource: 'all', sort: 'asc' });

  const activeCount = leads.filter(l => l.status !== 'Converted' && l.status !== 'Lost').length;
  const convertedCount = leads.filter(l => l.status === 'Converted').length;
  const archivedCount = leads.filter(l => l.status === 'Lost').length;

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">Leads</h1>
        <Link
          to="/leads/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Lead
        </Link>
      </div>

      <div className="space-y-3">
        <div className="flex items-center px-4 py-3 bg-white dark:bg-gray-800 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg shadow-sm">
          <Search className="h-5 w-5 text-gray-400 mr-3" />
          <input
            type="text"
            placeholder="Search leads..."
            className="flex-1 border-none focus:ring-0 text-gray-900 dark:text-white dark:text-white placeholder-gray-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg shadow-sm p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Event Type</label>
              <select
                className="w-full rounded-md border-gray-300 focus:ring-primary focus:border-primary text-sm"
                value={leadFilters.eventType}
                onChange={(e) => setLeadFilters(prev => ({ ...prev, eventType: e.target.value }))}
              >
                <option value="all">All Types</option>
                {availableEventTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Lead Source</label>
              <select
                className="w-full rounded-md border-gray-300 focus:ring-primary focus:border-primary text-sm"
                value={leadFilters.leadSource}
                onChange={(e) => setLeadFilters(prev => ({ ...prev, leadSource: e.target.value }))}
              >
                <option value="all">All Sources</option>
                {availableLeadSources.map(source => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Sort by Event Date</label>
              <select
                className="w-full rounded-md border-gray-300 focus:ring-primary focus:border-primary text-sm"
                value={leadFilters.sort}
                onChange={(e) => setLeadFilters(prev => ({ ...prev, sort: e.target.value as 'asc' | 'desc' }))}
              >
                <option value="asc">Earliest first</option>
                <option value="desc">Latest first</option>
              </select>
            </div>
            <div className="md:self-end">
              <button
                type="button"
                onClick={resetLeadFilters}
                className="px-4 py-2 text-sm font-medium text-primary hover:text-primary/80"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('active')}
            className={`${
              activeTab === 'active'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            Active Leads
            <span className={`ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium md:inline-block ${activeTab === 'active' ? 'bg-pink-100 text-primary' : 'bg-gray-100 text-gray-900 dark:text-white dark:text-white'}`}>
              {activeCount}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('converted')}
            className={`${
              activeTab === 'converted'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            Converted
            <span className={`ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium md:inline-block ${activeTab === 'converted' ? 'bg-pink-100 text-primary' : 'bg-gray-100 text-gray-900 dark:text-white dark:text-white'}`}>
              {convertedCount}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`${
              activeTab === 'archived'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            Lost / Archived
            <span className={`ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium md:inline-block ${activeTab === 'archived' ? 'bg-pink-100 text-primary' : 'bg-gray-100 text-gray-900 dark:text-white dark:text-white'}`}>
              {archivedCount}
            </span>
          </button>
        </nav>
      </div>

      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredLeads.map((lead) => (
            <li key={lead.id}>
              <div 
                onClick={() => navigate(`/leads/${lead.id}`)}
                className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center min-w-0 flex-1">
                  <div className="min-w-0 flex-1 px-4 md:grid md:grid-cols-2 md:gap-4">
                    <div>
                      <p className="text-sm font-medium text-primary truncate">
                        {lead.first_name} {lead.last_name}
                      </p>
                      <div className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                        <Mail className="shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        <span className="truncate">{lead.email}</span>
                      </div>
                    </div>
                    <div className="hidden md:block">
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                        <Calendar className="shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {lead.event_date || 'No date set'}
                        <span className={`ml-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                          {lead.status}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                        {lead.event_type} • {lead.guest_count ? `${lead.guest_count} guests` : 'Guests TBD'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Link 
                    to={`/leads/${lead.id}`} 
                    className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Eye className="h-4 w-4 mr-1" /> View
                  </Link>
                  <Link 
                    to={`/leads/${lead.id}/edit`} 
                    className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-blue-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Edit className="h-4 w-4 mr-1" /> Edit
                  </Link>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(lead.id); }} 
                    className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
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
