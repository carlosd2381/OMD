import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Printer } from 'lucide-react';
import { productService } from '../../services/productService';
import { templateService } from '../../services/templateService';
import { currencyService, type CurrencyCode } from '../../services/currencyService';
import { quoteService } from '../../services/quoteService';
import type { Product } from '../../types/product';
import type { Template } from '../../types/template';
import type { QuoteItem } from '../../types/quote';
import toast from 'react-hot-toast';

export default function QuoteBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clientIdParam = searchParams.get('clientId');

  // State
  const [currency, setCurrency] = useState<CurrencyCode>('MXN');
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [questionnaireTemplates, setQuestionnaireTemplates] = useState<Template[]>([]);
  const [contractTemplates, setContractTemplates] = useState<Template[]>([]);
  const [paymentPlanTemplates, setPaymentPlanTemplates] = useState<Template[]>([]);
  
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<string>('');
  const [selectedContract, setSelectedContract] = useState<string>('');
  const [selectedPaymentPlan, setSelectedPaymentPlan] = useState<string>('');

  const [loading, setLoading] = useState(true);

  // Load Data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [prods, qTemplates, cTemplates, pTemplates] = await Promise.all([
          productService.getProducts(),
          templateService.getTemplates('questionnaire'),
          templateService.getTemplates('contract'),
          templateService.getTemplates('payment_plan'),
        ]);
        
        setProducts(prods);
        setQuestionnaireTemplates(qTemplates);
        setContractTemplates(cTemplates);
        setPaymentPlanTemplates(pTemplates);
        
        // Add default Flete item
        setItems([
          {
            id: 'flete',
            description: 'Flete (Travel, Transport & Setup Fee)',
            quantity: 1,
            unit_price: 2500, // Default mock value
            total: 2500,
          }
        ]);

      } catch (error) {
        toast.error('Failed to load builder data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Currency Handler
  useEffect(() => {
    const rate = currencyService.getRate(currency);
    setExchangeRate(rate);
  }, [currency]);

  // Calculations
  const subtotalMXN = items.reduce((sum, item) => sum + item.total, 0);
  const subtotalForeign = currencyService.convertFromMXN(subtotalMXN, currency);

  // Handlers
  const handleAddItem = (product: Product) => {
    const newItem: QuoteItem = {
      id: Math.random().toString(36).substr(2, 9),
      product_id: product.id,
      description: product.name,
      quantity: 1,
      unit_price: product.price_direct,
      total: product.price_direct,
    };
    setItems([...items, newItem]);
  };

  const handleUpdateItem = (id: string, field: keyof QuoteItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          updated.total = updated.quantity * updated.unit_price;
        }
        return updated;
      }
      return item;
    }));
  };

  const handleDeleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleSave = async () => {
    if (!clientIdParam) {
      toast.error('No client selected');
      return;
    }

    try {
      await quoteService.createQuote({
        client_id: clientIdParam,
        event_id: '1', // Mock event ID for now
        items,
        currency,
        exchange_rate: exchangeRate,
        total_amount: subtotalMXN,
        questionnaire_template_id: selectedQuestionnaire,
        contract_template_id: selectedContract,
        payment_plan_template_id: selectedPaymentPlan,
        status: 'sent',
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      });
      toast.success('Quote created successfully');
      navigate(`/clients/${clientIdParam}`);
    } catch (error) {
      toast.error('Failed to save quote');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading Builder...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <button onClick={() => navigate(-1)} className="mr-4 text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Quote Generator</h1>
          </div>
          <div className="flex space-x-3">
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <Printer className="h-4 w-4 mr-2" /> Print / PDF
            </button>
            <button 
              onClick={handleSave}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700"
            >
              <Save className="h-4 w-4 mr-2" /> Save Quote
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Settings & Products */}
          <div className="space-y-6">
            
            {/* Currency Selector */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Currency</h3>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md"
              >
                <option value="MXN">MXN - Mexican Peso</option>
                <option value="USD">USD - US Dollar</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="EUR">EUR - Euro</option>
                <option value="CAD">CAD - Canadian Dollar</option>
              </select>
              {currency !== 'MXN' && (
                <p className="mt-2 text-sm text-gray-500">
                  Exchange Rate: 1 {currency} = ${exchangeRate.toFixed(2)} MXN
                </p>
              )}
            </div>

            {/* Templates */}
            <div className="bg-white shadow rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Templates</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Questionnaire</label>
                <select
                  value={selectedQuestionnaire}
                  onChange={(e) => setSelectedQuestionnaire(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md"
                >
                  <option value="">Select a questionnaire...</option>
                  {questionnaireTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Contract</label>
                <select
                  value={selectedContract}
                  onChange={(e) => setSelectedContract(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md"
                >
                  <option value="">Select a contract...</option>
                  {contractTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Plan</label>
                <select
                  value={selectedPaymentPlan}
                  onChange={(e) => setSelectedPaymentPlan(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md"
                >
                  <option value="">Select a payment plan...</option>
                  {paymentPlanTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Product Selector */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Products</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {products.map(product => (
                  <button
                    key={product.id}
                    onClick={() => handleAddItem(product)}
                    className="w-full text-left px-4 py-3 border border-gray-200 rounded-md hover:bg-gray-50 flex justify-between items-center group"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{product.name}</p>
                      <p className="text-xs text-gray-500">${product.price_direct.toLocaleString()} MXN</p>
                    </div>
                    <Plus className="h-5 w-5 text-gray-400 group-hover:text-pink-500" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Quote Items */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Line Items</h3>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/2">Description</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price (MXN)</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total (MXN)</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-3 py-4">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                            />
                          </td>
                          <td className="px-3 py-4">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(item.id, 'quantity', parseInt(e.target.value))}
                              className="block w-20 ml-auto border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm text-right"
                            />
                          </td>
                          <td className="px-3 py-4">
                            <input
                              type="number"
                              value={item.unit_price}
                              onChange={(e) => handleUpdateItem(item.id, 'unit_price', parseFloat(e.target.value))}
                              className="block w-32 ml-auto border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm text-right"
                            />
                          </td>
                          <td className="px-3 py-4 text-right text-sm text-gray-900 font-medium">
                            ${item.total.toLocaleString()}
                          </td>
                          <td className="px-3 py-4 text-right">
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-red-400 hover:text-red-600"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={3} className="px-6 py-4 text-right text-sm font-medium text-gray-900">Total (MXN):</td>
                        <td className="px-3 py-4 text-right text-sm font-bold text-gray-900">${subtotalMXN.toLocaleString()}</td>
                        <td></td>
                      </tr>
                      {currency !== 'MXN' && (
                        <tr>
                          <td colSpan={3} className="px-6 py-4 text-right text-sm font-medium text-gray-500">Total ({currency}):</td>
                          <td className="px-3 py-4 text-right text-sm font-bold text-gray-900">
                            {subtotalForeign.toLocaleString(undefined, { style: 'currency', currency: currency })}
                          </td>
                          <td></td>
                        </tr>
                      )}
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
