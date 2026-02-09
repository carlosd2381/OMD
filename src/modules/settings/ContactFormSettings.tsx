import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Copy, Code, Settings, GripVertical, ExternalLink, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { settingsService } from '../../services/settingsService';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

type FieldType = 'text' | 'email' | 'phone' | 'textarea' | 'date' | 'select' | 'multiselect' | 'checkbox';

interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // For select inputs
}

interface ContactForm {
  id: string;
  name: string;
  fields: FormField[];
  settings: {
    successAction: 'message' | 'redirect';
    successMessage: string;
    redirectUrl: string;
    notifyEmail: string;
    spamProtection: boolean;
    sourceTracking: boolean;
  };
}

export default function ContactFormSettings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'editor' | 'settings' | 'embed'>('editor');
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [forms, setForms] = useState<ContactForm[]>([]);

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    setLoading(true);
    try {
      const data = await settingsService.getContactForms();
      const mapped: ContactForm[] = data.map(item => ({
        id: item.id,
        name: item.name,
        fields: (item.fields as any[]) || [],
        settings: (item.settings as any) || {
            successAction: 'message',
            successMessage: 'Thank you for your inquiry!',
            redirectUrl: '',
            notifyEmail: '',
            spamProtection: true,
            sourceTracking: true
        }
      }));
      
      if (mapped.length === 0) {
          // Create a default form in memory if none exist
          const defaultForm: ContactForm = {
              id: 'new_default',
              name: 'General Inquiry',
              fields: [
                { id: 'f1', type: 'text', label: 'Full Name', placeholder: 'Jane Doe', required: true },
                { id: 'f2', type: 'email', label: 'Email Address', placeholder: 'jane@example.com', required: true },
                { id: 'f6', type: 'textarea', label: 'Message', placeholder: 'Tell us about your event...', required: true },
              ],
              settings: {
                successAction: 'message',
                successMessage: 'Thank you for your inquiry! We will be in touch shortly.',
                redirectUrl: '',
                notifyEmail: '',
                spamProtection: true,
                sourceTracking: true,
              }
          };
          setForms([defaultForm]);
          setSelectedFormId(defaultForm.id);
      } else {
          setForms(mapped);
          if (!selectedFormId || !mapped.find(f => f.id === selectedFormId)) {
              setSelectedFormId(mapped[0].id);
          }
      }
    } catch (error) {
      console.error('Error loading contact forms:', error);
      toast.error('Failed to load contact forms');
    } finally {
      setLoading(false);
    }
  };

  const currentForm = forms.find(f => f.id === selectedFormId) || forms[0];

  const handleSave = async () => {
    if (!currentForm) return;
    setLoading(true);
    try {
        const payload = {
            name: currentForm.name,
            fields: currentForm.fields,
            settings: currentForm.settings
        };

        if (currentForm.id.startsWith('new_')) {
            const newForm = await settingsService.createContactForm(payload as any);
            toast.success('Form created successfully');
            // Reload to get the real ID
            await loadForms();
            setSelectedFormId(newForm.id);
        } else {
            await settingsService.updateContactForm(currentForm.id, payload as any);
            toast.success('Form saved successfully');
        }
    } catch (error) {
        console.error('Error saving form:', error);
        toast.error('Failed to save form');
    } finally {
        setLoading(false);
    }
  };

  const handleCreateNew = () => {
      const newForm: ContactForm = {
          id: 'new_' + Date.now(),
          name: 'New Form',
          fields: [],
          settings: {
            successAction: 'message',
            successMessage: 'Thank you!',
            redirectUrl: '',
            notifyEmail: '',
            spamProtection: true,
            sourceTracking: true,
          }
      };
      setForms([...forms, newForm]);
      setSelectedFormId(newForm.id);
      setActiveTab('settings'); // Go to settings to name it
  };

  const handleDelete = async () => {
      if (!currentForm) return;
      if (confirm(`Are you sure you want to delete "${currentForm.name}"?`)) {
          try {
              if (!currentForm.id.startsWith('new_')) {
                  await settingsService.deleteContactForm(currentForm.id);
              }
              const remaining = forms.filter(f => f.id !== currentForm.id);
              setForms(remaining);
              if (remaining.length > 0) {
                  setSelectedFormId(remaining[0].id);
              } else {
                  // If no forms left, reload to trigger default creation or empty state
                  loadForms();
              }
              toast.success('Form deleted');
          } catch (error) {
              console.error('Error deleting form:', error);
              toast.error('Failed to delete form');
          }
      }
  };

  const addField = (type: FieldType) => {
    if (!currentForm) return;
    const newField: FormField = {
      id: Date.now().toString(),
      type,
      label: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      required: false,
      options: ['select', 'multiselect'].includes(type) ? ['Option 1', 'Option 2'] : undefined
    };
    
    updateFormFields([...currentForm.fields, newField]);
  };

  const removeField = (fieldId: string) => {
    if (!currentForm) return;
    updateFormFields(currentForm.fields.filter(f => f.id !== fieldId));
  };

  const updateFormFields = (newFields: FormField[]) => {
    setForms(forms.map(f => f.id === selectedFormId ? { ...f, fields: newFields } : f));
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    if (!currentForm) return;
    const newFields = currentForm.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f);
    updateFormFields(newFields);
  };

  const onDragEnd = (result: any) => {
    if (!result.destination || !currentForm) return;

    const items = Array.from(currentForm.fields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    updateFormFields(items);
  };

  const updateSettings = (updates: Partial<ContactForm['settings']>) => {
    setForms(forms.map(f => f.id === selectedFormId ? { ...f, settings: { ...f.settings, ...updates } } : f));
  };

  const copyEmbedCode = () => {
    if (!currentForm) return;
    const baseUrl = window.location.origin;
    const code = `<iframe src="${baseUrl}/forms/${currentForm.id}" width="100%" height="600px" frameborder="0"></iframe>`;
    navigator.clipboard.writeText(code);
    toast.success('Embed code copied to clipboard');
  };

  const copyDirectLink = () => {
    if (!currentForm) return;
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/forms/${currentForm.id}`;
    navigator.clipboard.writeText(link);
    toast.success('Direct link copied to clipboard');
  };

  if (!currentForm && !loading) {
      return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/settings')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-6 w-6 text-gray-500 dark:text-gray-400 dark:text-gray-400" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">Contact Forms</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">Create and manage lead capture forms.</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <select 
            value={selectedFormId}
            onChange={(e) => setSelectedFormId(e.target.value)}
            className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
          >
            {forms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <button
            onClick={handleCreateNew}
            className="p-2 text-gray-400 hover:text-gray-600"
            title="Create New Form"
          >
              <Plus className="h-5 w-5" />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 text-red-400 hover:text-red-600"
            title="Delete Form"
          >
              <Trash2 className="h-5 w-5" />
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('editor')}
            className={`${
              activeTab === 'editor'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Eye className="h-4 w-4 mr-2" />
            Form Builder
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`${
              activeTab === 'settings'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Settings className="h-4 w-4 mr-2" />
            Form Settings
          </button>
          <button
            onClick={() => setActiveTab('embed')}
            className={`${
              activeTab === 'embed'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Code className="h-4 w-4 mr-2" />
            Embed Code
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow sm:rounded-lg p-6 min-h-[500px]">
        
        {/* Editor Tab */}
        {activeTab === 'editor' && currentForm && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Field List (Left) */}
            <div className="lg:col-span-2 space-y-4">
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="form-fields">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                      {currentForm.fields.map((field, index) => (
                        <Draggable key={field.id} draggableId={field.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-pink-300 transition-colors"
                            >
                              <div className="absolute right-4 top-4 flex items-center space-x-2">
                                <button onClick={() => removeField(field.id)} className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-white dark:bg-gray-800 border border-gray-300 rounded hover:bg-red-50">
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Delete
                                </button>
                              </div>
                              
                              <div className="flex items-start space-x-3">
                                <div {...provided.dragHandleProps} className="mt-2 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing">
                                  <GripVertical className="h-5 w-5" />
                                </div>
                                <div className="flex-1 space-y-3">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-500">Label</label>
                                      <input
                                        type="text"
                                        value={field.label}
                                        onChange={(e) => updateField(field.id, { label: e.target.value })}
                                        className="mt-1 block w-full border-gray-300 border rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm px-3 py-2"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-500">Placeholder</label>
                                      <input
                                        type="text"
                                        value={field.placeholder || ''}
                                        onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                                        disabled={['date', 'select', 'multiselect', 'checkbox'].includes(field.type)}
                                        className="mt-1 block w-full border-gray-300 border rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm disabled:bg-gray-50 dark:bg-gray-700 px-3 py-2"
                                      />
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center space-x-4">
                                    <div className="flex items-center">
                                      <input
                                        id={`req-${field.id}`}
                                        type="checkbox"
                                        checked={field.required}
                                        onChange={(e) => updateField(field.id, { required: e.target.checked })}
                                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                                      />
                                      <label htmlFor={`req-${field.id}`} className="ml-2 block text-sm text-gray-900 dark:text-white">
                                        Required
                                      </label>
                                    </div>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                      {field.type}
                                    </span>
                                  </div>

                                  {['select', 'multiselect'].includes(field.type) && (
                                    <div>
                                      <label className="block text-xs font-medium text-gray-500 mb-1">Options (comma separated)</label>
                                      <input
                                        type="text"
                                        value={field.options?.join(', ')}
                                        onChange={(e) => updateField(field.id, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                        className="block w-full border-gray-300 border rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm px-3 py-2"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
              
              {currentForm.fields.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500">No fields added yet. Click a button on the right to add fields.</p>
                </div>
              )}
            </div>

            {/* Toolbox (Right) */}
            <div className="lg:col-span-1">
              <div className="sticky top-6">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Add Fields</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => addField('text')} className="flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700">
                    Text
                  </button>
                  <button onClick={() => addField('email')} className="flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700">
                    Email
                  </button>
                  <button onClick={() => addField('phone')} className="flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700">
                    Phone
                  </button>
                  <button onClick={() => addField('date')} className="flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700">
                    Date
                  </button>
                  <button onClick={() => addField('select')} className="flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700">
                    Dropdown
                  </button>
                  <button onClick={() => addField('multiselect')} className="flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700">
                    Multi-select
                  </button>
                  <button onClick={() => addField('textarea')} className="flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700">
                    Text Area
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && currentForm && (
          <div className="max-w-2xl space-y-8">
            <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white">Form Details</h3>
                <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700">Form Name</label>
                    <input
                        type="text"
                        value={currentForm.name}
                        onChange={(e) => setForms(forms.map(f => f.id === selectedFormId ? { ...f, name: e.target.value } : f))}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                    />
                </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white">Submission Actions</h3>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">On Success</label>
                  <select
                    value={currentForm.settings.successAction}
                    onChange={(e) => updateSettings({ successAction: e.target.value as any })}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                  >
                    <option value="message">Show Message</option>
                    <option value="redirect">Redirect to URL</option>
                  </select>
                </div>

                {currentForm.settings.successAction === 'message' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Success Message</label>
                    <textarea
                      rows={3}
                      value={currentForm.settings.successMessage}
                      onChange={(e) => updateSettings({ successMessage: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Redirect URL</label>
                    <input
                      type="url"
                      value={currentForm.settings.redirectUrl}
                      onChange={(e) => updateSettings({ redirectUrl: e.target.value })}
                      placeholder="https://yourwebsite.com/thank-you"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 dark:border-gray-700 pt-8">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white">Notifications</h3>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">Send Notifications To</label>
                <input
                  type="email"
                  value={currentForm.settings.notifyEmail}
                  onChange={(e) => updateSettings({ notifyEmail: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">Separate multiple emails with commas.</p>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 dark:border-gray-700 pt-8">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white">Security & Tracking</h3>
              <div className="mt-4 space-y-4">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="spam"
                      type="checkbox"
                      checked={currentForm.settings.spamProtection}
                      onChange={(e) => updateSettings({ spamProtection: e.target.checked })}
                      className="focus:ring-primary h-4 w-4 text-primary border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="spam" className="font-medium text-gray-700">Enable Spam Protection</label>
                    <p className="text-gray-500 dark:text-gray-400 dark:text-gray-400">Adds reCAPTCHA v3 to your form to prevent bot submissions.</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="tracking"
                      type="checkbox"
                      checked={currentForm.settings.sourceTracking}
                      onChange={(e) => updateSettings({ sourceTracking: e.target.checked })}
                      className="focus:ring-primary h-4 w-4 text-primary border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="tracking" className="font-medium text-gray-700">Enable Source Tracking</label>
                    <p className="text-gray-500 dark:text-gray-400 dark:text-gray-400">Automatically captures UTM parameters and referrer URL.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Embed Tab */}
        {activeTab === 'embed' && currentForm && (
          <div className="space-y-6">
            <div className="bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 p-4 rounded-md border border-gray-200 dark:border-gray-700 dark:border-gray-700">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white dark:text-white">Website Embed Code (Iframe)</h4>
                <button
                  onClick={copyEmbedCode}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </button>
              </div>
              <code className="block bg-gray-900 text-gray-100 p-4 rounded text-sm font-mono overflow-x-auto">
                {`<iframe src="${window.location.origin}/forms/${currentForm.id}" width="100%" height="800px" frameborder="0"></iframe>`}
              </code>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                Paste this code into your website's HTML where you want the form to appear. It works with WordPress, Squarespace, Wix, and custom sites.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 p-4 rounded-md border border-gray-200 dark:border-gray-700 dark:border-gray-700">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white dark:text-white">Direct URL</h4>
                <div className="flex space-x-2">
                  <button
                    onClick={() => window.open(`/forms/${currentForm.id}`, '_blank')}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Preview
                  </button>
                  <button
                    onClick={copyDirectLink}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy Link
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-900 dark:text-white font-mono bg-white dark:bg-gray-800 p-2 border rounded">
                {`${window.location.origin}/forms/${currentForm.id}`}
              </p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                You can link directly to this form from your social media bio or email signature.
              </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-md">
              <div className="flex">
                <div className="shrink-0">
                  <ExternalLink className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Integration Guide</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      Need help installing this on your specific platform? Check out our integration guides for:
                    </p>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      <li>WordPress / Elementor</li>
                      <li>Squarespace</li>
                      <li>Wix</li>
                      <li>Webflow</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
