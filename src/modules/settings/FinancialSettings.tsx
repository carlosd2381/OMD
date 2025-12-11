import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, DollarSign, FileText, Building2, Calculator } from 'lucide-react';
import toast from 'react-hot-toast';
import { settingsService } from '../../services/settingsService';

export default function FinancialSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [settings, setSettings] = useState({
    currency: 'MXN',
    taxes: {
      iva: 16,
      iva_retenido: 0,
      isr: 0,
      isr_retenido: 0,
    },
    prefixes: {
      invoice: 'INV',
      quote: 'QTE',
      contract: 'CON',
      questionnaire: 'QST',
    },
    fiscalYear: {
      startMonth: 'january',
      endMonth: 'december',
    },
    companyDetails: {
      legalName: '',
      taxId: '',
      address: '',
      email: '',
    }
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await settingsService.getFinancialSettings();
      if (data) {
        let extraConfig: any = {};
        try {
          if (data.invoice_sequence_prefix && data.invoice_sequence_prefix.startsWith('{')) {
            extraConfig = JSON.parse(data.invoice_sequence_prefix);
          } else if (data.invoice_sequence_prefix) {
             // Legacy or simple string support
             extraConfig = { prefixes: { invoice: data.invoice_sequence_prefix } };
          }
        } catch (e) {
          console.warn('Failed to parse invoice_sequence_prefix as JSON', e);
        }

        setSettings({
          currency: data.currency || 'MXN',
          taxes: {
            iva: data.tax_rate || 16,
            iva_retenido: extraConfig.taxes?.iva_retenido || 0,
            isr: extraConfig.taxes?.isr || 0,
            isr_retenido: extraConfig.taxes?.isr_retenido || 0,
          },
          prefixes: {
            invoice: extraConfig.prefixes?.invoice || (data.invoice_sequence_prefix?.startsWith('{') ? 'INV' : data.invoice_sequence_prefix) || 'INV',
            quote: extraConfig.prefixes?.quote || 'QTE',
            contract: extraConfig.prefixes?.contract || 'CON',
            questionnaire: extraConfig.prefixes?.questionnaire || 'QST',
          },
          fiscalYear: extraConfig.fiscalYear || { startMonth: 'january', endMonth: 'december' },
          companyDetails: extraConfig.companyDetails || { legalName: '', taxId: '', address: '', email: '' },
        });
      }
    } catch (error) {
      console.error('Error loading financial settings:', error);
      toast.error('Failed to load financial settings');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Pack extras into invoice_sequence_prefix
      const packedConfig = JSON.stringify({
        taxes: settings.taxes,
        prefixes: settings.prefixes,
        fiscalYear: settings.fiscalYear,
        companyDetails: settings.companyDetails
      });

      await settingsService.updateFinancialSettings({
        currency: settings.currency as any,
        tax_rate: settings.taxes.iva,
        invoice_sequence_prefix: packedConfig,
      });
      toast.success('Financial settings saved successfully');
    } catch (error) {
      console.error('Error saving financial settings:', error);
      toast.error('Failed to save financial settings');
    } finally {
      setLoading(false);
    }
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
            <h2 className="text-2xl font-bold text-gray-900">Financial Settings</h2>
            <p className="text-sm text-gray-500">Manage currency, taxes, and billing details.</p>
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
        
        {/* Left Column */}
        <div className="space-y-6">
          
          {/* Currency & Fiscal Year */}
          <div className="bg-white shadow sm:rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-gray-400" />
              General Financials
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Base Currency</label>
                <select
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md"
                >
                  <option value="MXN">Mexican Peso (MXN)</option>
                  <option value="USD">US Dollar (USD)</option>
                  <option value="CAD">Canadian Dollar (CAD)</option>
                  <option value="EUR">Euro (EUR)</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">Default currency for reporting and new quotes.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fiscal Year Start</label>
                  <select
                    value={settings.fiscalYear.startMonth}
                    onChange={(e) => setSettings({
                      ...settings,
                      fiscalYear: { ...settings.fiscalYear, startMonth: e.target.value }
                    })}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md"
                  >
                    {['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'].map(month => (
                      <option key={month} value={month}>{month.charAt(0).toUpperCase() + month.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fiscal Year End</label>
                  <select
                    value={settings.fiscalYear.endMonth}
                    onChange={(e) => setSettings({
                      ...settings,
                      fiscalYear: { ...settings.fiscalYear, endMonth: e.target.value }
                    })}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md"
                  >
                    {['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'].map(month => (
                      <option key={month} value={month}>{month.charAt(0).toUpperCase() + month.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Tax Settings */}
          <div className="bg-white shadow sm:rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Calculator className="h-5 w-5 mr-2 text-gray-400" />
              Tax Configuration (%)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">IVA</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.taxes.iva}
                    onChange={(e) => setSettings({
                      ...settings,
                      taxes: { ...settings.taxes, iva: parseFloat(e.target.value) }
                    })}
                    className="focus:ring-pink-500 focus:border-pink-500 block w-full pr-8 sm:text-sm border-gray-300 rounded-md"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">%</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">IVA Retenido</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.taxes.iva_retenido}
                    onChange={(e) => setSettings({
                      ...settings,
                      taxes: { ...settings.taxes, iva_retenido: parseFloat(e.target.value) }
                    })}
                    className="focus:ring-pink-500 focus:border-pink-500 block w-full pr-8 sm:text-sm border-gray-300 rounded-md"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">%</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">ISR</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.taxes.isr}
                    onChange={(e) => setSettings({
                      ...settings,
                      taxes: { ...settings.taxes, isr: parseFloat(e.target.value) }
                    })}
                    className="focus:ring-pink-500 focus:border-pink-500 block w-full pr-8 sm:text-sm border-gray-300 rounded-md"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">%</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">ISR Retenido</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.taxes.isr_retenido}
                    onChange={(e) => setSettings({
                      ...settings,
                      taxes: { ...settings.taxes, isr_retenido: parseFloat(e.target.value) }
                    })}
                    className="focus:ring-pink-500 focus:border-pink-500 block w-full pr-8 sm:text-sm border-gray-300 rounded-md"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div className="space-y-6">

          {/* Document Sequencing */}
          <div className="bg-white shadow sm:rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-gray-400" />
              Document Sequencing
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Documents follow the format: <span className="font-mono bg-gray-100 px-1 rounded">PREFIX-YYMMDD-EVENT#-DOC#</span>
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Invoice Prefix</label>
                <input
                  type="text"
                  value={settings.prefixes.invoice}
                  onChange={(e) => setSettings({
                    ...settings,
                    prefixes: { ...settings.prefixes, invoice: e.target.value.toUpperCase() }
                  })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm uppercase"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Quote Prefix</label>
                <input
                  type="text"
                  value={settings.prefixes.quote}
                  onChange={(e) => setSettings({
                    ...settings,
                    prefixes: { ...settings.prefixes, quote: e.target.value.toUpperCase() }
                  })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm uppercase"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Contract Prefix</label>
                <input
                  type="text"
                  value={settings.prefixes.contract}
                  onChange={(e) => setSettings({
                    ...settings,
                    prefixes: { ...settings.prefixes, contract: e.target.value.toUpperCase() }
                  })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm uppercase"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Questionnaire Prefix</label>
                <input
                  type="text"
                  value={settings.prefixes.questionnaire}
                  onChange={(e) => setSettings({
                    ...settings,
                    prefixes: { ...settings.prefixes, questionnaire: e.target.value.toUpperCase() }
                  })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm uppercase"
                />
              </div>
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p className="text-xs text-gray-500">Example Invoice ID:</p>
              <p className="text-sm font-mono font-medium text-gray-900 mt-1">
                {settings.prefixes.invoice}-260302-02-01
              </p>
            </div>
          </div>

          {/* Company Billing Details */}
          <div className="bg-white shadow sm:rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Building2 className="h-5 w-5 mr-2 text-gray-400" />
              Company Billing Details
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Legal Name</label>
                <input
                  type="text"
                  value={settings.companyDetails.legalName}
                  onChange={(e) => setSettings({
                    ...settings,
                    companyDetails: { ...settings.companyDetails, legalName: e.target.value }
                  })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tax ID (RFC)</label>
                <input
                  type="text"
                  value={settings.companyDetails.taxId}
                  onChange={(e) => setSettings({
                    ...settings,
                    companyDetails: { ...settings.companyDetails, taxId: e.target.value }
                  })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Billing Address</label>
                <textarea
                  rows={3}
                  value={settings.companyDetails.address}
                  onChange={(e) => setSettings({
                    ...settings,
                    companyDetails: { ...settings.companyDetails, address: e.target.value }
                  })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Billing Email</label>
                <input
                  type="email"
                  value={settings.companyDetails.email}
                  onChange={(e) => setSettings({
                    ...settings,
                    companyDetails: { ...settings.companyDetails, email: e.target.value }
                  })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
