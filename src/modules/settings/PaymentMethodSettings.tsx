import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Globe, Building2, Banknote, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { settingsService } from '../../services/settingsService';

export default function PaymentMethodSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [methods, setMethods] = useState({
    stripe: {
      enabled: false,
      publishableKey: '',
      secretKey: '',
      mode: 'test', // test, live
    },
    paypal: {
      enabled: false,
      clientId: '',
      clientSecret: '',
      mode: 'sandbox', // sandbox, live
    },
    wise: {
      enabled: false,
      accountDetails: '',
      instructions: 'Please use the following details for Wise transfers...',
    },
    remitly: {
      enabled: false,
      accountDetails: '',
      instructions: 'Please use the following details for Remitly transfers...',
    },
    bankTransfer: {
      enabled: true,
      bankName: '',
      accountNumber: '',
      clabe: '',
      beneficiary: '',
      swiftCode: '',
    },
    cash: {
      mxnEnabled: true,
      usdEnabled: true,
      instructions: 'Cash payments accepted at our office during business hours.',
    }
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await settingsService.getPaymentMethods();
      if (data && data.length > 0) {
        const newMethods = { ...methods };
        
        data.forEach(item => {
          const key = item.type as keyof typeof methods;
          if (newMethods[key]) {
              const details = item.details as any || {};
              // For cash, we don't have a top-level enabled, so we just merge details
              if (key === 'cash') {
                  newMethods[key] = { ...newMethods[key], ...details };
              } else {
                  newMethods[key] = {
                      ...newMethods[key],
                      ...details,
                      enabled: item.is_active
                  };
              }
          }
        });
        setMethods(newMethods);
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
      toast.error('Failed to load payment methods');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const currentMethods = await settingsService.getPaymentMethods();
      
      for (const [key, config] of Object.entries(methods)) {
        const existing = currentMethods.find(m => m.type === key);
        const { enabled, ...details } = config as any;
        
        let isEnabled = enabled;
        if (key === 'cash') {
            isEnabled = details.mxnEnabled || details.usdEnabled;
        }

        const payload = {
            name: key === 'bankTransfer' ? 'Bank Transfer' : key.charAt(0).toUpperCase() + key.slice(1),
            type: key,
            is_enabled: isEnabled !== undefined ? isEnabled : false,
            details: details
        };

        if (existing) {
            await settingsService.updatePaymentMethod(existing.id, payload);
        } else {
            await settingsService.createPaymentMethod(payload);
        }
      }
      toast.success('Payment methods saved successfully');
    } catch (error) {
      console.error('Error saving payment methods:', error);
      toast.error('Failed to save payment methods');
    } finally {
      setLoading(false);
    }
  };

  const updateMethod = (category: keyof typeof methods, field: string, value: any) => {
    setMethods(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
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
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">Payment Methods</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">Configure how you accept payments from clients.</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        
        {/* Left Column: Online Processing */}
        <div className="space-y-6">
          
          {/* Stripe */}
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow sm:rounded-lg p-6 border-l-4 border-indigo-500">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2 text-indigo-500" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white">Stripe</h3>
              </div>
              <div className="flex items-center">
                <span className="mr-3 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">{methods.stripe.enabled ? 'Enabled' : 'Disabled'}</span>
                <button
                  onClick={() => updateMethod('stripe', 'enabled', !methods.stripe.enabled)}
                  className={`relative inline-flex shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                    methods.stripe.enabled ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white dark:bg-gray-800 dark:bg-gray-800 shadow transform ring-0 transition ease-in-out duration-200 ${methods.stripe.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
            
            {methods.stripe.enabled && (
              <div className="space-y-4 animate-fadeIn">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mode</label>
                  <select
                    value={methods.stripe.mode}
                    onChange={(e) => updateMethod('stripe', 'mode', e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    <option value="test">Test Mode</option>
                    <option value="live">Live Mode</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Publishable Key</label>
                  <input
                    type="text"
                    value={methods.stripe.publishableKey}
                    onChange={(e) => updateMethod('stripe', 'publishableKey', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="pk_test_..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Secret Key</label>
                  <input
                    type="password"
                    value={methods.stripe.secretKey}
                    onChange={(e) => updateMethod('stripe', 'secretKey', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="sk_test_..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* PayPal */}
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow sm:rounded-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2 text-blue-500" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white">PayPal</h3>
              </div>
              <div className="flex items-center">
                <span className="mr-3 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">{methods.paypal.enabled ? 'Enabled' : 'Disabled'}</span>
                <button
                  onClick={() => updateMethod('paypal', 'enabled', !methods.paypal.enabled)}
                  className={`relative inline-flex shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    methods.paypal.enabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white dark:bg-gray-800 dark:bg-gray-800 shadow transform ring-0 transition ease-in-out duration-200 ${methods.paypal.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            {methods.paypal.enabled && (
              <div className="space-y-4 animate-fadeIn">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mode</label>
                  <select
                    value={methods.paypal.mode}
                    onChange={(e) => updateMethod('paypal', 'mode', e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="sandbox">Sandbox</option>
                    <option value="live">Live</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Client ID</label>
                  <input
                    type="text"
                    value={methods.paypal.clientId}
                    onChange={(e) => updateMethod('paypal', 'clientId', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Client Secret</label>
                  <input
                    type="password"
                    value={methods.paypal.clientSecret}
                    onChange={(e) => updateMethod('paypal', 'clientSecret', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* International Transfers */}
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow sm:rounded-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center mb-4">
              <Globe className="h-5 w-5 mr-2 text-green-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white">International Transfers</h3>
            </div>
            
            <div className="space-y-6">
              {/* Wise */}
              <div className="border-b border-gray-200 dark:border-gray-700 dark:border-gray-700 pb-6 last:border-0 last:pb-0">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white dark:text-white">Wise (formerly TransferWise)</h4>
                  <button
                    onClick={() => updateMethod('wise', 'enabled', !methods.wise.enabled)}
                    className={`relative inline-flex shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                      methods.wise.enabled ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white dark:bg-gray-800 dark:bg-gray-800 shadow transform ring-0 transition ease-in-out duration-200 ${methods.wise.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
                {methods.wise.enabled && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Account Details</label>
                      <textarea
                        rows={3}
                        value={methods.wise.accountDetails}
                        onChange={(e) => updateMethod('wise', 'accountDetails', e.target.value)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                        placeholder="Email, Account Number, Sort Code..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Instructions for Client</label>
                      <textarea
                        rows={2}
                        value={methods.wise.instructions}
                        onChange={(e) => updateMethod('wise', 'instructions', e.target.value)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Remitly */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white dark:text-white">Remitly</h4>
                  <button
                    onClick={() => updateMethod('remitly', 'enabled', !methods.remitly.enabled)}
                    className={`relative inline-flex shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                      methods.remitly.enabled ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white dark:bg-gray-800 dark:bg-gray-800 shadow transform ring-0 transition ease-in-out duration-200 ${methods.remitly.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
                {methods.remitly.enabled && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Account Details</label>
                      <textarea
                        rows={3}
                        value={methods.remitly.accountDetails}
                        onChange={(e) => updateMethod('remitly', 'accountDetails', e.target.value)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                        placeholder="Name, Phone Number, Bank Details..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Instructions for Client</label>
                      <textarea
                        rows={2}
                        value={methods.remitly.instructions}
                        onChange={(e) => updateMethod('remitly', 'instructions', e.target.value)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Offline Methods */}
        <div className="space-y-6">

          {/* Direct Bank Transfer */}
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow sm:rounded-lg p-6 border-l-4 border-gray-500">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Building2 className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400 dark:text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white">Direct Bank Transfer</h3>
              </div>
              <div className="flex items-center">
                <span className="mr-3 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">{methods.bankTransfer.enabled ? 'Enabled' : 'Disabled'}</span>
                <button
                  onClick={() => updateMethod('bankTransfer', 'enabled', !methods.bankTransfer.enabled)}
                  className={`relative inline-flex shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${
                    methods.bankTransfer.enabled ? 'bg-gray-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white dark:bg-gray-800 dark:bg-gray-800 shadow transform ring-0 transition ease-in-out duration-200 ${methods.bankTransfer.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            {methods.bankTransfer.enabled && (
              <div className="space-y-4 animate-fadeIn">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                  <input
                    type="text"
                    value={methods.bankTransfer.bankName}
                    onChange={(e) => updateMethod('bankTransfer', 'bankName', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Account Number</label>
                  <input
                    type="text"
                    value={methods.bankTransfer.accountNumber}
                    onChange={(e) => updateMethod('bankTransfer', 'accountNumber', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">CLABE / IBAN</label>
                  <input
                    type="text"
                    value={methods.bankTransfer.clabe}
                    onChange={(e) => updateMethod('bankTransfer', 'clabe', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Beneficiary Name</label>
                  <input
                    type="text"
                    value={methods.bankTransfer.beneficiary}
                    onChange={(e) => updateMethod('bankTransfer', 'beneficiary', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">SWIFT / BIC Code (Optional)</label>
                  <input
                    type="text"
                    value={methods.bankTransfer.swiftCode}
                    onChange={(e) => updateMethod('bankTransfer', 'swiftCode', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Cash Payments */}
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow sm:rounded-lg p-6 border-l-4 border-yellow-500">
            <div className="flex items-center mb-4">
              <Banknote className="h-5 w-5 mr-2 text-yellow-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white">Cash Payments</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-6">
                <div className="flex items-center">
                  <input
                    id="cash-mxn"
                    type="checkbox"
                    checked={methods.cash.mxnEnabled}
                    onChange={(e) => updateMethod('cash', 'mxnEnabled', e.target.checked)}
                    className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                  />
                  <label htmlFor="cash-mxn" className="ml-2 block text-sm text-gray-900 dark:text-white dark:text-white">
                    Accept MXN
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="cash-usd"
                    type="checkbox"
                    checked={methods.cash.usdEnabled}
                    onChange={(e) => updateMethod('cash', 'usdEnabled', e.target.checked)}
                    className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                  />
                  <label htmlFor="cash-usd" className="ml-2 block text-sm text-gray-900 dark:text-white dark:text-white">
                    Accept USD
                  </label>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Instructions for Client</label>
                <textarea
                  rows={2}
                  value={methods.cash.instructions}
                  onChange={(e) => updateMethod('cash', 'instructions', e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                  placeholder="e.g. Cash payments accepted at our office..."
                />
              </div>

              <div className="rounded-md bg-yellow-50 p-4">
                <div className="flex">
                  <div className="shrink-0">
                    <AlertCircle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Important Note</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        Cash payments must be manually recorded in the system by an administrator. 
                        Receipts should be generated only after funds are received.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
