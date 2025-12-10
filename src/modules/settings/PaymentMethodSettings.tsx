import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Globe, Building2, Banknote, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PaymentMethodSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Mock state
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

  const handleSave = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Payment methods saved successfully');
    setLoading(false);
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
            <ArrowLeft className="h-6 w-6 text-gray-500" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Payment Methods</h2>
            <p className="text-sm text-gray-500">Configure how you accept payments from clients.</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        
        {/* Left Column: Online Processing */}
        <div className="space-y-6">
          
          {/* Stripe */}
          <div className="bg-white shadow sm:rounded-lg p-6 border-l-4 border-indigo-500">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2 text-indigo-500" />
                <h3 className="text-lg font-medium text-gray-900">Stripe</h3>
              </div>
              <div className="flex items-center">
                <span className="mr-3 text-sm text-gray-500">{methods.stripe.enabled ? 'Enabled' : 'Disabled'}</span>
                <button
                  onClick={() => updateMethod('stripe', 'enabled', !methods.stripe.enabled)}
                  className={`relative inline-flex shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                    methods.stripe.enabled ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${methods.stripe.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
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
          <div className="bg-white shadow sm:rounded-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2 text-blue-500" />
                <h3 className="text-lg font-medium text-gray-900">PayPal</h3>
              </div>
              <div className="flex items-center">
                <span className="mr-3 text-sm text-gray-500">{methods.paypal.enabled ? 'Enabled' : 'Disabled'}</span>
                <button
                  onClick={() => updateMethod('paypal', 'enabled', !methods.paypal.enabled)}
                  className={`relative inline-flex shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    methods.paypal.enabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${methods.paypal.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
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
          <div className="bg-white shadow sm:rounded-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center mb-4">
              <Globe className="h-5 w-5 mr-2 text-green-500" />
              <h3 className="text-lg font-medium text-gray-900">International Transfers</h3>
            </div>
            
            <div className="space-y-6">
              {/* Wise */}
              <div className="border-b border-gray-200 pb-6 last:border-0 last:pb-0">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-gray-900">Wise (formerly TransferWise)</h4>
                  <button
                    onClick={() => updateMethod('wise', 'enabled', !methods.wise.enabled)}
                    className={`relative inline-flex shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                      methods.wise.enabled ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${methods.wise.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
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
                  <h4 className="text-sm font-medium text-gray-900">Remitly</h4>
                  <button
                    onClick={() => updateMethod('remitly', 'enabled', !methods.remitly.enabled)}
                    className={`relative inline-flex shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                      methods.remitly.enabled ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${methods.remitly.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
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
          <div className="bg-white shadow sm:rounded-lg p-6 border-l-4 border-gray-500">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Building2 className="h-5 w-5 mr-2 text-gray-500" />
                <h3 className="text-lg font-medium text-gray-900">Direct Bank Transfer (SPEI)</h3>
              </div>
              <div className="flex items-center">
                <span className="mr-3 text-sm text-gray-500">{methods.bankTransfer.enabled ? 'Enabled' : 'Disabled'}</span>
                <button
                  onClick={() => updateMethod('bankTransfer', 'enabled', !methods.bankTransfer.enabled)}
                  className={`relative inline-flex shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${
                    methods.bankTransfer.enabled ? 'bg-gray-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${methods.bankTransfer.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            {methods.bankTransfer.enabled && (
              <div className="space-y-4 animate-fadeIn">
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
                  <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                  <input
                    type="text"
                    value={methods.bankTransfer.bankName}
                    onChange={(e) => updateMethod('bankTransfer', 'bankName', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">CLABE (18 digits)</label>
                  <input
                    type="text"
                    value={methods.bankTransfer.clabe}
                    onChange={(e) => updateMethod('bankTransfer', 'clabe', e.target.value)}
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
                  <label className="block text-sm font-medium text-gray-700">SWIFT/BIC Code (Optional)</label>
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
          <div className="bg-white shadow sm:rounded-lg p-6 border-l-4 border-yellow-500">
            <div className="flex items-center mb-4">
              <Banknote className="h-5 w-5 mr-2 text-yellow-500" />
              <h3 className="text-lg font-medium text-gray-900">Cash Payments</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Accept MXN (Pesos)</span>
                <button
                  onClick={() => updateMethod('cash', 'mxnEnabled', !methods.cash.mxnEnabled)}
                  className={`relative inline-flex shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 ${
                    methods.cash.mxnEnabled ? 'bg-yellow-500' : 'bg-gray-200'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${methods.cash.mxnEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Accept USD (Dollars)</span>
                <button
                  onClick={() => updateMethod('cash', 'usdEnabled', !methods.cash.usdEnabled)}
                  className={`relative inline-flex shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 ${
                    methods.cash.usdEnabled ? 'bg-yellow-500' : 'bg-gray-200'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${methods.cash.usdEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {(methods.cash.mxnEnabled || methods.cash.usdEnabled) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Instructions for Client</label>
                  <textarea
                    rows={2}
                    value={methods.cash.instructions}
                    onChange={(e) => updateMethod('cash', 'instructions', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                    placeholder="e.g. Pay at office Mon-Fri 9am-5pm"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="rounded-md bg-blue-50 p-4">
            <div className="flex">
              <div className="shrink-0">
                <AlertCircle className="h-5 w-5 text-blue-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Note on Payment Methods</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    Enabled payment methods will appear on client invoices and in the client portal. 
                    Ensure all API keys and account details are correct before enabling.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
