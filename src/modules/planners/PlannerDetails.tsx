import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Globe, Mail, Phone, Briefcase, MessageSquare, FileText, Settings, User, Plus, Check, Trash2 } from 'lucide-react';
import { plannerService } from '../../services/plannerService';
import { eventService } from '../../services/eventService';
import { clientService } from '../../services/clientService';
import { venueService } from '../../services/venueService';
import { taskService } from '../../services/taskService';
import { userService } from '../../services/userService';
import type { Planner } from '../../types/planner';
import type { Event } from '../../types/event';
import type { Client } from '../../types/client';
import type { Venue } from '../../types/venue';
import type { Task, TaskTemplate } from '../../types/task';
import type { User as AppUser } from '../../services/userService';
import NotesTab from '../../components/NotesTab';
import toast from 'react-hot-toast';

type Tab = 'overview' | 'contacts' | 'messages' | 'events' | 'facturas' | 'tasks' | 'notes' | 'settings';

export default function PlannerDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [planner, setPlanner] = useState<Planner | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [clientsMap, setClientsMap] = useState<Record<string, Client>>({});
  const [venuesMap, setVenuesMap] = useState<Record<string, Venue>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');

  useEffect(() => {
    if (id) {
      loadPlanner(id);
    }
  }, [id]);

  const loadPlanner = async (plannerId: string) => {
    try {
      const [plannerData, eventsData, tasksData, usersData, templatesData] = await Promise.all([
        plannerService.getPlanner(plannerId),
        eventService.getEventsByPlanner(plannerId),
        taskService.getTasksByPlanner(plannerId),
        userService.getUsers(),
        taskService.getTemplates()
      ]);
      
      if (plannerData) {
        setPlanner(plannerData);
        setEvents(eventsData);
        setTasks(tasksData);
        setUsers(usersData);
        setTaskTemplates(templatesData);

        // Fetch related clients and venues
        const clientIds = Array.from(new Set(eventsData.map(e => e.client_id).filter((id): id is string => !!id)));
        const venueIds = Array.from(new Set(eventsData.map(e => e.venue_id).filter((id): id is string => !!id)));

        const clientsData = await Promise.all(clientIds.map(id => clientService.getClient(id)));
        const venuesData = await Promise.all(venueIds.map(id => venueService.getVenue(id)));

        const newClientsMap: Record<string, Client> = {};
        clientsData.forEach(c => { if (c) newClientsMap[c.id] = c; });
        setClientsMap(newClientsMap);

        const newVenuesMap: Record<string, Venue> = {};
        venuesData.forEach(v => { if (v) newVenuesMap[v.id] = v; });
        setVenuesMap(newVenuesMap);
      } else {
        toast.error('Planner not found');
        navigate('/planners');
      }
    } catch (error) {
      console.error('Error loading planner details:', error);
      toast.error('Failed to load planner details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !planner) return;

    try {
      const newTask = await taskService.addTask({
        planner_id: planner.id,
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
    if (!planner) return;
    const template = taskTemplates.find(t => t.id === templateId);
    if (!template) return;

    try {
      const newTask = await taskService.addTask({
        planner_id: planner.id,
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
    { id: 'tasks', label: 'Tasks' },
    { id: 'notes', label: 'Notes' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/planners" className="text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">{planner.first_name} {planner.last_name}</h1>
        </div>
        <Link
          to={`/planners/${planner.id}/edit`}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          <Edit className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400 dark:text-gray-400" />
          Edit Planner
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
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white dark:text-white">Planner Information</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">Professional details and contact information.</p>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 dark:border-gray-700 px-4 py-5 sm:px-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Full Name</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white">{planner.first_name} {planner.last_name}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Company</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white flex items-center">
                  <Briefcase className="h-4 w-4 mr-2 text-gray-400" />
                  {planner.company || <span className="text-gray-400 italic">N/A</span>}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Email</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-gray-400" />
                  <a href={`mailto:${planner.email}`} className="text-primary hover:text-primary/80">{planner.email}</a>
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Phone</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-gray-400" />
                  {planner.phone ? (
                    <a href={`tel:${planner.phone}`} className="text-gray-900 dark:text-white dark:text-white hover:text-gray-700">{planner.phone}</a>
                  ) : (
                    <span className="text-gray-400 italic">No phone provided</span>
                  )}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Online Presence</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white flex space-x-4">
                  {planner.website && (
                    <a href={planner.website} target="_blank" rel="noopener noreferrer" className="flex items-center text-primary hover:text-primary/80">
                      <Globe className="h-4 w-4 mr-1" /> Website
                    </a>
                  )}
                  {planner.instagram && (
                    <a href={planner.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center text-primary hover:text-primary/80">
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

      {activeTab === 'events' && (
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white dark:text-white">Events</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">Events managed by this planner.</p>
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
                      Venue
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">View</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 dark:bg-gray-800 divide-y divide-gray-200">
                  {events.map((event) => {
                    const client = event.client_id ? clientsMap[event.client_id] : null;
                    const venue = event.venue_id ? venuesMap[event.venue_id] : null;
                    
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
                          {venue ? (
                            <Link to={`/venues/${venue.id}`} className="text-primary hover:text-pink-900">
                              {venue.name}
                            </Link>
                          ) : (
                            <span className="text-gray-400">{event.venue_name || '-'}</span>
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
              No events found for this planner.
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

      {activeTab !== 'overview' && activeTab !== 'notes' && activeTab !== 'events' && activeTab !== 'tasks' && (
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg p-12 text-center">
          {activeTab === 'contacts' && <User className="mx-auto h-12 w-12 text-gray-400" />}
          {activeTab === 'messages' && <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />}
          {activeTab === 'facturas' && <FileText className="mx-auto h-12 w-12 text-gray-400" />}
          {activeTab === 'settings' && <Settings className="mx-auto h-12 w-12 text-gray-400" />}
          
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white dark:text-white">
            {tabs.find(t => t.id === activeTab)?.label}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">This feature is coming soon.</p>
        </div>
      )}
    </div>
  );
}