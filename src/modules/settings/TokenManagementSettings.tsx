import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Search, Copy, Trash2, Edit2, Play, Settings, Database, Tag, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { settingsService } from '../../services/settingsService';
import { SYSTEM_TOKENS as SHARED_SYSTEM_TOKENS } from '../../constants/tokens';

type TokenType = 'system' | 'custom';
type TokenSyntax = 'mustache' | 'percent' | 'brackets';

interface Token {
  id?: string;
  key: string;
  description: string;
  category: string;
  type: TokenType;
  value?: string; // For custom tokens
  fallback?: string; // Default value if empty
  usageCount?: number;
}

const SYSTEM_TOKENS: Token[] = SHARED_SYSTEM_TOKENS.map(t => ({
  key: t.key,
  description: t.description || t.label,
  category: t.category,
  type: 'system',
  usageCount: 0
}));

export default function TokenManagementSettings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'library' | 'custom' | 'settings' | 'tester'>('library');
  const [customTokens, setCustomTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Settings State
  const [syntax, setSyntax] = useState<TokenSyntax>('mustache');
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');
  const [currencyFormat, setCurrencyFormat] = useState('USD');
  const [globalFallback, setGlobalFallback] = useState('N/A');

  // Tester State
  const [testInput, setTestInput] = useState('Hello {{client_first_name}}, your balance of {{balance_due}} is due on {{event_date}}.');
  const [testOutput, setTestOutput] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingToken, setEditingToken] = useState<Token | null>(null);
  const [modalKey, setModalKey] = useState('');
  const [modalValue, setModalValue] = useState('');
  const [modalDesc, setModalDesc] = useState('');
  const [modalCategory, setModalCategory] = useState('General');

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    setLoading(true);
    try {
      const data = await settingsService.getTokens();
      
      const mapped: Token[] = data.map(item => ({
        id: item.id,
        key: item.key,
        description: item.label || '', // Map label to description
        category: item.category || 'General',
        type: 'custom',
        value: item.default_value || '', // Map default_value to value
        usageCount: 0
      }));
      setCustomTokens(mapped);
    } catch (error) {
      console.error('Error loading tokens:', error);
      toast.error('Failed to load tokens');
    } finally {
      setLoading(false);
    }
  };

  const getWrapper = (s: TokenSyntax) => {
    switch (s) {
      case 'percent': return ['%', '%'];
      case 'brackets': return ['[', ']'];
      default: return ['{{', '}}'];
    }
  };

  const [startWrap, endWrap] = getWrapper(syntax);

  const allTokens = [...SYSTEM_TOKENS, ...customTokens].filter(t => 
    t.key.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(`${startWrap}${key}${endWrap}`);
    toast.success('Token copied to clipboard');
  };

  const handleAddCustom = () => {
    setEditingToken(null);
    setModalKey('');
    setModalValue('');
    setModalDesc('');
    setModalCategory('General');
    setIsModalOpen(true);
  };

  const handleEditCustom = (token: Token) => {
    setEditingToken(token);
    setModalKey(token.key);
    setModalValue(token.value || '');
    setModalDesc(token.description);
    setModalCategory(token.category);
    setIsModalOpen(true);
  };

  const handleDeleteCustom = async (token: Token) => {
    if (!token.id) return;
    if (confirm('Are you sure? This token will stop working in all templates.')) {
        try {
            await settingsService.deleteToken(token.id);
            setCustomTokens(customTokens.filter(t => t.id !== token.id));
            toast.success('Token deleted');
        } catch (error) {
            console.error('Error deleting token:', error);
            toast.error('Failed to delete token');
        }
    }
  };

  const handleSaveCustom = async () => {
    if (!modalKey || !modalValue) {
      toast.error('Key and Value are required');
      return;
    }

    const key = modalKey.replace(/\s+/g, '_').toLowerCase();

    try {
        if (editingToken && editingToken.id) {
            const updated = await settingsService.updateToken(editingToken.id, {
                key,
                default_value: modalValue, // Map value to default_value
                label: modalDesc, // Map description to label
                category: modalCategory
            } as any);
            setCustomTokens(customTokens.map(t => t.id === updated.id ? {
                ...t,
                key: updated.key,
                value: updated.default_value || '',
                description: updated.label || '',
                category: updated.category || 'General'
            } : t));
            toast.success('Token updated');
        } else {
            if (customTokens.find(t => t.key === key) || SYSTEM_TOKENS.find(t => t.key === key)) {
                toast.error('Token key already exists');
                return;
            }
            const created = await settingsService.createToken({
                key,
                default_value: modalValue, // Map value to default_value
                label: modalDesc, // Map description to label
                category: modalCategory
            } as any);
            setCustomTokens([...customTokens, {
                id: created.id,
                key: created.key,
                value: created.default_value || '',
                description: created.label || '',
                category: created.category || 'General',
                type: 'custom',
                usageCount: 0
            }]);
            toast.success('Token created');
        }
        setIsModalOpen(false);
    } catch (error) {
        console.error('Error saving token:', error);
        toast.error('Failed to save token');
    }
  };

  const runTest = () => {
    let result = testInput;
    
    // Mock Data for Tester
    const mockData: Record<string, string> = {
      client_first_name: 'Sarah',
      client_last_name: 'Connor',
      event_date: dateFormat === 'MM/DD/YYYY' ? '12/25/2025' : '25/12/2025',
      event_venue: 'Grand Hotel',
      invoice_total: currencyFormat === 'USD' ? ',000.00' : 'MXN ,000.00',
      balance_due: currencyFormat === 'USD' ? ',500.00' : 'MXN ,500.00',
      company_name: 'Oh My Desserts MX',
      current_date: new Date().toLocaleDateString(),
    };

    // Replace Custom Tokens
    customTokens.forEach(t => {
      const pattern = new RegExp(`${startWrap === '[' ? '\\[' : startWrap}${t.key}${endWrap === ']' ? '\\]' : endWrap}`, 'g');
      result = result.replace(pattern, t.value || '');
    });

    // Replace System Tokens
    SYSTEM_TOKENS.forEach(t => {
      const pattern = new RegExp(`${startWrap === '[' ? '\\[' : startWrap}${t.key}${endWrap === ']' ? '\\]' : endWrap}`, 'g');
      const val = mockData[t.key] || globalFallback;
      result = result.replace(pattern, val);
    });

    setTestOutput(result);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/settings')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-6 w-6 text-gray-500 dark:text-gray-400 dark:text-gray-400" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">Token Management</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">Manage merge tags and shortcodes for your templates.</p>
          </div>
        </div>
        {activeTab === 'custom' && (
          <button
            onClick={handleAddCustom}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Token
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('library')}
            className={`${
              activeTab === 'library'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Database className="h-4 w-4 mr-2" />
            System Library
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`${
              activeTab === 'custom'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Tag className="h-4 w-4 mr-2" />
            Custom Tokens
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
            Configuration
          </button>
          <button
            onClick={() => setActiveTab('tester')}
            className={`${
              activeTab === 'tester'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Play className="h-4 w-4 mr-2" />
            Live Tester
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow sm:rounded-lg min-h-[400px]">
        
        {/* Library Tab */}
        {activeTab === 'library' && (
          <div className="p-6">
            <div className="mb-4 max-w-md">
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                  placeholder="Search system tokens..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 dark:bg-gray-700 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider">Token</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider">Usage</th>
                    <th className="relative px-6 py-3"><span className="sr-only">Copy</span></th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 dark:bg-gray-800 divide-y divide-gray-200">
                  {allTokens.filter(t => t.type === 'system').map((token) => (
                    <tr key={token.key} className="hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-primary font-medium">
                        {startWrap}{token.key}{endWrap}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                        {token.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {token.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                        {token.usageCount} templates
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => handleCopy(token.key)} className="text-gray-400 hover:text-gray-600">
                          <Copy className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Custom Tokens Tab */}
        {activeTab === 'custom' && (
          <div className="p-6">
            {loading ? (
                <div className="text-center py-12">Loading tokens...</div>
            ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {customTokens.map((token) => (
                <div key={token.id || token.key} className="relative rounded-lg border border-gray-300 bg-white dark:bg-gray-800 dark:bg-gray-800 px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-primary focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-medium text-primary font-mono truncate">
                        {startWrap}{token.key}{endWrap}
                      </p>
                      <div className="flex space-x-2">
                        <button onClick={() => handleEditCustom(token)} className="text-gray-400 hover:text-indigo-500">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDeleteCustom(token)} className="text-gray-400 hover:text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-900 dark:text-white dark:text-white mt-1 truncate">{token.value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 mt-1">{token.description}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {token.category}
                      </span>
                      <span className="text-xs text-gray-400">Used in {token.usageCount} places</span>
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={handleAddCustom}
                className="relative block w-full border-2 border-gray-300 border-dashed rounded-lg p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <Plus className="mx-auto h-12 w-12 text-gray-400" />
                <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-white dark:text-white">Create new token</span>
              </button>
            </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="p-6 max-w-2xl space-y-8">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white">Syntax Configuration</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 mb-4">Choose how tokens are wrapped in your templates.</p>
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => setSyntax('mustache')}
                  className={`p-4 border rounded-lg text-center ${syntax === 'mustache' ? 'border-primary bg-secondary ring-1 ring-primary' : 'border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700'}`}
                >
                  <span className="block text-lg font-mono font-bold text-gray-900 dark:text-white dark:text-white">{'{{token}}'}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 mt-1">Mustache (Default)</span>
                </button>
                <button
                  onClick={() => setSyntax('percent')}
                  className={`p-4 border rounded-lg text-center ${syntax === 'percent' ? 'border-primary bg-secondary ring-1 ring-primary' : 'border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700'}`}
                >
                  <span className="block text-lg font-mono font-bold text-gray-900 dark:text-white dark:text-white">%token%</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 mt-1">Percent</span>
                </button>
                <button
                  onClick={() => setSyntax('brackets')}
                  className={`p-4 border rounded-lg text-center ${syntax === 'brackets' ? 'border-primary bg-secondary ring-1 ring-primary' : 'border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700'}`}
                >
                  <span className="block text-lg font-mono font-bold text-gray-900 dark:text-white dark:text-white">[token]</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 mt-1">Brackets</span>
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 dark:border-gray-700 pt-8">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white">Data Formatting</h3>
              <div className="mt-4 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">Date Format</label>
                  <select
                    value={dateFormat}
                    onChange={(e) => setDateFormat(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY (12/25/2025)</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY (25/12/2025)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (2025-12-25)</option>
                    <option value="MMM D, YYYY">MMM D, YYYY (Dec 25, 2025)</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">Currency Format</label>
                  <select
                    value={currencyFormat}
                    onChange={(e) => setCurrencyFormat(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                  >
                    <option value="USD">,234.56 (USD)</option>
                    <option value="MXN">MXN ,234.56</option>
                    <option value="EUR">€1.234,56</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 dark:border-gray-700 pt-8">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white">Global Fallback</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 mb-4">What to display if a token's data source is empty.</p>
              <div>
                <label className="block text-sm font-medium text-gray-700">Default Replacement Text</label>
                <input
                  type="text"
                  value={globalFallback}
                  onChange={(e) => setGlobalFallback(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="e.g. N/A or Valued Customer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tester Tab */}
        {activeTab === 'tester' && (
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Template Editor</label>
              <textarea
                rows={10}
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md font-mono"
                placeholder="Type your text here using tokens..."
              />
              <div className="mt-4">
                <button
                  onClick={runTest}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Render Preview
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Live Preview</label>
              <div className="bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-md p-4 h-[250px] overflow-y-auto whitespace-pre-wrap">
                {testOutput || <span className="text-gray-400 italic">Click 'Render Preview' to see the result...</span>}
              </div>
              <div className="mt-4 bg-blue-50 p-4 rounded-md">
                <h4 className="text-sm font-medium text-blue-800">Available Test Data</h4>
                <ul className="mt-2 text-xs text-blue-700 grid grid-cols-2 gap-2">
                  <li>client_first_name: Sarah</li>
                  <li>event_date: {dateFormat === 'MM/DD/YYYY' ? '12/25/2025' : '25/12/2025'}</li>
                  <li>invoice_total: {currencyFormat === 'USD' ? ',000.00' : 'MXN ,000.00'}</li>
                  <li>wifi_password: SweetTreats2024!</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-50 dark:bg-gray-700 dark:bg-gray-7000 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white mb-4">
              {editingToken ? 'Edit Custom Token' : 'Create Custom Token'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Token Key</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 text-gray-500 dark:text-gray-400 dark:text-gray-400 sm:text-sm">
                    {startWrap}
                  </span>
                  <input
                    type="text"
                    value={modalKey}
                    onChange={(e) => setModalKey(e.target.value)}
                    disabled={!!editingToken}
                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md focus:ring-primary focus:border-primary sm:text-sm border-gray-300 disabled:bg-gray-100"
                    placeholder="my_token_name"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Replacement Value</label>
                <textarea
                  rows={3}
                  value={modalValue}
                  onChange={(e) => setModalValue(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="The text that will appear..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <input
                  type="text"
                  value={modalDesc}
                  onChange={(e) => setModalDesc(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={modalCategory}
                  onChange={(e) => setModalCategory(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                >
                  <option value="General">General</option>
                  <option value="Social">Social Media</option>
                  <option value="Legal">Legal</option>
                  <option value="Marketing">Marketing</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustom}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90"
              >
                Save Token
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
