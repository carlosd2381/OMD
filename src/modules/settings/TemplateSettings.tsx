import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Plus, Search, Edit2, Trash2, Copy, 
  FileText, Mail, FileCheck, FileSpreadsheet, HelpCircle,
  Sparkles, Save, X, ChevronDown, Image as ImageIcon, Link as LinkIcon,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, GripVertical
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import toast from 'react-hot-toast';

type TemplateType = 'email' | 'contract' | 'invoice' | 'quote' | 'questionnaire';

interface Template {
  id: string;
  name: string;
  type: TemplateType;
  subject?: string; // For emails
  content: string; // HTML for RTE, JSON string for Questionnaire
  lastModified: string;
}

type QuestionType = 
  // Layout
  | 'headline' | 'section' | 'paragraph'
  // Basic
  | 'text' | 'textarea' | 'checkbox' | 'radio' | 'select' | 'segmented'
  // Advanced
  | 'name' | 'email' | 'phone' | 'address' | 'number' | 'money' 
  | 'date' | 'time' | 'duration' | 'rating' | 'likert' | 'upload' | 'privacy';

interface Question {
  id: string;
  type: QuestionType;
  label: string; // Used for headline text, paragraph content, or question label
  required?: boolean;
  options?: string[]; // For select, radio, checkbox, segmented, likert columns
  rows?: string[]; // For likert rows
  placeholder?: string;
  linkedToken?: string;
}

const INITIAL_TEMPLATES: Template[] = [
  {
    id: '1',
    name: 'Welcome Email',
    type: 'email',
    subject: 'Welcome to OMD Events!',
    content: '<p>Hi {{client_first_name}},</p><p>Welcome to OMD Events! We are thrilled to have you.</p>',
    lastModified: '2024-03-10'
  },
  {
    id: '2',
    name: 'Standard Wedding Contract',
    type: 'contract',
    content: '<h1>Wedding Services Agreement</h1><p>This agreement is made on {{current_date}} between...</p>',
    lastModified: '2024-02-15'
  },
  {
    id: '3',
    name: 'Corporate Invoice',
    type: 'invoice',
    content: '<h2>Invoice #{{invoice_number}}</h2><p>Total Due: {{invoice_total}}</p>',
    lastModified: '2024-01-20'
  },
  {
    id: '4',
    name: 'Pre-Event Questionnaire',
    type: 'questionnaire',
    content: JSON.stringify([
      { id: 'q1', type: 'text', label: 'What is your preferred color scheme?', required: true },
      { id: 'q2', type: 'select', label: 'How many guests are you expecting?', required: true, options: ['0-50', '50-100', '100+'] }
    ]),
    lastModified: '2024-03-15'
  }
];

const AVAILABLE_TOKENS = [
  { key: 'client_first_name', label: 'Client First Name' },
  { key: 'client_last_name', label: 'Client Last Name' },
  { key: 'event_date', label: 'Event Date' },
  { key: 'company_name', label: 'Company Name' },
  { key: 'invoice_total', label: 'Invoice Total' },
];

export default function TemplateSettings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TemplateType>('email');
  const [templates, setTemplates] = useState<Template[]>(INITIAL_TEMPLATES);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null);
  
  // Editor State
  const [editorName, setEditorName] = useState('');
  const [editorSubject, setEditorSubject] = useState('');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Questionnaire Builder State
  const [questions, setQuestions] = useState<Question[]>([]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({
        openOnClick: false,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[300px] p-4 border rounded-md',
      },
    },
  });

  const filteredTemplates = templates.filter(t => 
    t.type === activeTab && 
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = () => {
    setCurrentTemplate(null);
    setEditorName('');
    setEditorSubject('');
    setQuestions([]);
    editor?.commands.setContent('');
    setIsEditorOpen(true);
  };

  const handleEdit = (template: Template) => {
    setCurrentTemplate(template);
    setEditorName(template.name);
    setEditorSubject(template.subject || '');
    
    if (template.type === 'questionnaire') {
      try {
        setQuestions(JSON.parse(template.content));
      } catch (e) {
        setQuestions([]);
      }
    } else {
      editor?.commands.setContent(template.content);
    }
    
    setIsEditorOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      setTemplates(templates.filter(t => t.id !== id));
      toast.success('Template deleted');
    }
  };

  const handleSave = () => {
    if (!editorName) {
      toast.error('Template name is required');
      return;
    }

    let content = '';
    if (activeTab === 'questionnaire') {
      content = JSON.stringify(questions);
    } else {
      content = editor?.getHTML() || '';
    }

    const newTemplate: Template = {
      id: currentTemplate?.id || Math.random().toString(36).substr(2, 9),
      name: editorName,
      type: activeTab,
      subject: activeTab === 'email' ? editorSubject : undefined,
      content,
      lastModified: new Date().toISOString().split('T')[0]
    };

    if (currentTemplate) {
      setTemplates(templates.map(t => t.id === currentTemplate.id ? newTemplate : t));
      toast.success('Template updated');
    } else {
      setTemplates([...templates, newTemplate]);
      toast.success('Template created');
    }
    setIsEditorOpen(false);
  };

  const insertToken = (tokenKey: string) => {
    editor?.chain().focus().insertContent(`{{${tokenKey}}}`).run();
  };

  const addImage = () => {
    const url = window.prompt('URL');
    if (url) {
      editor?.chain().focus().setImage({ src: url }).run();
    }
  };

  const setLink = () => {
    const previousUrl = editor?.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  // Questionnaire Builder Functions
  const addQuestion = () => {
    const newQuestion: Question = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'text',
      label: 'New Question',
      required: false,
      options: []
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleAiGenerate = () => {
    if (!aiPrompt) return;
    setIsGenerating(true);
    
    // Mock AI generation
    setTimeout(() => {
      if (activeTab === 'questionnaire') {
        const mockQuestions: Question[] = [
          { id: 'ai1', type: 'text', label: 'What is the event theme?', required: true },
          { id: 'ai2', type: 'select', label: 'Estimated guest count?', required: true, options: ['<50', '50-150', '150+'] },
          { id: 'ai3', type: 'textarea', label: 'Any dietary restrictions?', required: false }
        ];
        setQuestions([...questions, ...mockQuestions]);
      } else {
        const mockResponse = `
          <p>Here is a draft based on "${aiPrompt}":</p>
          <p>Dear {{client_first_name}},</p>
          <p>We are writing to confirm the details of your upcoming event on {{event_date}}.</p>
          <p>Please review the attached documents.</p>
          <p>Best regards,<br>{{company_name}}</p>
        `;
        editor?.chain().focus().insertContent(mockResponse).run();
      }
      setIsGenerating(false);
      setIsAiModalOpen(false);
      setAiPrompt('');
      toast.success('Content generated!');
    }, 1500);
  };

  if (isEditorOpen) {
    return (
      <div className="space-y-6 h-full flex flex-col">
        {/* Editor Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setIsEditorOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="h-6 w-6 text-gray-500" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {currentTemplate ? 'Edit Template' : 'New Template'}
              </h2>
              <p className="text-sm text-gray-500 capitalize">{activeTab} Template</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsAiModalOpen(true)}
              className="inline-flex items-center px-3 py-2 border border-purple-200 rounded-md shadow-sm text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              AI Assist
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Template
            </button>
          </div>
        </div>

        {/* Editor Inputs */}
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Template Name</label>
            <input
              type="text"
              value={editorName}
              onChange={(e) => setEditorName(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
              placeholder="e.g., Wedding Welcome Email"
            />
          </div>
          {activeTab === 'email' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Email Subject</label>
              <input
                type="text"
                value={editorSubject}
                onChange={(e) => setEditorSubject(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                placeholder="Subject line..."
              />
            </div>
          )}
        </div>

        {/* Conditional Editor: Questionnaire Builder vs RTE */}
        {activeTab === 'questionnaire' ? (
          <div className="flex-1 border rounded-md bg-gray-50 p-6 overflow-y-auto">
            <div className="space-y-4 max-w-3xl mx-auto">
              {questions.map((q, index) => (
                <div key={q.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 relative group">
                  <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => removeQuestion(q.id)} className="text-gray-400 hover:text-red-500">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="flex items-center mb-4">
                    <GripVertical className="h-5 w-5 text-gray-300 mr-2 cursor-move" />
                    <span className="text-sm font-medium text-gray-500 mr-2">Q{index + 1}</span>
                    <select
                      value={q.type}
                      onChange={(e) => updateQuestion(q.id, { type: e.target.value as QuestionType })}
                      className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 max-w-xs"
                    >
                      <optgroup label="Layout Fields">
                        <option value="headline">Headline</option>
                        <option value="section">Section</option>
                        <option value="paragraph">Paragraph</option>
                      </optgroup>
                      <optgroup label="Basic Form Fields">
                        <option value="text">Text Field</option>
                        <option value="textarea">Textbox</option>
                        <option value="checkbox">Checkboxes</option>
                        <option value="radio">Radio Buttons</option>
                        <option value="select">Dropdown List</option>
                        <option value="segmented">Segmented Control</option>
                      </optgroup>
                      <optgroup label="Advanced Form Fields">
                        <option value="name">Name Input</option>
                        <option value="email">Email Input</option>
                        <option value="phone">Phone Input</option>
                        <option value="address">Address Fieldset</option>
                        <option value="number">Number Input</option>
                        <option value="money">Money Input</option>
                        <option value="date">Date Input</option>
                        <option value="time">Time Input</option>
                        <option value="duration">Duration Input</option>
                        <option value="rating">Star Rating</option>
                        <option value="likert">Likert Rating Scale</option>
                        <option value="upload">Image Uploader</option>
                        <option value="privacy">Privacy Opt-In</option>
                      </optgroup>
                    </select>
                    
                    {!['headline', 'section', 'paragraph'].includes(q.type) && (
                      <div className="ml-4 flex items-center">
                        <input
                          type="checkbox"
                          checked={q.required}
                          onChange={(e) => updateQuestion(q.id, { required: e.target.checked })}
                          className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 block text-sm text-gray-900">Required</label>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex space-x-4">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          {['headline', 'section', 'paragraph'].includes(q.type) ? 'Content Text' : 'Label / Question'}
                        </label>
                        {q.type === 'paragraph' ? (
                          <textarea
                            rows={3}
                            value={q.label}
                            onChange={(e) => updateQuestion(q.id, { label: e.target.value })}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                            placeholder="Enter paragraph content..."
                          />
                        ) : (
                          <input
                            type="text"
                            value={q.label}
                            onChange={(e) => updateQuestion(q.id, { label: e.target.value })}
                            className={`block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm ${
                              q.type === 'headline' ? 'text-lg font-bold' : q.type === 'section' ? 'font-medium' : ''
                            }`}
                            placeholder={q.type === 'headline' ? "Section Headline" : "Question text..."}
                          />
                        )}
                      </div>
                      
                      {!['headline', 'section', 'paragraph', 'checkbox', 'radio', 'select', 'segmented', 'likert', 'privacy', 'upload'].includes(q.type) && (
                        <div className="w-1/3">
                          <label className="block text-xs font-medium text-gray-500 mb-1">Placeholder</label>
                          <input
                            type="text"
                            value={q.placeholder || ''}
                            onChange={(e) => updateQuestion(q.id, { placeholder: e.target.value })}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                            placeholder="e.g. Type here..."
                          />
                        </div>
                      )}
                    </div>

                    {!['headline', 'section', 'paragraph'].includes(q.type) && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Link to System Token (Optional)</label>
                        <select
                          value={q.linkedToken || ''}
                          onChange={(e) => updateQuestion(q.id, { linkedToken: e.target.value })}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                        >
                          <option value="">-- No Link --</option>
                          {AVAILABLE_TOKENS.map(t => (
                            <option key={t.key} value={t.key}>{t.label} ({'{'}{'{'}{t.key}{'}'}{'}'})</option>
                          ))}
                        </select>
                        <p className="mt-1 text-xs text-gray-400">If linked, the answer provided will automatically update this token value.</p>
                      </div>
                    )}
                    
                    {['select', 'radio', 'checkbox', 'segmented'].includes(q.type) && (
                      <div className="pl-4 border-l-2 border-gray-100">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Options (comma separated)</label>
                        <input
                          type="text"
                          value={q.options?.join(', ') || ''}
                          onChange={(e) => updateQuestion(q.id, { options: e.target.value.split(',').map(s => s.trim()) })}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                          placeholder="Option 1, Option 2, Option 3"
                        />
                      </div>
                    )}

                    {q.type === 'likert' && (
                      <div className="pl-4 border-l-2 border-gray-100 space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Columns (Scale)</label>
                          <input
                            type="text"
                            value={q.options?.join(', ') || ''}
                            onChange={(e) => updateQuestion(q.id, { options: e.target.value.split(',').map(s => s.trim()) })}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                            placeholder="Strongly Disagree, Disagree, Neutral, Agree, Strongly Agree"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Rows (Statements)</label>
                          <textarea
                            rows={3}
                            value={q.rows?.join('\n') || ''}
                            onChange={(e) => updateQuestion(q.id, { rows: e.target.value.split('\n') })}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                            placeholder="Statement 1&#10;Statement 2&#10;Statement 3"
                          />
                        </div>
                      </div>
                    )}

                    {q.type === 'privacy' && (
                      <div className="pl-4 border-l-2 border-gray-100">
                        <p className="text-xs text-gray-500 italic">
                          This field will render as a checkbox with the label text above. Use the label for your privacy policy disclaimer.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              <button
                onClick={addQuestion}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-pink-500 hover:text-pink-600 transition-colors flex items-center justify-center font-medium"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Question
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* RTE Toolbar */}
            <div className="flex items-center space-x-2 border-b pb-2 flex-wrap gap-y-2">
              <button
                onClick={() => editor?.chain().focus().toggleBold().run()}
                className={`p-2 rounded ${editor?.isActive('bold') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                title="Bold"
              >
                <span className="font-bold">B</span>
              </button>
              <button
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                className={`p-2 rounded ${editor?.isActive('italic') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                title="Italic"
              >
                <span className="italic">I</span>
              </button>
              <button
                onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                className={`p-2 rounded ${editor?.isActive('heading', { level: 2 }) ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                title="Heading 2"
              >
                H2
              </button>
              <button
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                className={`p-2 rounded ${editor?.isActive('bulletList') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                title="Bullet List"
              >
                List
              </button>
              
              <div className="h-6 w-px bg-gray-300 mx-2" />

              <button onClick={() => editor?.chain().focus().setTextAlign('left').run()} className={`p-2 rounded ${editor?.isActive({ textAlign: 'left' }) ? 'bg-gray-200' : 'hover:bg-gray-100'}`}>
                <AlignLeft className="h-4 w-4" />
              </button>
              <button onClick={() => editor?.chain().focus().setTextAlign('center').run()} className={`p-2 rounded ${editor?.isActive({ textAlign: 'center' }) ? 'bg-gray-200' : 'hover:bg-gray-100'}`}>
                <AlignCenter className="h-4 w-4" />
              </button>
              <button onClick={() => editor?.chain().focus().setTextAlign('right').run()} className={`p-2 rounded ${editor?.isActive({ textAlign: 'right' }) ? 'bg-gray-200' : 'hover:bg-gray-100'}`}>
                <AlignRight className="h-4 w-4" />
              </button>
              <button onClick={() => editor?.chain().focus().setTextAlign('justify').run()} className={`p-2 rounded ${editor?.isActive({ textAlign: 'justify' }) ? 'bg-gray-200' : 'hover:bg-gray-100'}`}>
                <AlignJustify className="h-4 w-4" />
              </button>

              <div className="h-6 w-px bg-gray-300 mx-2" />

              <button onClick={setLink} className={`p-2 rounded ${editor?.isActive('link') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}>
                <LinkIcon className="h-4 w-4" />
              </button>
              <button onClick={addImage} className="p-2 rounded hover:bg-gray-100">
                <ImageIcon className="h-4 w-4" />
              </button>
              
              <div className="h-6 w-px bg-gray-300 mx-2" />
              
              <div className="relative group">
                <button className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 rounded hover:bg-gray-200 text-sm font-medium text-gray-700">
                  <span>Insert Token</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
                <div className="absolute left-0 mt-1 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 hidden group-hover:block">
                  <div className="py-1" role="menu">
                    {AVAILABLE_TOKENS.map((token) => (
                      <button
                        key={token.key}
                        onClick={() => insertToken(token.key)}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        {token.label} <span className="text-xs text-gray-400 ml-1">{'{{'}{token.key}{'}}'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Editor Content */}
            <div className="flex-1 border rounded-md overflow-hidden">
              <EditorContent editor={editor} className="h-full overflow-y-auto p-4" />
            </div>
          </>
        )}

        {/* AI Modal */}
        {isAiModalOpen && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Sparkles className="h-5 w-5 text-purple-500 mr-2" />
                  AI Writing Assistant
                </h3>
                <button onClick={() => setIsAiModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  {activeTab === 'questionnaire' 
                    ? "Describe the questionnaire you need, and I'll generate questions for you."
                    : "Describe what you want to write, and I'll generate a draft for you."}
                </p>
                <textarea
                  rows={4}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                  placeholder={activeTab === 'questionnaire' ? "e.g., Create a wedding planning questionnaire..." : "e.g., Write a polite email..."}
                />
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setIsAiModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAiGenerate}
                    disabled={isGenerating || !aiPrompt}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                  >
                    {isGenerating ? 'Generating...' : 'Generate'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/settings')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-6 w-6 text-gray-500" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Templates</h2>
            <p className="text-sm text-gray-500">Manage your document and email templates.</p>
          </div>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {[
            { id: 'email', label: 'Emails', icon: Mail },
            { id: 'contract', label: 'Contracts', icon: FileCheck },
            { id: 'invoice', label: 'Invoices', icon: FileSpreadsheet },
            { id: 'quote', label: 'Quotes', icon: FileText },
            { id: 'questionnaire', label: 'Questionnaires', icon: HelpCircle },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TemplateType)}
              className={`${
                activeTab === tab.id
                  ? 'border-pink-500 text-pink-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Search and List */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="max-w-md relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="focus:ring-pink-500 focus:border-pink-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
              placeholder={`Search ${activeTab} templates...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <ul className="divide-y divide-gray-200">
          {filteredTemplates.length > 0 ? (
            filteredTemplates.map((template) => (
              <li key={template.id} className="hover:bg-gray-50">
                <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="shrink-0">
                      <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-pink-100 text-pink-600">
                        {template.type === 'email' && <Mail className="h-6 w-6" />}
                        {template.type === 'contract' && <FileCheck className="h-6 w-6" />}
                        {template.type === 'invoice' && <FileSpreadsheet className="h-6 w-6" />}
                        {template.type === 'quote' && <FileText className="h-6 w-6" />}
                        {template.type === 'questionnaire' && <HelpCircle className="h-6 w-6" />}
                      </span>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-pink-600">{template.name}</h3>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <span className="truncate">Last modified: {template.lastModified}</span>
                        {template.subject && (
                          <>
                            <span className="mx-2">&bull;</span>
                            <span className="truncate max-w-xs">Subject: {template.subject}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleEdit(template)}
                      className="p-2 text-gray-400 hover:text-indigo-600"
                      title="Edit"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={() => {
                        const newT = { ...template, id: Math.random().toString(36).substr(2, 9), name: `${template.name} (Copy)` };
                        setTemplates([...templates, newT]);
                        toast.success('Template duplicated');
                      }}
                      className="p-2 text-gray-400 hover:text-green-600"
                      title="Duplicate"
                    >
                      <Copy className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(template.id)}
                      className="p-2 text-gray-400 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))
          ) : (
            <li className="px-4 py-8 text-center text-gray-500">
              No templates found. Create one to get started.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
