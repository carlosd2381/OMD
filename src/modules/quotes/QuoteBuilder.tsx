import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Printer, ArrowUp, ArrowDown, Send, UserPlus } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { QuotePDF } from './QuotePDF';
import { productService } from '../../services/productService';
import { templateService } from '../../services/templateService';
import { settingsService, type PaymentSchedule, type BrandingSettings } from '../../services/settingsService';
import { currencyService, type CurrencyCode } from '../../services/currencyService';
import { quoteService } from '../../services/quoteService';
import { eventService } from '../../services/eventService';
import { clientService } from '../../services/clientService';
import { plannerService } from '../../services/plannerService';
import { venueService } from '../../services/venueService';
import type { Product } from '../../types/product';
import type { Template } from '../../types/template';
import type { QuoteItem } from '../../types/quote';
import type { Event } from '../../types/event';
import type { Client } from '../../types/client';
import toast from 'react-hot-toast';

import { bookingService } from '../../services/bookingService';

export default function QuoteBuilder() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const clientIdParam = searchParams.get('clientId');

  // State
  const [clientId, setClientId] = useState<string>(clientIdParam || '');
  const [client, setClient] = useState<Client | null>(null);
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [quotePrefix, setQuotePrefix] = useState('QTE');
  const [currency, setCurrency] = useState<CurrencyCode>('MXN');
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  
  const [questionnaireTemplates, setQuestionnaireTemplates] = useState<Template[]>([]);
  const [contractTemplates, setContractTemplates] = useState<Template[]>([]);
  const [paymentPlanTemplates, setPaymentPlanTemplates] = useState<PaymentSchedule[]>([]);
  
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<string>('');
  const [selectedContract, setSelectedContract] = useState<string>('');
  const [selectedPaymentPlan, setSelectedPaymentPlan] = useState<string>('');
  const [selectedEventId, setSelectedEventId] = useState<string>('');

  // Recipient State
  interface Recipient {
    id: string;
    name: string;
    email: string;
    role: string;
    selected: boolean;
    isCustom?: boolean;
  }
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [showAddRecipient, setShowAddRecipient] = useState(false);
  const [newRecipient, setNewRecipient] = useState({ name: '', email: '', role: 'Other' });

  // Populate Recipients
  useEffect(() => {
    const fetchRecipients = async () => {
      if (!client) return;

      const newRecipients: Recipient[] = [];

      // 1. Main Client
      newRecipients.push({
        id: client.id,
        name: `${client.first_name} ${client.last_name}`,
        email: client.email,
        role: 'Client (Main)',
        selected: true // Default selected
      });

      // 2. Event Related Contacts
      if (selectedEventId) {
        const event = events.find(e => e.id === selectedEventId);
        if (event) {
          // Secondary Client
          if (event.secondary_client_id) {
            const secClient = await clientService.getClient(event.secondary_client_id);
            if (secClient) {
              newRecipients.push({
                id: secClient.id,
                name: `${secClient.first_name} ${secClient.last_name}`,
                email: secClient.email,
                role: 'Client (Secondary)',
                selected: false
              });
            }
          }

          // Planner
          if (event.planner_id) {
            const planner = await plannerService.getPlanner(event.planner_id);
            if (planner) {
              newRecipients.push({
                id: planner.id,
                name: `${planner.first_name} ${planner.last_name}`,
                email: planner.email,
                role: 'Planner',
                selected: false
              });
            }
          } else if (event.planner_name && event.planner_email) {
             newRecipients.push({
                id: 'planner-manual',
                name: event.planner_name,
                email: event.planner_email,
                role: 'Planner',
                selected: false
              });
          }

          // Venue
          if (event.venue_id) {
            const venue = await venueService.getVenue(event.venue_id);
            // Venue might not have a direct contact email on the venue object itself easily accessible 
            // without fetching contacts, but let's check if we have venue contact info on event
            if (venue && venue.email) {
               newRecipients.push({
                id: venue.id,
                name: venue.name,
                email: venue.email,
                role: 'Venue',
                selected: false
              });
            }
          }
          
          if (event.venue_contact_name && event.venue_contact_email) {
             newRecipients.push({
                id: 'venue-manual',
                name: event.venue_contact_name,
                email: event.venue_contact_email,
                role: 'Venue Contact',
                selected: false
              });
          }
        }
      }

      // Merge with existing custom recipients if any, or just set
      // For now, we'll just reset to these + keep any custom ones the user added manually in this session
      setRecipients(prev => {
        const custom = prev.filter(r => r.isCustom);
        // Deduplicate by email
        const combined = [...newRecipients, ...custom];
        const unique = combined.filter((v, i, a) => a.findIndex(t => t.email === v.email) === i);
        return unique;
      });
    };

    fetchRecipients();
  }, [client, selectedEventId, events]);

  const handleAddRecipient = () => {
    if (newRecipient.name && newRecipient.email) {
      setRecipients(prev => [
        ...prev,
        {
          id: `custom-${Date.now()}`,
          name: newRecipient.name,
          email: newRecipient.email,
          role: newRecipient.role,
          selected: true,
          isCustom: true
        }
      ]);
      setNewRecipient({ name: '', email: '', role: 'Other' });
      setShowAddRecipient(false);
    }
  };

  const handleSendQuote = async () => {
    const selectedRecipients = recipients.filter(r => r.selected);
    if (selectedRecipients.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }

    // 1. Save Quote First
    await handleSave();

    // 2. Process Recipients
    const toastId = toast.loading('Sending quote...');
    
    try {
      for (const recipient of selectedRecipients) {
        // If it's a client (Main or Secondary), ensure Portal Access
        if (recipient.role.includes('Client')) {
           // Check if we have a client ID
           if (!recipient.isCustom && recipient.id) {
             const clientData = await clientService.getClient(recipient.id);
             if (clientData && !clientData.portal_access) {
               await clientService.togglePortalAccess(recipient.id, true);
               console.log(`Enabled portal access for ${recipient.name}`);
             }
           }
        }
        
        // Mock Email Sending
        console.log(`Sending email to ${recipient.email} (${recipient.role})`);
      }
      
      toast.success(`Quote sent to ${selectedRecipients.length} recipient(s)`, { id: toastId });
    } catch (error) {
      console.error('Error sending quote:', error);
      toast.error('Failed to send quote', { id: toastId });
    }
  };

  // Tax State
  const [taxRates, setTaxRates] = useState({
    iva: 16,
    iva_retenido: 10.66666667,
    isr: 0,
    isr_retenido: 10,
  });
  const [selectedTaxes, setSelectedTaxes] = useState({
    iva: true,
    iva_retenido: false,
    isr: false,
    isr_retenido: false,
  });

  const [loading, setLoading] = useState(true);

  // Load Data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [prods, qTemplates, cTemplates, pTemplates, financialSettings, allEvents, brandingSettings] = await Promise.all([
          productService.getProducts(),
          templateService.getTemplates('questionnaire'),
          templateService.getTemplates('contract'),
          settingsService.getPaymentSchedules(),
          settingsService.getFinancialSettings(),
          eventService.getEvents(),
          settingsService.getBrandingSettings(),
        ]);
        
        setProducts(prods);
        setQuestionnaireTemplates(qTemplates);
        setContractTemplates(cTemplates);
        setPaymentPlanTemplates(pTemplates);
        setBranding(brandingSettings);

        let targetClientId = clientIdParam;

        // If editing, load quote details
        if (id) {
          const quote = await quoteService.getQuote(id);
          if (quote) {
            setItems(quote.items);
            setCurrency(quote.currency);
            setExchangeRate(quote.exchange_rate);
            setSelectedQuestionnaire(quote.questionnaire_template_id || '');
            setSelectedContract(quote.contract_template_id || '');
            setSelectedPaymentPlan(quote.payment_plan_template_id || '');
            setSelectedEventId(quote.event_id);
            setClientId(quote.client_id);
            targetClientId = quote.client_id;

            if (quote.taxes) {
              const newSelectedTaxes = { 
                iva: false, 
                iva_retenido: false, 
                isr: false, 
                isr_retenido: false 
              };
              const newTaxRates = { ...taxRates };
              
              quote.taxes.forEach(t => {
                if (t.name === 'IVA') { newSelectedTaxes.iva = true; newTaxRates.iva = t.rate; }
                if (t.name === 'IVA Retenido') { newSelectedTaxes.iva_retenido = true; newTaxRates.iva_retenido = t.rate; }
                if (t.name === 'ISR') { newSelectedTaxes.isr = true; newTaxRates.isr = t.rate; }
                if (t.name === 'ISR Retenido') { newSelectedTaxes.isr_retenido = true; newTaxRates.isr_retenido = t.rate; }
              });
              setSelectedTaxes(newSelectedTaxes);
              setTaxRates(newTaxRates);
            }
          }
        } else {
          // Add default Flete item for new quotes
          setItems([
            {
              id: 'flete',
              description: 'Flete (Travel, Transport & Setup Fee)',
              quantity: 1,
              unit_price: 2500,
              cost: 0,
              total: 2500,
            }
          ]);
        }

        // Filter events for this client
        if (targetClientId) {
          const clientEvents = allEvents.filter(e => e.client_id === targetClientId);
          setEvents(clientEvents);
          if (clientEvents.length > 0 && !id) {
            setSelectedEventId(clientEvents[0].id);
          }
          
          // Fetch Client Details
          const clientData = await clientService.getClient(targetClientId);
          setClient(clientData);
        }

        if (financialSettings) {
          if (financialSettings.quote_sequence_prefix) {
            setQuotePrefix(financialSettings.quote_sequence_prefix);
          }
          let extraConfig: any = {};
          try {
            if (financialSettings.invoice_sequence_prefix && financialSettings.invoice_sequence_prefix.startsWith('{')) {
              extraConfig = JSON.parse(financialSettings.invoice_sequence_prefix);
            }
          } catch (e) {
            console.warn('Failed to parse financial settings extra config', e);
          }
          
          setTaxRates({
            iva: financialSettings.tax_rate || 16,
            iva_retenido: extraConfig.taxes?.iva_retenido || 10.66666667,
            isr: extraConfig.taxes?.isr || 0,
            isr_retenido: extraConfig.taxes?.isr_retenido || 10,
          });
        }

      } catch (error) {
        console.error(error);
        toast.error('Failed to load builder data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, clientIdParam]);

  // Load Client Details
  useEffect(() => {
    const loadClient = async () => {
      if (clientId) {
        try {
          const data = await clientService.getClient(clientId);
          setClient(data);
        } catch (error) {
          console.error('Error loading client:', error);
          toast.error('Failed to load client details');
        }
      }
    };
    loadClient();
  }, [clientId]);

  // Currency Handler
  useEffect(() => {
    const rate = currencyService.getRate(currency);
    setExchangeRate(rate);
  }, [currency]);

  // Calculations
  const subtotalMXN = items.reduce((sum, item) => sum + item.total, 0);
  
  const ivaAmount = selectedTaxes.iva ? subtotalMXN * (taxRates.iva / 100) : 0;
  const ivaRetAmount = selectedTaxes.iva_retenido ? subtotalMXN * (taxRates.iva_retenido / 100) : 0;
  const isrAmount = selectedTaxes.isr ? subtotalMXN * (taxRates.isr / 100) : 0;
  const isrRetAmount = selectedTaxes.isr_retenido ? subtotalMXN * (taxRates.isr_retenido / 100) : 0;

  const totalMXN = subtotalMXN + ivaAmount + isrAmount - ivaRetAmount - isrRetAmount;
  const totalForeign = currencyService.convertFromMXN(totalMXN, currency);

  // Handlers
  const handleAddItem = (product: Product) => {
    const newItem: QuoteItem = {
      id: Math.random().toString(36).substr(2, 9),
      product_id: product.id,
      description: product.name,
      quantity: 1,
      unit_price: product.price_direct,
      cost: product.cost || 0,
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

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === items.length - 1) return;
    
    const newItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    setItems(newItems);
  };

  const handleDeleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handlePrint = async () => {
    if (!client) {
      toast.error('Client details not loaded');
      return;
    }
    
    try {
      const blob = await pdf(
        <QuotePDF
          quote={{
            id: id || 'DRAFT',
            client_id: clientId,
            event_id: selectedEventId,
            items,
            currency,
            exchange_rate: exchangeRate,
            total_amount: totalMXN,
            status: 'draft',
            valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }}
          client={client}
          branding={branding}
          items={items}
          totals={{
            subtotal: subtotalMXN,
            tax: ivaAmount + isrAmount - ivaRetAmount - isrRetAmount,
            total: totalMXN
          }}
          quoteNumber={`${quotePrefix}-${new Date().getFullYear().toString().substr(-2)}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-001-001`}
        />
      ).toBlob();
      
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

    const handleSave = async () => {
    if (!clientId || !selectedEventId) {
      toast.error('Please select a client and event');
      return;
    }

    try {
      // Calculate taxes to save
      const taxesToSave = [];
      if (selectedTaxes.iva) {
        taxesToSave.push({ name: 'IVA', rate: taxRates.iva, amount: ivaAmount, is_retention: false });
      }
      if (selectedTaxes.iva_retenido) {
        taxesToSave.push({ name: 'IVA Retenido', rate: taxRates.iva_retenido, amount: ivaRetAmount, is_retention: true });
      }
      if (selectedTaxes.isr) {
        taxesToSave.push({ name: 'ISR', rate: taxRates.isr, amount: isrAmount, is_retention: false });
      }
      if (selectedTaxes.isr_retenido) {
        taxesToSave.push({ name: 'ISR Retenido', rate: taxRates.isr_retenido, amount: isrRetAmount, is_retention: true });
      }

      const quoteData = {
        client_id: clientId,
        event_id: selectedEventId,
        items,
        taxes: taxesToSave,
        currency,
        exchange_rate: exchangeRate,
        total_amount: currency === 'MXN' ? totalMXN : totalForeign,
        questionnaire_template_id: selectedQuestionnaire || undefined,
        contract_template_id: selectedContract || undefined,
        payment_plan_template_id: selectedPaymentPlan || undefined,
        status: 'draft' as const,
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      let savedQuote;
      if (id) {
        savedQuote = await quoteService.updateQuote(id, quoteData);
      } else {
        savedQuote = await quoteService.createQuote(quoteData);
      }

      // Trigger Booking Document Generation
      // This will create Invoices, Contract, and Questionnaire if they don't exist
      await bookingService.generateBookingDocuments(savedQuote);

      toast.success('Quote saved & documents generated');
      navigate(`/clients/${clientId}`);
    } catch (error) {
      console.error('Error saving quote:', error);
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
            <button 
              onClick={handlePrint}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Printer className="h-4 w-4 mr-2" /> Print / PDF
            </button>
            <button 
              onClick={handleSave}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Save className="h-4 w-4 mr-2" /> Save Draft
            </button>
            <button 
              onClick={handleSendQuote}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700"
            >
              <Send className="h-4 w-4 mr-2" /> Send Quote
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          
          {/* Top Section: Quote Items (Full Width) */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Line Items</h3>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10"></th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">Description</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">COG (MXN)</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price (MXN)</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total (MXN)</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((item, index) => (
                      <tr key={item.id}>
                        <td className="px-2 py-4">
                          <div className="flex flex-col gap-1">
                            <button 
                              onClick={() => handleMoveItem(index, 'up')}
                              disabled={index === 0}
                              className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleMoveItem(index, 'down')}
                              disabled={index === items.length - 1}
                              className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
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
                            value={item.cost}
                            onChange={(e) => handleUpdateItem(item.id, 'cost', parseFloat(e.target.value))}
                            className="block w-24 ml-auto border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm text-right"
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
                        <td className="px-3 py-4 text-right text-sm text-green-600 font-medium">
                          ${(item.total - (item.cost * item.quantity)).toLocaleString()}
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
                      <td colSpan={5} className="px-6 py-2 text-right text-sm font-medium text-gray-900">Subtotal:</td>
                      <td className="px-3 py-2 text-right text-sm font-bold text-gray-900">${subtotalMXN.toLocaleString()}</td>
                      <td colSpan={2}></td>
                    </tr>
                    {selectedTaxes.iva && (
                      <tr>
                        <td colSpan={5} className="px-6 py-2 text-right text-sm font-medium text-gray-500">IVA ({taxRates.iva}%):</td>
                        <td className="px-3 py-2 text-right text-sm text-gray-900">+${ivaAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td colSpan={2}></td>
                      </tr>
                    )}
                    {selectedTaxes.iva_retenido && (
                      <tr>
                        <td colSpan={5} className="px-6 py-2 text-right text-sm font-medium text-gray-500">IVA Retenido ({taxRates.iva_retenido.toFixed(2)}%):</td>
                        <td className="px-3 py-2 text-right text-sm text-red-600">-${ivaRetAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td colSpan={2}></td>
                      </tr>
                    )}
                    {selectedTaxes.isr && (
                      <tr>
                        <td colSpan={5} className="px-6 py-2 text-right text-sm font-medium text-gray-500">ISR ({taxRates.isr}%):</td>
                        <td className="px-3 py-2 text-right text-sm text-gray-900">+${isrAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td colSpan={2}></td>
                      </tr>
                    )}
                    {selectedTaxes.isr_retenido && (
                      <tr>
                        <td colSpan={5} className="px-6 py-2 text-right text-sm font-medium text-gray-500">ISR Retenido ({taxRates.isr_retenido}%):</td>
                        <td className="px-3 py-2 text-right text-sm text-red-600">-${isrRetAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td colSpan={2}></td>
                      </tr>
                    )}
                    <tr className="border-t border-gray-200">
                      <td colSpan={5} className="px-6 py-4 text-right text-base font-bold text-gray-900">Total (MXN):</td>
                      <td className="px-3 py-4 text-right text-base font-bold text-gray-900">${totalMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td colSpan={2}></td>
                    </tr>
                    {currency !== 'MXN' && (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-right text-sm font-medium text-gray-500">Total ({currency}):</td>
                        <td className="px-3 py-4 text-right text-sm font-bold text-gray-900">
                          {totalForeign.toLocaleString(undefined, { style: 'currency', currency: currency })}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    )}
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Bottom Section: 3 Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Column 1: Add Products */}
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

            {/* Column 2: Templates */}
            <div className="bg-white shadow rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Configuration</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Event</label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md"
                >
                  <option value="">Select an event...</option>
                  {events.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({new Date(e.date).toLocaleDateString()})</option>
                  ))}
                </select>
                {events.length === 0 && (
                  <p className="mt-1 text-xs text-red-500">Client has no events. Please create one first.</p>
                )}
              </div>

              {/* Recipients Section */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Recipients</label>
                  <button
                    onClick={() => setShowAddRecipient(!showAddRecipient)}
                    className="text-xs text-pink-600 hover:text-pink-800 flex items-center"
                  >
                    <UserPlus className="h-3 w-3 mr-1" /> Add
                  </button>
                </div>
                
                <div className="space-y-2 mb-3">
                  {recipients.map((recipient) => (
                    <div key={recipient.id} className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id={`recipient-${recipient.id}`}
                          name={`recipient-${recipient.id}`}
                          type="checkbox"
                          checked={recipient.selected}
                          onChange={(e) => {
                            setRecipients(recipients.map(r => 
                              r.id === recipient.id ? { ...r, selected: e.target.checked } : r
                            ));
                          }}
                          className="focus:ring-pink-500 h-4 w-4 text-pink-600 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor={`recipient-${recipient.id}`} className="font-medium text-gray-700">
                          {recipient.name} <span className="text-gray-500 font-normal">({recipient.role})</span>
                        </label>
                        <p className="text-gray-500 text-xs">{recipient.email}</p>
                      </div>
                    </div>
                  ))}
                  {recipients.length === 0 && (
                    <p className="text-xs text-gray-500 italic">Select an event to load recipients.</p>
                  )}
                </div>

                {showAddRecipient && (
                  <div className="bg-gray-50 p-3 rounded-md space-y-2 border border-gray-200">
                    <input
                      type="text"
                      placeholder="Name"
                      value={newRecipient.name}
                      onChange={(e) => setNewRecipient({ ...newRecipient, name: e.target.value })}
                      className="block w-full text-xs border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={newRecipient.email}
                      onChange={(e) => setNewRecipient({ ...newRecipient, email: e.target.value })}
                      className="block w-full text-xs border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500"
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setShowAddRecipient(false)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddRecipient}
                        disabled={!newRecipient.name || !newRecipient.email}
                        className="text-xs bg-pink-600 text-white px-2 py-1 rounded hover:bg-pink-700 disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>

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

            {/* Column 3: Currency */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Currency & Taxes</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md"
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

                <div className="border-t border-gray-200 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tax Configuration</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedTaxes.iva}
                        onChange={(e) => setSelectedTaxes({ ...selectedTaxes, iva: e.target.checked })}
                        className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-900">IVA ({taxRates.iva}%)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedTaxes.iva_retenido}
                        onChange={(e) => setSelectedTaxes({ ...selectedTaxes, iva_retenido: e.target.checked })}
                        className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-900">IVA Retenido ({taxRates.iva_retenido.toFixed(2)}%)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedTaxes.isr}
                        onChange={(e) => setSelectedTaxes({ ...selectedTaxes, isr: e.target.checked })}
                        className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-900">ISR ({taxRates.isr}%)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedTaxes.isr_retenido}
                        onChange={(e) => setSelectedTaxes({ ...selectedTaxes, isr_retenido: e.target.checked })}
                        className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-900">ISR Retenido ({taxRates.isr_retenido}%)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
