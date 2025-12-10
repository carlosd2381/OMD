import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Copy, Code, Settings, GripVertical, Check, ExternalLink, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

type FieldType = 'text' | 'email' | 'phone' | 'textarea' | 'date' | 'select' | 'checkbox';

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
  const [selectedFormId, setSelectedFormId] = useState<string>('1');

  // Mock Data
  const [forms, setForms] = useState<ContactForm[]>([
    {
      id: '1',
      name: 'General Inquiry',
      fields: [
        { id: 'f1', type: 'text', label: 'Full Name', placeholder: 'Jane Doe', required: true },
        { id: 'f2', type: 'email', label: 'Email Address', placeholder: 'jane@example.com', required: true },
        { id: 'f3', type: 'phone', label: 'Phone Number', placeholder: '+52...', required: false },
        { id: 'f4', type: 'date', label: 'Event Date', required: true },
        { id: 'f5', type: 'select', label: 'Event Type', required: true, options: ['Wedding', 'Corporate', 'Birthday', 'Other'] },
        { id: 'f6', type: 'textarea', label: 'Message', placeholder: 'Tell us about your event...', required: true },
      ],
      settings: {
        successAction: 'message',
        successMessage: 'Thank you for your inquiry! We will be in touch shortly.',
        redirectUrl: '',
        notifyEmail: 'info@omd-events.com',
        spamProtection: true,
        sourceTracking: true,
      }
    }
  ]);

  const currentForm = forms.find(f => f.id === selectedFormId) || forms[0];

  const handleSave = () => {
    toast.success('Form saved successfully');
  };

  const addField = (type: FieldType) => {
    const newField: FormField = {
      id: Date.now().toString(),
      type,
      label: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      required: false,
      options: type === 'select' ? ['Option 1', 'Option 2'] : undefined
    };
    
    updateFormFields([...currentForm.fields, newField]);
  };

  const removeField = (fieldId: string) => {
    updateFormFields(currentForm.fields.filter(f => f.id !== fieldId));
  };

  const updateFormFields = (newFields: FormField[]) => {
    setForms(forms.map(f => f.id === selectedFormId ? { ...f, fields: newFields } : f));
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    const newFields = currentForm.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f);
    updateFormFields(newFields);
  };

  const updateSettings = (updates: Partial<ContactForm['settings']>) => {
    setForms(forms.map(f => f.id === selectedFormId ? { ...f, settings: { ...f.settings, ...updates } } : f));
  };

  const copyEmbedCode = () => {
    const code = `<script src="https://api.omd-crm.com/forms/embed/${currentForm.id}.js"></script>`;
    navigator.clipboard.writeText(code);
    toast.success('Embed code copied to clipboard');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/settings')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-6 w-6 text-gray-500" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Contact Forms</h2>
            <p className="text-sm text-gray-500">Create and manage lead capture forms.</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <select 
            value={selectedFormId}
            onChange={(e) => setSelectedFormId(e.target.value)}
            className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md"
          >
            {forms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <button
            onClick={handleSave}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700"
          >
            Save Changes
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('editor')}
            className={`${
              activeTab === 'editor'
                ? 'border-pink-500 text-pink-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Eye className="h-4 w-4 mr-2" />
            Form Builder
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`${
              activeTab === 'settings'
                ? 'border-pink-500 text-pink-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Settings className="h-4 w-4 mr-2" />
            Form Settings
          </button>
          <button
            onClick={() => setActiveTab('embed')}
            className={`${
              activeTab === 'embed'
                ? 'border-pink-500 text-pink-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Code className="h-4 w-4 mr-2" />
            Embed Code
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white shadow sm:rounded-lg p-6 min-h-[500px]">
        
        {/* Editor Tab */}
        {activeTab === 'editor' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Field List (Left) */}
            <div className="lg:col-span-2 space-y-4">
              {currentForm.fields.map((field, index) => (
                <div key={field.id} className="group relative bg-white border border-gray-200 rounded-lg p-4 hover:border-pink-300 transition-colors">
                  <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-2">
                    <button onClick={() => removeField(field.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="mt-2 cursor-move text-gray-400">
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
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500">Placeholder</label>
                          <input
                            type="text"
                            value={field.placeholder || ''}
                            onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                            disabled={['date', 'select', 'checkbox'].includes(field.type)}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm disabled:bg-gray-50"
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
                            className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                          />
                          <label htmlFor={`req-${field.id}`} className="ml-2 block text-sm text-gray-900">
                            Required
                          </label>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {field.type}
                        </span>
                      </div>

                      {field.type === 'select' && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Options (comma separated)</label>
                          <input
                            type="text"
                            value={field.options?.join(', ')}
                            onChange={(e) => updateField(field.id, { options: e.target.value.split(',').map(s => s.trim()) })}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {currentForm.fields.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500">No fields added yet. Click a button on the right to add fields.</p>
                </div>
              )}
            </div>

            {/* Toolbox (Right) */}
            <div className="lg:col-span-1">
              <div className="sticky top-6">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Add Fields</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => addField('text')} className="flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    Text
                  </button>
                  <button onClick={() => addField('email')} className="flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    Email
                  </button>
                  <button onClick={() => addField('phone')} className="flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    Phone
                  </button>
                  <button onClick={() => addField('date')} className="flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    Date
                  </button>
                  <button onClick={() => addField('select')} className="flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    Dropdown
                  </button>
                  <button onClick={() => addField('textarea')} className="flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    Text Area
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-8">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Submission Actions</h3>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">On Success</label>
                  <select
                    value={currentForm.settings.successAction}
                    onChange={(e) => updateSettings({ successAction: e.target.value as any })}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md"
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
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
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
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-8">
              <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">Send Notifications To</label>
                <input
                  type="email"
                  value={currentForm.settings.notifyEmail}
                  onChange={(e) => updateSettings({ notifyEmail: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                />
                <p className="mt-1 text-sm text-gray-500">Separate multiple emails with commas.</p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-8">
              <h3 className="text-lg font-medium text-gray-900">Security & Tracking</h3>
              <div className="mt-4 space-y-4">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="spam"
                      type="checkbox"
                      checked={currentForm.settings.spamProtection}
                      onChange={(e) => updateSettings({ spamProtection: e.target.checked })}
                      className="focus:ring-pink-500 h-4 w-4 text-pink-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="spam" className="font-medium text-gray-700">Enable Spam Protection</label>
                    <p className="text-gray-500">Adds reCAPTCHA v3 to your form to prevent bot submissions.</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="tracking"
                      type="checkbox"
                      checked={currentForm.settings.sourceTracking}
                      onChange={(e) => updateSettings({ sourceTracking: e.target.checked })}
                      className="focus:ring-pink-500 h-4 w-4 text-pink-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="tracking" className="font-medium text-gray-700">Enable Source Tracking</label>
                    <p className="text-gray-500">Automatically captures UTM parameters and referrer URL.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Embed Tab */}
        {activeTab === 'embed' && (
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium text-gray-900">JavaScript Embed Code</h4>
                <button
                  onClick={copyEmbedCode}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </button>
              </div>
              <code className="block bg-gray-900 text-gray-100 p-4 rounded text-sm font-mono overflow-x-auto">
                {`<script src="https://api.omd-crm.com/forms/embed/${currentForm.id}.js"></script>`}
              </code>
              <p className="mt-2 text-sm text-gray-500">
                Paste this code into your website's HTML where you want the form to appear. It works with WordPress, Squarespace, Wix, and custom sites.
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
