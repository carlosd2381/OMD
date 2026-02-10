import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Globe, Mail, Phone, Briefcase, MessageSquare, Layout, Calendar, MapPin, Users, Cake, Plus, Eye, Trash2, X, Check, Upload, Download, FileText, Image as ImageIcon } from 'lucide-react';
import { formatCurrency, formatPhoneNumber } from '../../utils/formatters';
import { buildDocSequenceMap, buildEventSequenceMap, buildEventsMap, resolveDocumentId } from '../../utils/documentSequences';
import { clientService } from '../../services/clientService';
import { eventService } from '../../services/eventService';
import { plannerService } from '../../services/plannerService';
import { venueService } from '../../services/venueService';
import { quoteService } from '../../services/quoteService';
import { questionnaireService } from '../../services/questionnaireService';
import { contractService } from '../../services/contractService';
import { invoiceService } from '../../services/invoiceService';
import { taskService } from '../../services/taskService';
import { fileService } from '../../services/fileService';
import { userService } from '../../services/userService';
import type { Client } from '../../types/client';
import type { Event } from '../../types/event';
import type { Planner } from '../../types/planner';
import type { Venue } from '../../types/venue';
import type { Quote } from '../../types/quote';
import type { Questionnaire } from '../../types/questionnaire';
import type { Contract } from '../../types/contract';
import type { Invoice } from '../../types/invoice';
import type { Task, TaskTemplate } from '../../types/task';
import type { ClientFile } from '../../types/clientFile';
import type { User } from '../../services/userService';
import NotesTab from '../../components/NotesTab';
import PortalAdminTab from './PortalAdminTab';
import toast from 'react-hot-toast';
import { currencyService } from '../../services/currencyService';
import MessageList from '../messages/MessageList';
import MessageDetail from '../messages/MessageDetail';
import { emailService } from '../../services/emailService';
import type { Email } from '../../types/email';

type Tab = 'overview' | 'quotes' | 'questionnaires' | 'invoices' | 'contracts' | 'messages' | 'tasks' | 'notes' | 'files' | 'portal';

export default function ClientDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [clientEvent, setClientEvent] = useState<Event | null>(null);
  const [secondaryClient, setSecondaryClient] = useState<Client | null>(null);
  const [planner, setPlanner] = useState<Planner | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [venueName, setVenueName] = useState<string>('');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [files, setFiles] = useState<ClientFile[]>([]);
  const [messages, setMessages] = useState<Email[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Email | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [eventsMap, setEventsMap] = useState<Record<string, Event>>({});
  const [eventSequences, setEventSequences] = useState<Record<string, number>>({});
  const [quoteDocSequences, setQuoteDocSequences] = useState<Record<string, number>>({});
  const [questionnaireDocSequences, setQuestionnaireDocSequences] = useState<Record<string, number>>({});
  const [contractDocSequences, setContractDocSequences] = useState<Record<string, number>>({});
  const [invoiceDocSequences, setInvoiceDocSequences] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  
  // File Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDescription, setUploadDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (activeTab === 'messages' && client?.email) {
      const loadMessages = async () => {
        setMessagesLoading(true);
        try {
          const fetched = await emailService.getEmailsByContact(client.email);
          setMessages(fetched);
        } catch (error) {
          console.error("Failed to load messages", error);
          toast.error("Failed to load messages");
        } finally {
          setMessagesLoading(false);
        }
      };
      loadMessages();
    }
  }, [activeTab, client?.email]);

  useEffect(() => {
    if (id) {
      loadClient(id);
    }
  }, [id]);

  const loadClient = async (clientId: string) => {
    try {
      const data = await clientService.getClient(clientId);
      if (data) {
        setClient(data);
        
        // Fetch related data
        const [events, clientQuotes, clientQuestionnaires, clientContracts, clientInvoices, clientTasks, templates, clientFiles, staffUsers] = await Promise.all([
          eventService.getEvents(),
          quoteService.getQuotesByClient(clientId),
          questionnaireService.getQuestionnairesByClient(clientId),
          contractService.getContractsByClient(clientId),
          invoiceService.getInvoicesByClient(clientId),
          taskService.getTasksByClient(clientId),
          taskService.getTemplates(),
          fileService.getFilesByClient(clientId),
          userService.getUsers()
        ]);

        setQuotes(clientQuotes);
        setQuestionnaires(clientQuestionnaires);
        setContracts(clientContracts);
        setInvoices(clientInvoices);
        setTasks(clientTasks);
        setTaskTemplates(templates);
        setFiles(clientFiles);
        setUsers(staffUsers);
        setEventsMap(buildEventsMap(events));
        setEventSequences(buildEventSequenceMap(events));
        setQuoteDocSequences(buildDocSequenceMap(clientQuotes));
        setQuestionnaireDocSequences(buildDocSequenceMap(clientQuestionnaires));
        setContractDocSequences(buildDocSequenceMap(clientContracts));
        setInvoiceDocSequences(buildDocSequenceMap(clientInvoices));

        const event = events.find(e => e.client_id === clientId);
        if (event) {
          setClientEvent(event);
          
          if (event.secondary_client_id) {
            const secClient = await clientService.getClient(event.secondary_client_id);
            setSecondaryClient(secClient);
          }

          if (event.planner_id) {
            const pln = await plannerService.getPlanner(event.planner_id);
            setPlanner(pln);
          }

          if (event.venue_id) {
            const ven = await venueService.getVenue(event.venue_id);
            setVenue(ven);
            if (ven) {
              setVenueName(ven.name);
            }
          }
        }
      } else {
        toast.error('Client not found');
        navigate('/clients');
      }
    } catch (error) {
      console.error('Error loading client details:', error);
      toast.error('Failed to load client details');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuote = async (quoteId: string) => {
    if (deleteConfirmation === quoteId) {
      try {
        await quoteService.deleteQuote(quoteId);
        setQuotes(quotes.filter(q => q.id !== quoteId));
        toast.success('Quote deleted');
      } catch (error) {
        toast.error('Failed to delete quote');
      } finally {
        setDeleteConfirmation(null);
      }
    } else {
      setDeleteConfirmation(quoteId);
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: 'pending' | 'completed') => {
    try {
      const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
      const updates: Partial<Task> = {
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : undefined,
        completed_by: newStatus === 'completed' ? 'Admin User' : undefined, // Mock user
      };
      
      await taskService.updateTask(taskId, updates);
      setTasks(tasks.map(t => t.id === taskId ? { ...t, ...updates } : t));
      toast.success(newStatus === 'completed' ? 'Task completed' : 'Task reopened');
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !client) return;

    try {
      const newTask = await taskService.addTask({
        client_id: client.id,
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
      toast.error('Failed to add task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await taskService.deleteTask(taskId);
        setTasks(tasks.filter(t => t.id !== taskId));
        toast.success('Task deleted');
      } catch (error) {
        toast.error('Failed to delete task');
      }
    }
  };

  const handleImportTemplate = async (templateId: string) => {
    const template = taskTemplates.find(t => t.id === templateId);
    if (!template || !client) return;

    try {
      const newTask = await taskService.addTask({
        client_id: client.id,
        title: template.title,
        description: template.description,
        status: 'pending',
      });
      setTasks([...tasks, newTask]);
      toast.success('Task imported from template');
    } catch (error) {
      toast.error('Failed to import task');
    }
  };

  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !client) return;

    try {
      const newFile = await fileService.uploadFile(client.id, selectedFile, uploadDescription);
      setFiles([...files, newFile]);
      setIsUploading(false);
      setSelectedFile(null);
      setUploadDescription('');
      toast.success('File uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload file');
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (deleteConfirmation === fileId) {
      try {
        await fileService.deleteFile(fileId);
        setFiles(files.filter(f => f.id !== fileId));
        toast.success('File deleted');
      } catch (error) {
        toast.error('Failed to delete file');
      } finally {
        setDeleteConfirmation(null);
      }
    } else {
      setDeleteConfirmation(fileId);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (!client) {
    return null;
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'quotes', label: 'Quotes' },
    { id: 'questionnaires', label: 'Questionnaires' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'contracts', label: 'Contracts' },
    { id: 'messages', label: 'Messages' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'notes', label: 'Notes' },
    { id: 'files', label: 'Files' },
    { id: 'portal', label: 'Client Portal' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/clients" className="text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">{client.first_name} {client.last_name}</h1>
        </div>
        <div className="flex space-x-3">
          <Link
            to={`/portal/${client.id}`}
            target="_blank"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <Layout className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400 dark:text-gray-400" />
            View Portal
          </Link>
          <Link
            to={`/clients/${client.id}/edit`}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <Edit className="h-5 w-5 mr-2" />
            Edit
          </Link>
        </div>
      </div>

      {clientEvent && (
        <div className="mt-4 flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 border border-pink-200 bg-secondary rounded-md p-2">
          <div className="flex items-center">
            <Calendar className="mr-1.5 h-4 w-4 text-primary" />
            {clientEvent.date}
          </div>
          <div className="flex items-center">
            <MapPin className="mr-1.5 h-4 w-4 text-primary" />
            {venueName || clientEvent.venue_name || 'Venue TBD'}
          </div>
          <div className="flex items-center">
            <Users className="mr-1.5 h-4 w-4 text-primary" />
            {clientEvent.guest_count ? `${clientEvent.guest_count} Guests` : 'Guest Count TBD'}
          </div>
          <div className="flex items-center">
            <Cake className="mr-1.5 h-4 w-4 text-primary" />
            {clientEvent.services && clientEvent.services.length > 0 
              ? clientEvent.services.join(', ') 
              : 'Services TBD'}
          </div>
        </div>
      )}

      <div className="border-b border-gray-200 dark:border-gray-700 dark:border-gray-700 overflow-x-auto">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white dark:text-white">Client Information</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">Personal details and contact information.</p>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 dark:border-gray-700 px-4 py-5 sm:px-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Full Name</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">{client.first_name} {client.last_name}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Role</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">{client.role || 'N/A'}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-gray-400" />
                  <a href={`mailto:${client.email}`} className="text-primary hover:text-primary/80">{client.email}</a>
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-gray-400" />
                  {client.phone ? (
                    <a href={`tel:${client.phone}`} className="text-gray-900 dark:text-white hover:text-gray-700">
                      {formatPhoneNumber(client.phone)}
                    </a>
                  ) : (
                    <span className="text-gray-400 italic">No phone provided</span>
                  )}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Company</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white flex items-center">
                  <Briefcase className="h-4 w-4 mr-2 text-gray-400" />
                  {client.company_name || <span className="text-gray-400 italic">N/A</span>}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Type</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">{client.type || 'N/A'}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Lead Source</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">{client.lead_source || 'N/A'}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {client.address ? (
                    <>
                      {client.address}<br />
                      {client.city && `${client.city}, `}{client.state} {client.zip_code}<br />
                      {client.country}
                    </>
                  ) : (
                    <span className="text-gray-400 italic">No address provided</span>
                  )}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Social Media</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white flex space-x-4">
                  {client.instagram && (
                    <a href={client.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center text-primary hover:text-primary/80">
                      <Globe className="h-4 w-4 mr-1" /> Instagram
                    </a>
                  )}
                  {client.facebook && (
                    <a href={client.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:text-blue-500">
                      <Globe className="h-4 w-4 mr-1" /> Facebook
                    </a>
                  )}
                  {!client.instagram && !client.facebook && <span className="text-gray-400 italic">No social media profiles</span>}
                </dd>
              </div>
              {client.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Notes</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{client.notes}</dd>
                </div>
              )}
            </dl>
          </div>
          </div>

          {/* Event Contacts Section */}
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white dark:text-white">Event Contacts</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">Key contacts associated with this event.</p>
              </div>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 dark:border-gray-700 px-4 py-5 sm:px-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {/* Primary Client */}
                <div className="bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-700 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">Primary Client</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">{client.role}</span>
                  </div>
                  <div className="font-medium text-gray-900 dark:text-white dark:text-white">{client.first_name} {client.last_name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 mt-1 flex items-center"><Mail className="h-3 w-3 mr-1"/> {client.email}</div>
                  {client.phone && <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 mt-1 flex items-center"><Phone className="h-3 w-3 mr-1"/> {formatPhoneNumber(client.phone)}</div>}
                </div>

                {/* Secondary Client */}
                {secondaryClient ? (
                  <div className="bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-700 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Secondary Client</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">{secondaryClient.role}</span>
                    </div>
                    <div className="font-medium text-gray-900 dark:text-white dark:text-white">{secondaryClient.first_name} {secondaryClient.last_name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 mt-1 flex items-center"><Mail className="h-3 w-3 mr-1"/> {secondaryClient.email}</div>
                    {secondaryClient.phone && <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 mt-1 flex items-center"><Phone className="h-3 w-3 mr-1"/> {formatPhoneNumber(secondaryClient.phone)}</div>}
                  </div>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-700 dark:border-gray-700 border-dashed flex flex-col items-center justify-center text-gray-400 h-full min-h-[120px]">
                    <span className="text-sm">No Secondary Client</span>
                  </div>
                )}

                {/* Planner */}
                {(planner || clientEvent?.planner_name || clientEvent?.planner_first_name) && (
                  <div className="bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-700 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Planner</span>
                    </div>
                    {planner ? (
                      <>
                        <div className="font-medium text-gray-900 dark:text-white dark:text-white">{planner.first_name} {planner.last_name}</div>
                        <div className="text-sm text-gray-600">{planner.company}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 mt-1 flex items-center"><Mail className="h-3 w-3 mr-1"/> {planner.email}</div>
                        {planner.phone && <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 mt-1 flex items-center"><Phone className="h-3 w-3 mr-1"/> {formatPhoneNumber(planner.phone)}</div>}
                      </>
                    ) : (
                      <>
                        <div className="font-medium text-gray-900 dark:text-white dark:text-white">{clientEvent?.planner_first_name} {clientEvent?.planner_last_name}</div>
                        <div className="text-sm text-gray-600">{clientEvent?.planner_company}</div>
                        {clientEvent?.planner_email && <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 mt-1 flex items-center"><Mail className="h-3 w-3 mr-1"/> {clientEvent.planner_email}</div>}
                        {clientEvent?.planner_phone && <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 mt-1 flex items-center"><Phone className="h-3 w-3 mr-1"/> {formatPhoneNumber(clientEvent.planner_phone)}</div>}
                      </>
                    )}
                  </div>
                )}

                {/* Venue Contact */}
                {(venue || clientEvent?.venue_contact_name) && (
                  <div className="bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-700 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-green-600 uppercase tracking-wider">Venue Contact</span>
                    </div>
                    <div className="font-medium text-gray-900 dark:text-white dark:text-white">{clientEvent?.venue_contact_name || 'N/A'}</div>
                    {clientEvent?.venue_contact_email && <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 mt-1 flex items-center"><Mail className="h-3 w-3 mr-1"/> {clientEvent.venue_contact_email}</div>}
                    {clientEvent?.venue_contact_phone && <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 mt-1 flex items-center"><Phone className="h-3 w-3 mr-1"/> {formatPhoneNumber(clientEvent.venue_contact_phone)}</div>}
                    <div className="text-xs text-gray-400 mt-2">{venue?.name || clientEvent?.venue_name}</div>
                  </div>
                )}

                {/* Day of Coordinator */}
                {clientEvent?.day_of_contact_name && (
                  <div className="bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-700 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-orange-600 uppercase tracking-wider">Day-of Coordinator</span>
                    </div>
                    <div className="font-medium text-gray-900 dark:text-white dark:text-white">{clientEvent.day_of_contact_name}</div>
                    {clientEvent.day_of_contact_phone && <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 mt-1 flex items-center"><Phone className="h-3 w-3 mr-1"/> {formatPhoneNumber(clientEvent.day_of_contact_phone)}</div>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'quotes' && (
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white dark:text-white">Quotes</h3>
            <button 
              onClick={() => navigate(`/quotes/new?clientId=${client.id}`)}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-1" /> Create Quote
            </button>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 dark:border-gray-700">
            {quotes.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {quotes.map((quote) => {
                  const quoteDocumentId = resolveDocumentId('QT', quote, {
                    eventsMap,
                    eventSequences,
                    docSequences: quoteDocSequences,
                    fallbackEvent: clientEvent
                  });
                  const quoteTotals = calculateQuoteTotals(quote);

                  return (
                    <li key={quote.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 flex items-center justify-between group">
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => navigate(`/quotes/${quote.id}`)}
                    >
                      <div className="flex items-center justify-between mr-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-primary truncate">
                            {quoteDocumentId}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                            Total: {formatCurrency(quoteTotals.totalMXN, 'MXN')}
                          </span>
                          {quoteTotals.convertedAmount !== null && (
                            <span className="text-xs text-gray-400">
                              ≈ {formatCurrency(quoteTotals.convertedAmount, quote.currency)} ({quote.currency})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            quote.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {quote.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/quotes/${quote.id}`); }}
                        className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                      >
                        <Eye className="h-4 w-4 mr-1" /> View
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/quotes/${quote.id}/edit`); }}
                        className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-blue-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Edit className="h-4 w-4 mr-1" /> Edit
                      </button>
                      
                      {deleteConfirmation === quote.id ? (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteQuote(quote.id); }}
                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            <Check className="h-4 w-4 mr-1" /> Confirm
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmation(null); }}
                            className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                          >
                            <X className="h-4 w-4 mr-1" /> Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteQuote(quote.id); }}
                          className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Delete
                        </button>
                      )}
                    </div>
                  </li>
                  );
                })}
              </ul>
            ) : (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400 dark:text-gray-400">No quotes found.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'questionnaires' && (
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white dark:text-white">Questionnaires</h3>
            <button className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-1" /> Assign Questionnaire
            </button>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 dark:border-gray-700">
            {questionnaires.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {questionnaires.map((q) => {
                  const questionnaireId = resolveDocumentId('QST', q, {
                    eventsMap,
                    eventSequences,
                    docSequences: questionnaireDocSequences,
                    fallbackEvent: clientEvent
                  });
                  return (
                  <li key={q.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 group">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-primary truncate">
                          {questionnaireId}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">{q.title}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          q.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {q.status.toUpperCase()}
                        </span>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              if (q.template_id === '00000000-0000-0000-0000-000000000001' || q.template_id === 'system_booking_questionnaire') {
                                navigate(`/events/${q.event_id}/questionnaire`);
                              } else {
                                navigate(`/questionnaires/${q.id}`);
                              }
                            }}
                            className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                          >
                            <Eye className="h-4 w-4 mr-1" /> View
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                  );
                })}
              </ul>
            ) : (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400 dark:text-gray-400">No questionnaires found.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'contracts' && (
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white dark:text-white">Contracts</h3>
            <button className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-1" /> Generate Contract
            </button>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 dark:border-gray-700">
            {contracts.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {contracts.map((c) => {
                  const contractId = resolveDocumentId('CON', c, {
                    eventsMap,
                    eventSequences,
                    docSequences: contractDocSequences,
                    fallbackEvent: clientEvent
                  });
                  return (
                  <li key={c.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 group">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-primary truncate">
                          {contractId}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">Service Agreement</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">Updated {new Date(c.updated_at || c.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          c.status === 'signed' ? 'bg-green-100 text-green-800' : c.status === 'sent' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {c.status.toUpperCase()}
                        </span>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => navigate(`/contracts/${c.id}`)}
                            className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                          >
                            <Eye className="h-4 w-4 mr-1" /> View
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                  );
                })}
              </ul>
            ) : (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400 dark:text-gray-400">No contracts found.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white dark:text-white">Invoices</h3>
            <button className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-1" /> Create Invoice
            </button>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 dark:border-gray-700">
            {invoices.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {invoices.map((inv) => {
                  const invoiceId = resolveDocumentId('INV', inv, {
                    eventsMap,
                    eventSequences,
                    docSequences: invoiceDocSequences,
                    fallbackEvent: clientEvent
                  });
                  return (
                  <li key={inv.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 flex items-center justify-between group">
                    <div className="flex-1 cursor-pointer" onClick={() => navigate(`/invoices/${inv.id}`)}>
                      <div className="flex items-center justify-between mr-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-primary truncate">
                            {invoiceId}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">Due: {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'TBD'}</span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">Issued {new Date(inv.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(inv.total_amount, 'MXN')}</span>
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            inv.status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : inv.status === 'sent'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {inv.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/invoices/${inv.id}`); }}
                        className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                      >
                        <Eye className="h-4 w-4 mr-1" /> View
                      </button>
                    </div>
                  </li>
                  );
                })}
              </ul>
            ) : (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400 dark:text-gray-400">No invoices found.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden h-[600px] flex">
          <div className={`${selectedMessage ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 flex-col border-r border-gray-200 dark:border-gray-700`}>
             <MessageList 
               emails={messages} 
               loading={messagesLoading} 
               onSelectEmail={setSelectedMessage}
               selectedEmailId={selectedMessage?.id}
             />
          </div>
          <div className={`${selectedMessage ? 'flex' : 'hidden md:flex'} w-full md:w-2/3 flex-col`}>
             <MessageDetail email={selectedMessage} onClose={() => setSelectedMessage(null)} />
          </div>
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

      {activeTab === 'notes' && (
        <NotesTab entityId={client.id} entityType="client" />
      )}

      {activeTab === 'files' && (
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white dark:text-white">Files</h3>
            <button 
              onClick={() => setIsUploading(true)}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-primary hover:bg-primary/90"
            >
              <Upload className="h-4 w-4 mr-1" /> Upload File
            </button>
          </div>

          {isUploading && (
            <div className="px-4 py-4 bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
              <form onSubmit={handleUploadFile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">File</label>
                  <input
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                    className="mt-1 block w-full text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-secondary file:text-accent hover:file:bg-pink-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <input
                    type="text"
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    placeholder="e.g., Venue Floor Plan"
                    className="mt-1 shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUploading(false);
                      setSelectedFile(null);
                      setUploadDescription('');
                    }}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedFile}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                  >
                    Upload
                  </button>
                </div>
              </form>
            </div>
          )}

          <ul className="divide-y divide-gray-200">
            {files.length > 0 ? (
              files.map((file) => (
                <li key={file.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 flex items-center justify-between group">
                  <div className="flex items-center min-w-0 flex-1">
                    <div className="shrink-0 h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      {file.type.startsWith('image/') ? (
                        <ImageIcon className="h-6 w-6 text-gray-500 dark:text-gray-400 dark:text-gray-400" />
                      ) : (
                        <FileText className="h-6 w-6 text-gray-500 dark:text-gray-400 dark:text-gray-400" />
                      )}
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white dark:text-white truncate">{file.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">{file.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {(file.size / 1024 / 1024).toFixed(2)} MB • Uploaded by {file.uploaded_by} on {new Date(file.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="ml-4 flex items-center space-x-2">
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                      <Eye className="h-4 w-4 mr-1" /> View
                    </a>
                    <a
                      href={file.url}
                      download={file.name}
                      className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-blue-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Download className="h-4 w-4 mr-1" /> Download
                    </a>
                    
                    {deleteConfirmation === file.id ? (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleDeleteFile(file.id)}
                          className="inline-flex items-center px-2.5 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          <Check className="h-4 w-4 mr-1" /> Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirmation(null)}
                          className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                        >
                          <X className="h-4 w-4 mr-1" /> Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmation(file.id)}
                        className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                      </button>
                    )}
                  </div>
                </li>
              ))
            ) : (
              <li className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 dark:text-gray-400">
                No files uploaded yet.
              </li>
            )}
          </ul>
        </div>
      )}

      {activeTab === 'portal' && (
        <PortalAdminTab client={client} onUpdate={() => loadClient(client.id)} />
      )}

      {activeTab !== 'overview' && activeTab !== 'notes' && activeTab !== 'quotes' && activeTab !== 'questionnaires' && activeTab !== 'contracts' && activeTab !== 'invoices' && activeTab !== 'tasks' && activeTab !== 'files' && activeTab !== 'portal' && (
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg p-12 text-center">
          {activeTab === 'messages' && <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />}
          
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white dark:text-white">
            {tabs.find(t => t.id === activeTab)?.label}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">This feature is coming soon.</p>
        </div>
      )}
    </div>
  );
}

function calculateQuoteTotals(quote: Quote): { totalMXN: number; convertedAmount: number | null } {
  const subtotal = quote.items?.reduce((sum, item) => sum + (item.total ?? (item.quantity * item.unit_price)), 0) || 0;
  const taxNet = quote.taxes?.reduce((sum, tax) => sum + (tax.is_retention ? -tax.amount : tax.amount), 0) || 0;
  const totalMXN = subtotal + taxNet;
  const safeRate = quote.currency === 'MXN'
    ? 1
    : (quote.exchange_rate || currencyService.getRate(quote.currency));
  const convertedAmount = quote.currency !== 'MXN' && safeRate > 0
    ? totalMXN / safeRate
    : null;
  return { totalMXN, convertedAmount };
}