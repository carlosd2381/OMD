import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Globe, Mail, Phone, Briefcase, MessageSquare, Layout, Calendar, MapPin, Users, Cake, Plus, Eye, Trash2, X, Check, Upload, Download, FileText, Image as ImageIcon } from 'lucide-react';
import { clientService } from '../../services/clientService';
import { eventService } from '../../services/eventService';
import { venueService } from '../../services/venueService';
import { quoteService } from '../../services/quoteService';
import { questionnaireService } from '../../services/questionnaireService';
import { contractService } from '../../services/contractService';
import { invoiceService } from '../../services/invoiceService';
import { taskService } from '../../services/taskService';
import { fileService } from '../../services/fileService';
import { settingsService } from '../../services/settingsService';
import type { Client } from '../../types/client';
import type { Event } from '../../types/event';
import type { Quote } from '../../types/quote';
import type { Questionnaire } from '../../types/questionnaire';
import type { Contract } from '../../types/contract';
import type { Invoice } from '../../types/invoice';
import type { Task, TaskTemplate } from '../../types/task';
import type { ClientFile } from '../../types/clientFile';
import NotesTab from '../../components/NotesTab';
import PortalAdminTab from './PortalAdminTab';
import toast from 'react-hot-toast';

type Tab = 'overview' | 'quotes' | 'questionnaires' | 'invoices' | 'contracts' | 'messages' | 'tasks' | 'notes' | 'files' | 'portal';

export default function ClientDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [clientEvent, setClientEvent] = useState<Event | null>(null);
  const [venueName, setVenueName] = useState<string>('');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [files, setFiles] = useState<ClientFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  
  // File Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDescription, setUploadDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [quotePrefix, setQuotePrefix] = useState('QTE');

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
        const [events, clientQuotes, clientQuestionnaires, clientContracts, clientInvoices, clientTasks, templates, clientFiles, financialSettings] = await Promise.all([
          eventService.getEvents(),
          quoteService.getQuotesByClient(clientId),
          questionnaireService.getQuestionnairesByClient(clientId),
          contractService.getContractsByClient(clientId),
          invoiceService.getInvoicesByClient(clientId),
          taskService.getTasksByClient(clientId),
          taskService.getTemplates(),
          fileService.getFilesByClient(clientId),
          settingsService.getFinancialSettings()
        ]);

        setQuotes(clientQuotes);
        setQuestionnaires(clientQuestionnaires);
        setContracts(clientContracts);
        setInvoices(clientInvoices);
        setTasks(clientTasks);
        setTaskTemplates(templates);
        setFiles(clientFiles);

        if (financialSettings?.quote_sequence_prefix) {
          setQuotePrefix(financialSettings.quote_sequence_prefix);
        }

        const event = events.find(e => e.client_id === clientId);
        if (event) {
          setClientEvent(event);
          if (event.venue_id) {
            const venue = await venueService.getVenue(event.venue_id);
            if (venue) {
              setVenueName(venue.name);
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
      });
      setTasks([...tasks, newTask]);
      setNewTaskTitle('');
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
          <Link to="/clients" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{client.first_name} {client.last_name}</h1>
        </div>
        <div className="flex space-x-3">
          <Link
            to={`/portal/${client.id}`}
            target="_blank"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
          >
            <Layout className="h-5 w-5 mr-2 text-gray-500" />
            View Portal
          </Link>
          <Link
            to={`/clients/${client.id}/edit`}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
          >
            <Edit className="h-5 w-5 mr-2" />
            Edit
          </Link>
        </div>
      </div>

      {clientEvent && (
        <div className="mt-4 flex items-center space-x-6 text-sm text-gray-500 border border-pink-200 bg-pink-50 rounded-md p-2">
          <div className="flex items-center">
            <Calendar className="mr-1.5 h-4 w-4 text-pink-500" />
            {clientEvent.date}
          </div>
          <div className="flex items-center">
            <MapPin className="mr-1.5 h-4 w-4 text-pink-500" />
            {venueName || clientEvent.venue_name || 'Venue TBD'}
          </div>
          <div className="flex items-center">
            <Users className="mr-1.5 h-4 w-4 text-pink-500" />
            {clientEvent.guest_count ? `${clientEvent.guest_count} Guests` : 'Guest Count TBD'}
          </div>
          <div className="flex items-center">
            <Cake className="mr-1.5 h-4 w-4 text-pink-500" />
            {clientEvent.services && clientEvent.services.length > 0 
              ? clientEvent.services.join(', ') 
              : 'Services TBD'}
          </div>
        </div>
      )}

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
            <h3 className="text-lg leading-6 font-medium text-gray-900">Client Information</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Personal details and contact information.</p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{client.first_name} {client.last_name}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Role</dt>
                <dd className="mt-1 text-sm text-gray-900">{client.role || 'N/A'}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900 flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-gray-400" />
                  <a href={`mailto:${client.email}`} className="text-pink-600 hover:text-pink-500">{client.email}</a>
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="mt-1 text-sm text-gray-900 flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-gray-400" />
                  {client.phone ? (
                    <a href={`tel:${client.phone}`} className="text-gray-900 hover:text-gray-700">{client.phone}</a>
                  ) : (
                    <span className="text-gray-400 italic">No phone provided</span>
                  )}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Company</dt>
                <dd className="mt-1 text-sm text-gray-900 flex items-center">
                  <Briefcase className="h-4 w-4 mr-2 text-gray-400" />
                  {client.company_name || <span className="text-gray-400 italic">N/A</span>}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Type</dt>
                <dd className="mt-1 text-sm text-gray-900">{client.type || 'N/A'}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Lead Source</dt>
                <dd className="mt-1 text-sm text-gray-900">{client.lead_source || 'N/A'}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Address</dt>
                <dd className="mt-1 text-sm text-gray-900">
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
                <dt className="text-sm font-medium text-gray-500">Social Media</dt>
                <dd className="mt-1 text-sm text-gray-900 flex space-x-4">
                  {client.instagram && (
                    <a href={client.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center text-pink-600 hover:text-pink-500">
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
                  <dt className="text-sm font-medium text-gray-500">Notes</dt>
                  <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{client.notes}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      )}

      {activeTab === 'quotes' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Quotes</h3>
            <button 
              onClick={() => navigate(`/quotes/new?clientId=${client.id}`)}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700"
            >
              <Plus className="h-4 w-4 mr-1" /> Create Quote
            </button>
          </div>
          <div className="border-t border-gray-200">
            {quotes.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {quotes.map((quote) => (
                  <li key={quote.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 flex items-center justify-between group">
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => navigate(`/quotes/${quote.id}`)}
                    >
                      <div className="flex items-center justify-between mr-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-pink-600 truncate">
                            {quotePrefix}-{new Date(quote.created_at).getFullYear().toString().substr(-2)}{String(new Date(quote.created_at).getMonth() + 1).padStart(2, '0')}{String(new Date(quote.created_at).getDate()).padStart(2, '0')}-001-{String(quotes.indexOf(quote) + 1).padStart(3, '0')}
                          </span>
                          <span className="text-sm text-gray-500">
                            Total: ${quote.total_amount.toLocaleString()} {quote.currency && quote.currency !== 'MXN' && `(${quote.currency})`}
                          </span>
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
                    
                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/quotes/${quote.id}`); }}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="View"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/quotes/${quote.id}/edit`); }}
                        className="p-1 text-blue-400 hover:text-blue-600"
                        title="Edit"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      
                      {deleteConfirmation === quote.id ? (
                        <div className="flex items-center bg-red-50 rounded-md p-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteQuote(quote.id); }}
                            className="p-1 text-red-600 hover:text-red-800"
                            title="Confirm Delete"
                          >
                            <Check className="h-5 w-5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmation(null); }}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            title="Cancel"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteQuote(quote.id); }}
                          className="p-1 text-red-400 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-6 text-center text-gray-500">No quotes found.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'questionnaires' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Questionnaires</h3>
            <button className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700">
              <Plus className="h-4 w-4 mr-1" /> Assign Questionnaire
            </button>
          </div>
          <div className="border-t border-gray-200">
            {questionnaires.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {questionnaires.map((q) => (
                  <li key={q.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 group">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{q.title}</span>
                      <div className="flex items-center space-x-4">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          q.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {q.status.toUpperCase()}
                        </span>
                        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              if (q.template_id === '00000000-0000-0000-0000-000000000001' || q.template_id === 'system_booking_questionnaire') {
                                navigate(`/events/${q.event_id}/questionnaire`);
                              } else {
                                navigate(`/questionnaires/${q.id}`);
                              }
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            title="View"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-6 text-center text-gray-500">No questionnaires found.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'contracts' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Contracts</h3>
            <button className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700">
              <Plus className="h-4 w-4 mr-1" /> Generate Contract
            </button>
          </div>
          <div className="border-t border-gray-200">
            {contracts.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {contracts.map((c) => (
                  <li key={c.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 group">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Service Agreement</span>
                      <div className="flex items-center space-x-4">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          c.status === 'signed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {c.status.toUpperCase()}
                        </span>
                        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => navigate(`/contracts/${c.id}`)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            title="View"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-6 text-center text-gray-500">No contracts found.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Invoices</h3>
            <button className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700">
              <Plus className="h-4 w-4 mr-1" /> Create Invoice
            </button>
          </div>
          <div className="border-t border-gray-200">
            {invoices.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {invoices.map((inv) => (
                  <li key={inv.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 group">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">Invoice #{inv.invoice_number}</span>
                        <span className="text-sm text-gray-500">Due: {inv.due_date}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm font-bold text-gray-900">${inv.total_amount}</span>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          inv.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {inv.status.toUpperCase()}
                        </span>
                        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => navigate(`/invoices/${inv.id}`)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            title="View"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-6 text-center text-gray-500">No invoices found.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Tasks</h3>
            <div className="flex space-x-2">
              <select 
                onChange={(e) => {
                  if (e.target.value) {
                    handleImportTemplate(e.target.value);
                    e.target.value = ''; // Reset
                  }
                }}
                className="block w-full pl-3 pr-10 py-1.5 text-base border-gray-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md"
              >
                <option value="">Import Template...</option>
                {taskTemplates.map(t => (
                  <option key={t.id} value={t.id}>{t.title} ({t.category})</option>
                ))}
              </select>
              <button 
                onClick={() => setIsAddingTask(true)}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700"
              >
                <Plus className="h-4 w-4 mr-1" /> Add Task
              </button>
            </div>
          </div>
          
          {isAddingTask && (
            <div className="px-4 py-4 bg-gray-50 border-b border-gray-200">
              <form onSubmit={handleAddTask} className="flex gap-2">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Enter task title..."
                  className="flex-1 shadow-sm focus:ring-pink-500 focus:border-pink-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  autoFocus
                />
                <button
                  type="submit"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingTask(false)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                >
                  Cancel
                </button>
              </form>
            </div>
          )}

          <ul className="divide-y divide-gray-200">
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <li key={task.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 flex items-center justify-between group">
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
                      <p className={`text-sm font-medium ${task.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                        {task.title}
                      </p>
                      {task.status === 'completed' && task.completed_at && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Completed by {task.completed_by} on {new Date(task.completed_at).toLocaleDateString()} at {new Date(task.completed_at).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </li>
              ))
            ) : (
              <li className="px-4 py-8 text-center text-gray-500">
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
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Files</h3>
            <button 
              onClick={() => setIsUploading(true)}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700"
            >
              <Upload className="h-4 w-4 mr-1" /> Upload File
            </button>
          </div>

          {isUploading && (
            <div className="px-4 py-4 bg-gray-50 border-b border-gray-200">
              <form onSubmit={handleUploadFile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">File</label>
                  <input
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100"
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
                    className="mt-1 shadow-sm focus:ring-pink-500 focus:border-pink-500 block w-full sm:text-sm border-gray-300 rounded-md"
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
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedFile}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50"
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
                <li key={file.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 flex items-center justify-between group">
                  <div className="flex items-center min-w-0 flex-1">
                    <div className="shrink-0 h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      {file.type.startsWith('image/') ? (
                        <ImageIcon className="h-6 w-6 text-gray-500" />
                      ) : (
                        <FileText className="h-6 w-6 text-gray-500" />
                      )}
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                      <p className="text-sm text-gray-500">{file.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {(file.size / 1024 / 1024).toFixed(2)} MB • Uploaded by {file.uploaded_by} on {new Date(file.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="ml-4 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="View"
                    >
                      <Eye className="h-5 w-5" />
                    </a>
                    <a
                      href={file.url}
                      download={file.name}
                      className="p-1 text-blue-400 hover:text-blue-600"
                      title="Download"
                    >
                      <Download className="h-5 w-5" />
                    </a>
                    
                    {deleteConfirmation === file.id ? (
                      <div className="flex items-center bg-red-50 rounded-md p-1">
                        <button
                          onClick={() => handleDeleteFile(file.id)}
                          className="p-1 text-red-600 hover:text-red-800"
                          title="Confirm Delete"
                        >
                          <Check className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmation(null)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Cancel"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmation(file.id)}
                        className="p-1 text-red-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </li>
              ))
            ) : (
              <li className="px-4 py-8 text-center text-gray-500">
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
        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-12 text-center">
          {activeTab === 'messages' && <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />}
          
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {tabs.find(t => t.id === activeTab)?.label}
          </h3>
          <p className="mt-1 text-sm text-gray-500">This feature is coming soon.</p>
        </div>
      )}
    </div>
  );
}