import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Globe, Mail, Phone, Briefcase, MessageSquare, Calendar, FileText, Settings, User } from 'lucide-react';
import { plannerService } from '../../services/plannerService';
import type { Planner } from '../../types/planner';
import NotesTab from '../../components/NotesTab';
import toast from 'react-hot-toast';

type Tab = 'overview' | 'contacts' | 'messages' | 'events' | 'facturas' | 'notes' | 'settings';

export default function PlannerDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [planner, setPlanner] = useState<Planner | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  useEffect(() => {
    if (id) {
      loadPlanner(id);
    }
  }, [id]);

  const loadPlanner = async (plannerId: string) => {
    try {
      const data = await plannerService.getPlanner(plannerId);
      if (data) {
        setPlanner(data);
      } else {
        toast.error('Planner not found');
        navigate('/planners');
      }
    } catch (error) {
      toast.error('Failed to load planner details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (!planner) {
    return null;
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'contacts', label: 'Contacts' },
    { id: 'messages', label: 'Messages' },
    { id: 'events', label: 'Events' },
    { id: 'facturas', label: 'Facturas' },
    { id: 'notes', label: 'Notes' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/planners" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{planner.first_name} {planner.last_name}</h1>
        </div>
        <Link
          to={`/planners/${planner.id}/edit`}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
        >
          <Edit className="h-5 w-5 mr-2 text-gray-500" />
          Edit Planner
        </Link>
      </div>

      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-pink-500 text-pink-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Planner Information</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Professional details and contact information.</p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{planner.first_name} {planner.last_name}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Company</dt>
                <dd className="mt-1 text-sm text-gray-900 flex items-center">
                  <Briefcase className="h-4 w-4 mr-2 text-gray-400" />
                  {planner.company || <span className="text-gray-400 italic">N/A</span>}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900 flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-gray-400" />
                  <a href={`mailto:${planner.email}`} className="text-pink-600 hover:text-pink-500">{planner.email}</a>
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="mt-1 text-sm text-gray-900 flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-gray-400" />
                  {planner.phone ? (
                    <a href={`tel:${planner.phone}`} className="text-gray-900 hover:text-gray-700">{planner.phone}</a>
                  ) : (
                    <span className="text-gray-400 italic">No phone provided</span>
                  )}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Online Presence</dt>
                <dd className="mt-1 text-sm text-gray-900 flex space-x-4">
                  {planner.website && (
                    <a href={planner.website} target="_blank" rel="noopener noreferrer" className="flex items-center text-pink-600 hover:text-pink-500">
                      <Globe className="h-4 w-4 mr-1" /> Website
                    </a>
                  )}
                  {planner.instagram && (
                    <a href={planner.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center text-pink-600 hover:text-pink-500">
                      <Globe className="h-4 w-4 mr-1" /> Instagram
                    </a>
                  )}
                  {planner.facebook && (
                    <a href={planner.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:text-blue-500">
                      <Globe className="h-4 w-4 mr-1" /> Facebook
                    </a>
                  )}
                  {!planner.website && !planner.instagram && !planner.facebook && <span className="text-gray-400 italic">No online presence listed</span>}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {activeTab === 'notes' && (
        <NotesTab entityId={planner.id} entityType="planner" />
      )}

      {activeTab !== 'overview' && activeTab !== 'notes' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-12 text-center">
          {activeTab === 'contacts' && <User className="mx-auto h-12 w-12 text-gray-400" />}
          {activeTab === 'messages' && <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />}
          {activeTab === 'events' && <Calendar className="mx-auto h-12 w-12 text-gray-400" />}
          {activeTab === 'facturas' && <FileText className="mx-auto h-12 w-12 text-gray-400" />}
          {activeTab === 'settings' && <Settings className="mx-auto h-12 w-12 text-gray-400" />}
          
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {tabs.find(t => t.id === activeTab)?.label}
          </h3>
          <p className="mt-1 text-sm text-gray-500">This feature is coming soon.</p>
        </div>
      )}
    </div>
  );
}