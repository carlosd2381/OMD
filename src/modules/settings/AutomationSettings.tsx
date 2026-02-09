import { useState, useEffect } from 'react';
import { 
  Zap, 
  Plus, 
  Trash2, 
  Play, 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock, 
  ArrowRight, 
  Settings,
  Save,
  Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import { automationService, type Workflow, type ExecutionLog, type WorkflowAction, type WorkflowCondition } from '../../services/automationService';
import { productService } from '../../services/productService';
import type { Product } from '../../types/product';

const TRIGGERS = [
  { value: 'lead_created', label: 'New Lead Created' },
  { value: 'contract_signed', label: 'Contract Signed' },
  { value: 'invoice_paid', label: 'Invoice Paid' },
  { value: 'task_overdue', label: 'Task Overdue' },
  { value: 'event_approaching', label: 'Event Date Approaching (7 days)' },
  { value: 'form_submitted', label: 'Client Form Submitted' },
];

const CONDITION_FIELDS = [
  { value: 'client_type', label: 'Client Type' },
  { value: 'lead_source', label: 'Lead Source' },
  { value: 'event_type', label: 'Event Type' },
  { value: 'budget', label: 'Budget' },
];

const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Does Not Equal' },
  { value: 'contains', label: 'Contains' },
];

const ACTION_TYPES = [
  { value: 'send_email', label: 'Send Email' },
  { value: 'create_task', label: 'Create Task' },
  { value: 'create_quote', label: 'Create Quote' },
  { value: 'update_status', label: 'Update Status' },
  { value: 'webhook', label: 'Call Webhook' },
];

export default function AutomationSettings() {
  const [activeTab, setActiveTab] = useState<'workflows' | 'logs'>('workflows');
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [workflowsData, logsData, productsData] = await Promise.all([
        automationService.getWorkflows(),
        automationService.getLogs(),
        productService.getProducts()
      ]);
      setWorkflows(workflowsData);
      setLogs(logsData);
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading automation data:', error);
      toast.error('Failed to load automation data');
    }
  };

  // Editor State
  const handleCreateNew = () => {
    setCurrentWorkflow({
      id: `temp_${Date.now()}`,
      name: 'New Workflow',
      active: true,
      trigger: 'lead_created',
      conditions: [],
      actions: []
    });
    setIsEditing(true);
  };

  const handleEdit = (workflow: Workflow) => {
    setCurrentWorkflow({ ...workflow });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!currentWorkflow) return;
    try {
      await automationService.saveWorkflow(currentWorkflow);
      toast.success('Workflow saved');
      setIsEditing(false);
      setCurrentWorkflow(null);
      loadData();
    } catch (error) {
      console.error('Error saving workflow:', error);
      toast.error('Failed to save workflow');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    try {
      await automationService.deleteWorkflow(id);
      toast.success('Workflow deleted');
      setIsEditing(false);
      setCurrentWorkflow(null);
      loadData();
    } catch (error) {
      console.error('Error deleting workflow:', error);
      toast.error('Failed to delete workflow');
    }
  };

  const addCondition = () => {
    if (!currentWorkflow) return;
    const newCondition: WorkflowCondition = {
      field: 'client_type',
      operator: 'equals',
      value: ''
    };
    setCurrentWorkflow({
      ...currentWorkflow,
      conditions: [...(currentWorkflow.conditions || []), newCondition]
    });
  };

  const removeCondition = (index: number) => {
    if (!currentWorkflow) return;
    const newConditions = [...(currentWorkflow.conditions || [])];
    newConditions.splice(index, 1);
    setCurrentWorkflow({
      ...currentWorkflow,
      conditions: newConditions
    });
  };

  const updateCondition = (index: number, updates: Partial<WorkflowCondition>) => {
    if (!currentWorkflow) return;
    const newConditions = [...(currentWorkflow.conditions || [])];
    newConditions[index] = { ...newConditions[index], ...updates };
    setCurrentWorkflow({
      ...currentWorkflow,
      conditions: newConditions
    });
  };

  const addAction = () => {
    if (!currentWorkflow) return;
    const newAction: WorkflowAction = {
      id: Date.now().toString(),
      type: 'send_email',
      config: {}
    };
    setCurrentWorkflow({
      ...currentWorkflow,
      actions: [...currentWorkflow.actions, newAction]
    });
  };

  const removeAction = (actionId: string) => {
    if (!currentWorkflow) return;
    setCurrentWorkflow({
      ...currentWorkflow,
      actions: currentWorkflow.actions.filter(a => a.id !== actionId)
    });
  };

  const updateAction = (actionId: string, updates: Partial<WorkflowAction>) => {
    if (!currentWorkflow) return;
    setCurrentWorkflow({
      ...currentWorkflow,
      actions: currentWorkflow.actions.map(a => a.id === actionId ? { ...a, ...updates } : a)
    });
  };

  const updateActionConfig = (actionId: string, key: string, value: any) => {
    if (!currentWorkflow) return;
    setCurrentWorkflow({
      ...currentWorkflow,
      actions: currentWorkflow.actions.map(a => 
        a.id === actionId ? { ...a, config: { ...a.config, [key]: value } } : a
      )
    });
  };

  // Render Action Config Fields
  const renderActionConfig = (action: WorkflowAction) => {
    switch (action.type) {
      case 'send_email':
        return (
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Template</label>
              <select 
                className="mt-1 block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                value={action.config.templateId || ''}
                onChange={(e) => updateActionConfig(action.id, 'templateId', e.target.value)}
              >
                <option value="">Select Template...</option>
                <option value="welcome_email">Welcome Email</option>
                <option value="payment_receipt">Payment Receipt</option>
                <option value="contract_reminder">Contract Reminder</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Recipient</label>
              <select 
                className="mt-1 block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                value={action.config.to || ''}
                onChange={(e) => updateActionConfig(action.id, 'to', e.target.value)}
              >
                <option value="client">Client</option>
                <option value="lead">Lead</option>
                <option value="admin">Admin</option>
                <option value="planner">Planner</option>
              </select>
            </div>
          </div>
        );
      case 'create_task':
        return (
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Task Title</label>
              <input 
                type="text"
                className="mt-1 block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                value={action.config.title || ''}
                onChange={(e) => updateActionConfig(action.id, 'title', e.target.value)}
                placeholder="e.g. Follow up with client"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Due In (Days)</label>
              <input 
                type="number"
                className="mt-1 block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                value={action.config.dueInDays || ''}
                onChange={(e) => updateActionConfig(action.id, 'dueInDays', e.target.value)}
              />
            </div>
          </div>
        );
      case 'create_quote':
        return (
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Product/Package</label>
              <select 
                className="mt-1 block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                value={action.config.productId || ''}
                onChange={(e) => updateActionConfig(action.id, 'productId', e.target.value)}
              >
                <option value="">Select Product...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.category})</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                The system will automatically apply Direct or Preferred Vendor pricing based on the client type.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Valid For (Days)</label>
              <input 
                type="number"
                className="mt-1 block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                value={action.config.validForDays || '30'}
                onChange={(e) => updateActionConfig(action.id, 'validForDays', e.target.value)}
              />
            </div>
          </div>
        );
      case 'webhook':
        return (
          <div className="mt-2">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Webhook URL</label>
            <input 
              type="text"
              className="mt-1 block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
              value={action.config.url || ''}
              onChange={(e) => updateActionConfig(action.id, 'url', e.target.value)}
              placeholder="https://api.example.com/webhook"
            />
          </div>
        );
      default:
        return <div className="mt-2 text-xs text-gray-400">No configuration needed for this action type.</div>;
    }
  };

  if (isEditing && currentWorkflow) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button 
              onClick={() => setIsEditing(false)}
              className="mr-4 text-gray-400 hover:text-gray-600"
            >
              <ArrowRight className="h-6 w-6 transform rotate-180" />
            </button>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">
              {currentWorkflow.id && !currentWorkflow.id.startsWith('temp_') ? 'Edit Workflow' : 'New Workflow'}
            </h2>
          </div>
          <div className="flex space-x-3">
            {currentWorkflow.id && !currentWorkflow.id.startsWith('temp_') && (
              <button
                onClick={() => handleDelete(currentWorkflow.id)}
                className="px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-red-50"
              >
                Delete
              </button>
            )}
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90"
            >
              <Save className="h-4 w-4 mr-2 inline" />
              Save Workflow
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow rounded-lg p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Workflow Name</label>
              <input
                type="text"
                value={currentWorkflow.name}
                onChange={(e) => setCurrentWorkflow({...currentWorkflow, name: e.target.value})}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="e.g. New Lead Auto-Response"
              />
            </div>
            <div className="flex items-center pt-6">
              <input
                id="active-toggle"
                type="checkbox"
                checked={currentWorkflow.active}
                onChange={(e) => setCurrentWorkflow({...currentWorkflow, active: e.target.checked})}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="active-toggle" className="ml-2 block text-sm text-gray-900 dark:text-white dark:text-white">
                Workflow is Active
              </label>
            </div>
          </div>

          {/* Trigger Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white flex items-center mb-4">
              <Zap className="h-5 w-5 text-yellow-500 mr-2" />
              When this happens...
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 p-4 rounded-md border border-gray-200 dark:border-gray-700 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Event</label>
              <select
                value={currentWorkflow.trigger}
                onChange={(e) => setCurrentWorkflow({...currentWorkflow, trigger: e.target.value})}
                className="block w-full max-w-md border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
              >
                {TRIGGERS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Conditions Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                <Filter className="h-5 w-5 text-blue-500 mr-2" />
                Only if...
              </h3>
              <button
                onClick={addCondition}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Condition
              </button>
            </div>
            
            <div className="space-y-3">
              {(currentWorkflow.conditions || []).length === 0 ? (
                <div className="text-sm text-gray-500 italic bg-gray-50 dark:bg-gray-700 p-4 rounded-md border border-gray-200 dark:border-gray-700 text-center">
                  No conditions set. This workflow will run for all triggers.
                </div>
              ) : (
                (currentWorkflow.conditions || []).map((condition, index) => (
                  <div key={index} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700 p-3 rounded-md border border-gray-200 dark:border-gray-700">
                    <span className="text-xs font-bold text-gray-400 uppercase w-8">
                      {index === 0 ? 'If' : 'And'}
                    </span>
                    <select
                      value={condition.field}
                      onChange={(e) => updateCondition(index, { field: e.target.value })}
                      className="block w-40 text-sm border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                    >
                      {CONDITION_FIELDS.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                    <select
                      value={condition.operator}
                      onChange={(e) => updateCondition(index, { operator: e.target.value as any })}
                      className="block w-32 text-sm border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                    >
                      {OPERATORS.map(op => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={condition.value}
                      onChange={(e) => updateCondition(index, { value: e.target.value })}
                      className="block flex-1 text-sm border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                      placeholder="Value..."
                    />
                    <button
                      onClick={() => removeCondition(index)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Actions Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white flex items-center mb-4">
              <Play className="h-5 w-5 text-green-500 mr-2" />
              Do this...
            </h3>
            
            <div className="space-y-4">
              {currentWorkflow.actions.map((action, index) => (
                <div key={action.id} className="relative flex items-start">
                  <div className="flex items-center h-full absolute left-0 top-0 bottom-0 ml-4">
                    <div className="h-full w-0.5 bg-gray-200"></div>
                  </div>
                  <div className="relative z-10 shrink-0 h-8 w-8 rounded-full bg-white dark:bg-gray-800 dark:bg-gray-800 border-2 border-gray-300 flex items-center justify-center text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">
                    {index + 1}
                  </div>
                  <div className="ml-4 flex-1 bg-white dark:bg-gray-800 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="w-full max-w-xs">
                        <select
                          value={action.type}
                          onChange={(e) => updateAction(action.id, { type: e.target.value as any })}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm font-medium"
                        >
                          {ACTION_TYPES.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                      <button 
                        onClick={() => removeAction(action.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                    {/* Dynamic Config Fields */}
                    <div className="mt-3 bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 p-3 rounded border border-gray-100">
                      {renderActionConfig(action)}
                    </div>
                  </div>
                </div>
              ))}

              <div className="relative flex items-start">
                <div className="relative z-10 shrink-0 h-8 w-8 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                  <Plus className="h-4 w-4 text-gray-400" />
                </div>
                <div className="ml-4">
                  <button
                    onClick={addAction}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 focus:outline-none"
                  >
                    Add Action
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">Automations</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">Manage workflows and view execution logs.</p>
        </div>
        {activeTab === 'workflows' && (
          <button 
            onClick={handleCreateNew}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Workflow
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('workflows')}
            className={`${
              activeTab === 'workflows'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300'
            } group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm`}
          >
            <Zap className={`${activeTab === 'workflows' ? 'text-primary' : 'text-gray-400'} -ml-0.5 mr-2 h-5 w-5`} />
            Workflows
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`${
              activeTab === 'logs'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300'
            } group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm`}
          >
            <Activity className={`${activeTab === 'logs' ? 'text-primary' : 'text-gray-400'} -ml-0.5 mr-2 h-5 w-5`} />
            Execution Logs
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'workflows' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workflows.map((workflow) => (
            <div 
              key={workflow.id}
              className="bg-white dark:bg-gray-800 dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleEdit(workflow)}
            >
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`shrink-0 rounded-md p-3 ${workflow.active ? 'bg-green-100' : 'bg-gray-100'}`}>
                      <Zap className={`h-6 w-6 ${workflow.active ? 'text-green-600' : 'text-gray-400'}`} />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white">{workflow.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                        {TRIGGERS.find(t => t.value === workflow.trigger)?.label || workflow.trigger}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                    <Play className="shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                    {workflow.actions.length} Actions configured
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 px-5 py-3">
                <div className="text-sm">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    workflow.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {workflow.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {logs.map((log) => (
              <li key={log.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {log.status === 'success' ? (
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 mr-3" />
                      )}
                      <p className="text-sm font-medium text-primary truncate">{log.workflowName}</p>
                    </div>
                    <div className="ml-2 shrink-0 flex">
                      <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        log.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {log.status}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                        <Settings className="shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {log.details}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 sm:mt-0">
                      <Clock className="shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                      <p>{log.triggeredAt}</p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
