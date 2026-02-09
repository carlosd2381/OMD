import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Globe, Mail, Phone, User, MessageSquare, FileText, Plus, Check, Trash2, MapPin, RefreshCw, ExternalLink, Truck } from 'lucide-react';
import { venueService } from '../../services/venueService';
import { eventService } from '../../services/eventService';
import { clientService } from '../../services/clientService';
import { plannerService } from '../../services/plannerService';
import { taskService } from '../../services/taskService';
import { userService } from '../../services/userService';
import { settingsService, type DeliverySettings } from '../../services/settingsService';
import { loadGoogleMaps } from '../../utils/googleMapsLoader';
import type { Venue, VenueContact } from '../../types/venue';
import type { Event } from '../../types/event';
import type { Client } from '../../types/client';
import type { Planner } from '../../types/planner';
import type { Task, TaskTemplate } from '../../types/task';
import type { User as AppUser } from '../../services/userService';
import NotesTab from '../../components/NotesTab';
import toast from 'react-hot-toast';
import { formatPhoneNumber } from '../../utils/formatters';

type Tab = 'overview' | 'contacts' | 'messages' | 'events' | 'facturas' | 'tasks' | 'notes' | 'settings';

export default function VenueDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [contacts, setContacts] = useState<VenueContact[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings | null>(null);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [clientsMap, setClientsMap] = useState<Record<string, Client>>({});
  const [plannersMap, setPlannersMap] = useState<Record<string, Planner>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (id) {
      loadVenue(id);
    }
  }, [id]);

  const loadVenue = async (venueId: string) => {
    try {
      const [venueData, contactsData, eventsData, tasksData, usersData, templatesData, deliverySettingsData] = await Promise.all([
        venueService.getVenue(venueId),
        venueService.getVenueContacts(venueId),
        eventService.getEventsByVenue(venueId),
        taskService.getTasksByVenue(venueId),
        userService.getUsers(),
        taskService.getTemplates(),
        settingsService.getDeliverySettings()
      ]);
      
      if (venueData) {
        setVenue(venueData);
        setContacts(contactsData);
        setEvents(eventsData);
        setTasks(tasksData);
        setUsers(usersData);
        setTaskTemplates(templatesData);
        setDeliverySettings(deliverySettingsData);

        console.log('Venue Details Loaded:', {
          venue: venueData,
          eventsCount: eventsData.length,
          events: eventsData,
          deliverySettings: deliverySettingsData
        });

        // Fetch related clients and planners
        const clientIds = Array.from(new Set(eventsData.map(e => e.client_id).filter((id): id is string => !!id)));
        const plannerIds = Array.from(new Set(eventsData.map(e => e.planner_id).filter((id): id is string => !!id)));

        const clientsData = await Promise.all(clientIds.map(id => clientService.getClient(id)));
        const plannersData = await Promise.all(plannerIds.map(id => plannerService.getPlanner(id)));

        const newClientsMap: Record<string, Client> = {};
        clientsData.forEach(c => { if (c) newClientsMap[c.id] = c; });
        setClientsMap(newClientsMap);

        const newPlannersMap: Record<string, Planner> = {};
        plannersData.forEach(p => { if (p) newPlannersMap[p.id] = p; });
        setPlannersMap(newPlannersMap);
      } else {
        toast.error('Venue not found');
        navigate('/venues');
      }
    } catch (error) {
      console.error('Error loading venue details:', error);
      toast.error('Failed to load venue details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !venue) return;

    try {
      const newTask = await taskService.addTask({
        venue_id: venue.id,
        title: newTaskTitle,
        status: 'pending',
        assigned_to: newTaskAssignee || undefined,
      });
      setTasks([newTask, ...tasks]);
      setNewTaskTitle('');
      setNewTaskAssignee('');
      setIsAddingTask(false);
      toast.success('Task added');
    } catch (error) {
      console.error('Error adding task:', error);
      toast.error('Failed to add task');
    }
  };

  const handleImportTemplate = async (templateId: string) => {
    if (!venue) return;
    const template = taskTemplates.find(t => t.id === templateId);
    if (!template) return;

    try {
      const newTask = await taskService.addTask({
        venue_id: venue.id,
        title: template.title,
        description: template.description,
        status: 'pending',
      });
      setTasks([newTask, ...tasks]);
      toast.success('Task imported from template');
    } catch (error) {
      console.error('Error importing template:', error);
      toast.error('Failed to import template');
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: 'pending' | 'completed') => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      await taskService.updateTask(taskId, {
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : undefined,
      });
      
      setTasks(tasks.map(t => 
        t.id === taskId 
          ? { ...t, status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : undefined }
          : t
      ));
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await taskService.deleteTask(taskId);
      setTasks(tasks.filter(t => t.id !== taskId));
      toast.success('Task deleted');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const handleRefreshGoogleData = async () => {
    if (!venue?.address) return;
    
    try {
      setIsRefreshing(true);
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        toast.error('Google Maps API key missing');
        return;
      }

      await loadGoogleMaps(apiKey);
      
      // HQ Coordinates
      const hqLocation = "21.117218, -86.876025";
      
      const service = new window.google.maps.DistanceMatrixService();
      
      const destination = venue.latitude && venue.longitude 
        ? { lat: venue.latitude, lng: venue.longitude }
        : venue.address;

      // Wrap getDistanceMatrix in a promise
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await new Promise<any>((resolve, reject) => {
        service.getDistanceMatrix(
          {
            origins: [hqLocation],
            destinations: [destination],
            travelMode: 'DRIVING',
            unitSystem: window.google.maps.UnitSystem.METRIC,
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (response: any, status: any) => {
            if (status === 'OK') resolve(response);
            else reject(status);
          }
        );
      });

      if (result.rows[0].elements[0].status === 'OK') {
        const element = result.rows[0].elements[0];
        const distanceKm = parseFloat((element.distance.value / 1000).toFixed(1));
        const durationMins = Math.round(element.duration.value / 60);

        // Update venue in DB
        const updatedVenue = await venueService.updateVenue(venue.id, {
          travel_distance_km: distanceKm,
          travel_time_mins: durationMins
        });

        setVenue(updatedVenue);
        toast.success('Travel details updated');
      } else {
        toast.error('Could not calculate distance');
      }

    } catch (error) {
      console.error('Error refreshing Google data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (!venue) {
    return null;
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'contacts', label: 'Contacts' },
    { id: 'messages', label: 'Messages' },
    { id: 'events', label: 'Events' },
    { id: 'facturas', label: 'Facturas' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'notes', label: 'Notes' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/venues" className="text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">{venue.name}</h1>
        </div>
        <Link
          to={`/venues/${venue.id}/edit`}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          <Edit className="h-5 w-5 mr-2" />
          Edit
        </Link>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700 dark:border-gray-700 overflow-x-auto">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white dark:text-white">Venue Overview</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">Details and contact information.</p>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 dark:border-gray-700 px-4 py-5 sm:px-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Venue Name</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white">{venue.name}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Area</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white">{venue.venue_area || 'N/A'}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Address</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white">
                  {venue.address}<br />
                  {venue.city && `${venue.city}, `}{venue.state} {venue.zip_code}<br />
                  {venue.country}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Contact Info</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white space-y-1">
                  {venue.email && (
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-gray-400" />
                      <a href={`mailto:${venue.email}`} className="text-primary hover:text-primary/80">{venue.email}</a>
                    </div>
                  )}
                  {venue.phone && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-gray-400" />
                      <a href={`tel:${venue.phone}`} className="text-gray-900 dark:text-white dark:text-white hover:text-gray-700">{formatPhoneNumber(venue.phone)}</a>
                    </div>
                  )}
                  {venue.website && (
                    <div className="flex items-center">
                      <Globe className="h-4 w-4 mr-2 text-gray-400" />
                      <a href={venue.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">Website</a>
                    </div>
                  )}
                </dd>
              </div>
              {venue.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Notes</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white whitespace-pre-wrap">{venue.notes}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Google Maps & Travel Info Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 dark:border-gray-700 px-4 py-5 sm:px-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-gray-400" />
                Location & Travel Details
              </h4>
              <button
                onClick={handleRefreshGoogleData}
                disabled={isRefreshing}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh Data
              </button>
            </div>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Coordinates</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white">
                  {venue.latitude && venue.longitude ? (
                    <div className="flex items-center">
                      <span>{venue.latitude.toFixed(6)}, {venue.longitude.toFixed(6)}</span>
                      {venue.map_url && (
                        <a 
                          href={venue.map_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="ml-2 text-primary hover:text-primary/80 inline-flex items-center"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View on Maps
                        </a>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400 italic">Not available</span>
                  )}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Travel from HQ</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white">
                  {venue.travel_distance_km !== undefined && venue.travel_time_mins !== undefined ? (
                    <div>
                      <span className="font-medium">{venue.travel_distance_km} km</span>
                      <span className="mx-2 text-gray-300">|</span>
                      <span className="font-medium">{venue.travel_time_mins} mins</span>
                    </div>
                  ) : (
                    <span className="text-gray-400 italic">Not calculated</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {activeTab === 'contacts' && (
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white dark:text-white">Contacts</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">Associated contacts for this venue.</p>
          </div>
          {contacts.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {contacts.map((contact) => (
                <li key={contact.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="shrink-0">
                        <User className="h-10 w-10 rounded-full bg-gray-100 p-2 text-gray-500 dark:text-gray-400 dark:text-gray-400" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white dark:text-white">
                          {contact.first_name} {contact.last_name}
                          {contact.is_primary && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">{contact.role}</div>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-gray-900 dark:text-white dark:text-white">{contact.email}</div>
                      <div className="text-gray-500 dark:text-gray-400 dark:text-gray-400">{formatPhoneNumber(contact.phone)}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-5 sm:px-6 text-gray-500 dark:text-gray-400 dark:text-gray-400 text-sm">
              No contacts found for this venue.
            </div>
          )}
        </div>
      )}

      {activeTab === 'notes' && (
        <NotesTab entityId={venue.id} entityType="venue" />
      )}

      {activeTab === 'events' && (
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white dark:text-white">Events</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">Events scheduled at this venue.</p>
          </div>
          {events.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 dark:bg-gray-700 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                      Event Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                      Client
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                      Planner
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">View</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 dark:bg-gray-800 divide-y divide-gray-200">
                  {events.map((event) => {
                    const client = event.client_id ? clientsMap[event.client_id] : null;
                    const planner = event.planner_id ? plannersMap[event.planner_id] : null;
                    
                    return (
                      <tr key={event.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white dark:text-white">
                          {new Date(event.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white dark:text-white">
                          {event.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                          {client ? (
                            <Link to={`/clients/${client.id}`} className="text-primary hover:text-pink-900">
                              {client.first_name} {client.last_name}
                            </Link>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                          {planner ? (
                            <Link to={`/planners/${planner.id}`} className="text-primary hover:text-pink-900">
                              {planner.first_name} {planner.last_name}
                            </Link>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {client && (
                            <Link to={`/clients/${client.id}`} className="text-primary hover:text-pink-900">
                              View Client
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-4 py-5 sm:px-6 text-gray-500 dark:text-gray-400 dark:text-gray-400 text-sm">
              No events found for this venue.
            </div>
          )}
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white dark:text-white">Tasks</h3>
            <div className="flex space-x-2">
              <select 
                onChange={(e) => {
                  if (e.target.value) {
                    handleImportTemplate(e.target.value);
                    e.target.value = ''; // Reset
                  }
                }}
                className="block w-full pl-3 pr-10 py-1.5 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
              >
                <option value="">Import Template...</option>
                {taskTemplates.map(t => (
                  <option key={t.id} value={t.id}>{t.title} ({t.category})</option>
                ))}
              </select>
              <button 
                onClick={() => setIsAddingTask(true)}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-1" /> Add Task
              </button>
            </div>
          </div>
          
          {isAddingTask && (
            <div className="px-4 py-4 bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
              <form onSubmit={handleAddTask} className="flex gap-2 items-start sm:items-center flex-col sm:flex-row">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Enter task title..."
                  className="flex-1 shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                  autoFocus
                />
                <select
                  value={newTaskAssignee}
                  onChange={(e) => setNewTaskAssignee(e.target.value)}
                  className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:w-48 sm:text-sm border-gray-300 rounded-md"
                >
                  <option value="">Assign to...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    type="submit"
                    className="flex-1 sm:flex-none inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingTask(false)}
                    className="flex-1 sm:flex-none inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <ul className="divide-y divide-gray-200">
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <li key={task.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 flex items-center justify-between group">
                  <div className="flex items-center min-w-0 flex-1">
                    <button
                      onClick={() => handleToggleTask(task.id, task.status)}
                      className={`shrink-0 h-5 w-5 rounded border ${
                        task.status === 'completed' 
                          ? 'bg-green-500 border-green-500 text-white' 
                          : 'border-gray-300 text-transparent hover:border-gray-400'
                      } flex items-center justify-center transition-colors duration-200`}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <div className="ml-4 flex-1">
                      <p className={`text-sm font-medium ${task.status === 'completed' ? 'text-gray-500 dark:text-gray-400 dark:text-gray-400 line-through' : 'text-gray-900 dark:text-white dark:text-white'}`}>
                        {task.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        {task.assigned_to && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            Assigned to: {users.find(u => u.id === task.assigned_to)?.name || 'Unknown'}
                          </span>
                        )}
                        {task.status === 'completed' && task.completed_at && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">
                            Completed by {task.completed_by} on {new Date(task.completed_at).toLocaleDateString()} at {new Date(task.completed_at).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 shrink-0">
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </button>
                  </div>
                </li>
              ))
            ) : (
              <li className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 dark:text-gray-400">
                No tasks yet. Add one or import from a template.
              </li>
            )}
          </ul>
        </div>
      )}

      {activeTab === 'settings' && venue && (
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white dark:text-white">Venue Settings</h3>
            <div className="mt-6 border-t border-gray-200 dark:border-gray-700 dark:border-gray-700 pt-6">
              <h4 className="text-md font-medium text-gray-900 dark:text-white dark:text-white flex items-center">
                <Truck className="h-5 w-5 mr-2 text-gray-400" />
                Flete (Delivery Fee)
              </h4>
              <div className="mt-4 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Travel Distance
                  </label>
                  <div className="mt-1 flex items-center">
                    <span className="text-gray-900 dark:text-white dark:text-white">{venue.travel_distance_km ? `${venue.travel_distance_km.toFixed(1)} km` : 'Not calculated'}</span>
                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                      (from Google Maps)
                    </span>
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="flete_fee" className="block text-sm font-medium text-gray-700">
                    Flete Fee
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-gray-500 dark:text-gray-400 dark:text-gray-400 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      name="flete_fee"
                      id="flete_fee"
                      className="focus:ring-primary focus:border-primary block w-full pl-7 pr-24 sm:text-sm border-gray-300 rounded-md"
                      placeholder="0.00"
                      value={venue.flete_fee || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setVenue({ ...venue, flete_fee: isNaN(val) ? undefined : val });
                      }}
                      onBlur={async () => {
                         if (venue) {
                           try {
                             await venueService.updateVenue(venue.id, { flete_fee: venue.flete_fee });
                             toast.success('Flete fee updated');
                           } catch (e) {
                             console.error(e);
                             toast.error('Failed to update flete fee');
                           }
                         }
                      }}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center">
                       <button
                         type="button"
                         className="h-full py-0 px-3 border-l border-gray-300 bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 text-gray-500 dark:text-gray-400 dark:text-gray-400 sm:text-sm rounded-r-md hover:bg-gray-100"
                         onClick={async () => {
                           if (!deliverySettings) {
                             toast.error('Delivery settings not loaded');
                             return;
                           }
                           if (!venue.travel_distance_km) {
                             toast.error('Distance not calculated');
                             return;
                           }
                           
                           // New Calculation Logic
                           // Distance is one-way, so we calculate for round trip
                           const roundTripDistance = venue.travel_distance_km * 2;
                           
                           // Fuel Cost: (Distance / 100) * Consumption * Price
                           const fuelCost = (roundTripDistance / 100) * (deliverySettings.fuel_consumption || 0) * (deliverySettings.fuel_price || 0);
                           
                           // Base/Service Fee: Distance * Cost Per Km
                           const baseCost = roundTripDistance * (deliverySettings.cost_per_km || 0);
                           
                           let fee = fuelCost + baseCost;
                           
                           console.log('Flete Calculation:', {
                             oneWayDistance: venue.travel_distance_km,
                             roundTripDistance,
                             fuelConsumption: deliverySettings.fuel_consumption,
                             fuelPrice: deliverySettings.fuel_price,
                             costPerKm: deliverySettings.cost_per_km,
                             fuelCost,
                             baseCost,
                             totalFee: fee
                           });

                           // Round to 2 decimals
                           fee = Math.round(fee * 100) / 100;

                           setVenue({ ...venue, flete_fee: fee });
                           try {
                             await venueService.updateVenue(venue.id, { flete_fee: fee });
                             toast.success('Flete fee recalculated');
                           } catch (e) {
                             console.error(e);
                             toast.error('Failed to save recalculated fee');
                           }
                         }}
                       >
                         Recalculate
                       </button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                    Calculated based on distance and delivery settings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab !== 'overview' && activeTab !== 'contacts' && activeTab !== 'notes' && activeTab !== 'events' && activeTab !== 'tasks' && activeTab !== 'settings' && (
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg p-12 text-center">
          {activeTab === 'messages' && <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />}
          {activeTab === 'facturas' && <FileText className="mx-auto h-12 w-12 text-gray-400" />}
          
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white dark:text-white">
            {tabs.find(t => t.id === activeTab)?.label}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">This feature is coming soon.</p>
        </div>
      )}
    </div>
  );
}