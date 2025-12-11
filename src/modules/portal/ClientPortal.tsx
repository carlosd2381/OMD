import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, CheckSquare, PenTool, DollarSign, Star, Layout, Lock, Download, ClipboardList, CreditCard, CheckCircle, ArrowRight } from 'lucide-react';
import { portalService } from '../../services/portalService';
import { clientService } from '../../services/clientService';
import { settingsService, type BrandingSettings } from '../../services/settingsService';
import { pdf } from '@react-pdf/renderer';
import { QuotePDF } from '../quotes/QuotePDF';
import type { Quote } from '../../types/quote';
import type { Client } from '../../types/client';
import type { Questionnaire } from '../../types/questionnaire';
import type { Contract } from '../../types/contract';
import type { Invoice } from '../../types/invoice';
// import type { Review } from '../../types/review';
import toast from 'react-hot-toast';

type PortalTab = 'overview' | 'quotes' | 'questionnaires' | 'contracts' | 'invoices' | 'reviews';

export default function ClientPortal() {
  const { clientId } = useParams<{ clientId: string }>(); // Assuming route /portal/:clientId
  const [activeTab, setActiveTab] = useState<PortalTab>('overview');
  const [loading, setLoading] = useState(true);
  
  const [client, setClient] = useState<Client | null>(null);
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [quotePrefix, setQuotePrefix] = useState('QTE');

  const [quote, setQuote] = useState<Quote | undefined>();
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | undefined>();
  const [contract, setContract] = useState<Contract | undefined>();
  const [invoice, setInvoice] = useState<Invoice | undefined>();
  // const [review, setReview] = useState<Review | undefined>();

  // Mock event status for the last step
  const [eventStatus, setEventStatus] = useState<'upcoming' | 'completed'>('upcoming');

  useEffect(() => {
    if (clientId) {
      loadPortalData(clientId);
    }
  }, [clientId]);

  const loadPortalData = async (id: string) => {
    try {
      const [portalData, clientData, brandingData, financialSettings] = await Promise.all([
        portalService.getPortalStatus(id),
        clientService.getClient(id),
        settingsService.getBrandingSettings(),
        settingsService.getFinancialSettings(),
      ]);

      setQuote(portalData.quote);
      setQuestionnaire(portalData.questionnaire);
      setContract(portalData.contract);
      setInvoice(portalData.invoice);
      // setReview(portalData.review);
      
      setClient(clientData);
      setBranding(brandingData);
      if (financialSettings?.quote_sequence_prefix) {
        setQuotePrefix(financialSettings.quote_sequence_prefix);
      }
    } catch (error) {
      console.error('Error loading portal data:', error);
      toast.error('Failed to load portal data');
    } finally {
      setLoading(false);
    }
  };

  // Logic to determine if a tab is locked
  const isTabLocked = (tab: PortalTab) => {
    if (tab === 'overview') return false;
    if (tab === 'quotes') return false; // Always accessible if they have access to portal
    
    if (tab === 'questionnaires') {
      return quote?.status !== 'accepted';
    }
    
    if (tab === 'contracts') {
      return questionnaire?.status !== 'completed';
    }
    
    if (tab === 'invoices') {
      return contract?.status !== 'signed';
    }
    
    if (tab === 'reviews') {
      return eventStatus !== 'completed';
    }
    
    return true;
  };

  // Simulation handlers
  const handleDownloadQuote = async () => {
    if (!quote || !client) return;

    const subtotal = quote.items.reduce((sum, item) => sum + item.total, 0);
    const tax = quote.total_amount - subtotal;
    
    // Generate quote number
    const date = new Date(quote.created_at);
    const dateStr = `${date.getFullYear().toString().substr(-2)}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const quoteNumber = `${quotePrefix}-${dateStr}-001`;

    try {
      const blob = await pdf(
        <QuotePDF
          quote={quote}
          client={client}
          branding={branding}
          items={quote.items}
          totals={{
            subtotal,
            tax,
            total: quote.total_amount
          }}
          quoteNumber={quoteNumber}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Quote_${quoteNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Quote PDF downloaded');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handleAcceptQuote = async () => {
    if (!quote) return;
    await portalService.acceptQuote(quote.id);
    toast.success('Quote Accepted!');
    loadPortalData(clientId!);
  };

  const handleCompleteQuestionnaire = async () => {
    if (!questionnaire) return;
    await portalService.completeQuestionnaire(questionnaire.id);
    toast.success('Questionnaire Submitted!');
    loadPortalData(clientId!);
  };

  const handleSignContract = async () => {
    if (!contract) return;
    await portalService.signContract(contract.id);
    toast.success('Contract Signed!');
    loadPortalData(clientId!);
  };

  const handlePayInvoice = async () => {
    if (!invoice) return;
    await portalService.payInvoice(invoice.id);
    toast.success('Invoice Paid!');
    loadPortalData(clientId!);
  };

  const handleCompleteEvent = () => {
    setEventStatus('completed');
    toast.success('Event Marked as Completed (Demo)');
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading Portal...</div>;

  const tabs: { id: PortalTab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: Layout },
    { id: 'quotes', label: 'Quotes', icon: DollarSign },
    { id: 'questionnaires', label: 'Questionnaires', icon: CheckSquare },
    { id: 'contracts', label: 'Contracts', icon: PenTool },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'reviews', label: 'Reviews', icon: Star },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Client Portal</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-5">
          <aside className="py-6 px-2 sm:px-6 lg:py-0 lg:px-0 lg:col-span-3">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const locked = isTabLocked(tab.id);
                return (
                  <button
                    key={tab.id}
                    onClick={() => !locked && setActiveTab(tab.id)}
                    disabled={locked}
                    className={`${
                      activeTab === tab.id
                        ? 'bg-pink-50 text-pink-700 hover:text-pink-700 hover:bg-pink-50'
                        : locked
                        ? 'text-gray-400 cursor-not-allowed opacity-60'
                        : 'text-gray-900 hover:text-gray-900 hover:bg-gray-50'
                    } group rounded-md px-3 py-2 flex items-center text-sm font-medium w-full`}
                  >
                    <tab.icon
                      className={`${
                        activeTab === tab.id ? 'text-pink-500' : 'text-gray-400'
                      } shrink-0 -ml-1 mr-3 h-6 w-6`}
                    />
                    <span className="truncate">{tab.label}</span>
                    {locked && <Lock className="ml-auto h-4 w-4 text-gray-400" />}
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="space-y-6 sm:px-6 lg:px-0 lg:col-span-9">
            <div className="bg-white shadow sm:rounded-lg p-6">
              {activeTab === 'overview' && (
                <div className="text-center py-10">
                  <h2 className="text-2xl font-bold text-gray-900">Welcome to your Event Portal</h2>
                  <p className="mt-2 text-gray-500">Track your planning progress, view documents, and manage payments.</p>
                  <div className="mt-8 flex justify-center space-x-4">
                    <div className="text-center">
                      <div className={`rounded-full p-3 ${quote?.status === 'accepted' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                        <DollarSign className="h-6 w-6" />
                      </div>
                      <span className="text-xs mt-1 block">Quote</span>
                    </div>
                    <div className="w-8 border-t-2 border-gray-200 mt-6"></div>
                    <div className="text-center">
                      <div className={`rounded-full p-3 ${questionnaire?.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                        <CheckSquare className="h-6 w-6" />
                      </div>
                      <span className="text-xs mt-1 block">Details</span>
                    </div>
                    <div className="w-8 border-t-2 border-gray-200 mt-6"></div>
                    <div className="text-center">
                      <div className={`rounded-full p-3 ${contract?.status === 'signed' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                        <PenTool className="h-6 w-6" />
                      </div>
                      <span className="text-xs mt-1 block">Contract</span>
                    </div>
                    <div className="w-8 border-t-2 border-gray-200 mt-6"></div>
                    <div className="text-center">
                      <div className={`rounded-full p-3 ${invoice?.status === 'paid' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                        <FileText className="h-6 w-6" />
                      </div>
                      <span className="text-xs mt-1 block">Invoice</span>
                    </div>
                  </div>
                  
                  {/* Demo Control */}
                  <div className="mt-12 border-t pt-6">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-4">Demo Controls</p>
                    <button 
                      onClick={handleCompleteEvent}
                      className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
                    >
                      Simulate Event Completion
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'quotes' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-medium text-gray-900">Your Quote</h3>
                    <div className="flex space-x-3">
                      {quote && (
                        <button
                          onClick={handleDownloadQuote}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </button>
                      )}
                      {quote && quote.status !== 'accepted' && (
                        <button
                          onClick={handleAcceptQuote}
                          className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700 shadow-sm text-sm font-medium"
                        >
                          Accept Quote
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {quote ? (
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                      {/* Header */}
                      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                        <div>
                          <span className="text-sm text-gray-500 block">Total Amount</span>
                          <span className="text-2xl font-bold text-gray-900">
                            ${quote.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {quote.currency}
                          </span>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                          quote.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {quote.status}
                        </span>
                      </div>

                      {/* Line Items */}
                      <div className="px-6 py-6">
                        <h4 className="text-sm font-medium text-gray-900 mb-4 uppercase tracking-wider">Line Items</h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                              <tr>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {quote.items.map((item, index) => (
                                <tr key={index}>
                                  <td className="px-3 py-4 text-sm text-gray-900">{item.description}</td>
                                  <td className="px-3 py-4 text-sm text-gray-500 text-right">{item.quantity}</td>
                                  <td className="px-3 py-4 text-sm text-gray-500 text-right">
                                    ${item.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-3 py-4 text-sm font-medium text-gray-900 text-right">
                                    ${item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-gray-50">
                              <tr>
                                <td colSpan={3} className="px-3 py-2 text-sm font-medium text-gray-500 text-right pt-4">Subtotal:</td>
                                <td className="px-3 py-2 text-sm text-gray-900 text-right pt-4">
                                  ${quote.items.reduce((sum, item) => sum + item.total, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                              
                              {quote.taxes && quote.taxes.length > 0 ? (
                                quote.taxes.map((tax, index) => (
                                  <tr key={index}>
                                    <td colSpan={3} className="px-3 py-2 text-sm font-medium text-gray-500 text-right">
                                      {tax.name} ({tax.rate}%):
                                    </td>
                                    <td className={`px-3 py-2 text-sm text-right ${tax.is_retention ? 'text-red-600' : 'text-gray-900'}`}>
                                      {tax.is_retention ? '-' : ''}${tax.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                // Fallback for legacy quotes without detailed tax info
                                (quote.total_amount - quote.items.reduce((sum, item) => sum + item.total, 0)) > 0 && (
                                  <tr>
                                    <td colSpan={3} className="px-3 py-2 text-sm font-medium text-gray-500 text-right">Tax:</td>
                                    <td className="px-3 py-2 text-sm text-gray-900 text-right">
                                      ${(quote.total_amount - quote.items.reduce((sum, item) => sum + item.total, 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                )
                              )}

                              <tr>
                                <td colSpan={3} className="px-3 py-4 text-sm font-bold text-gray-900 text-right border-t border-gray-200">Total:</td>
                                <td className="px-3 py-4 text-sm font-bold text-gray-900 text-right border-t border-gray-200">
                                  ${quote.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-white rounded-lg border border-gray-200 border-dashed">
                      <DollarSign className="mx-auto h-12 w-12 text-gray-300" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No quote available</h3>
                      <p className="mt-1 text-sm text-gray-500">There are no active quotes for your event at this time.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'questionnaires' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Event Questionnaire</h3>
                  </div>

                  {questionnaire ? (
                    <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                      <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">{questionnaire.title}</h4>
                          <p className="text-sm text-gray-500 mt-1">Please complete this form to help us plan your event.</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                          questionnaire.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {questionnaire.status}
                        </span>
                      </div>
                      
                      <div className="p-8 text-center">
                        <div className="mx-auto h-24 w-24 bg-pink-50 rounded-full flex items-center justify-center mb-4">
                          <ClipboardList className="h-12 w-12 text-pink-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          {questionnaire.status === 'completed' ? 'Thank You!' : 'Action Required'}
                        </h3>
                        <p className="text-gray-500 max-w-md mx-auto mb-6">
                          {questionnaire.status === 'completed' 
                            ? 'You have successfully submitted this questionnaire. We will review your answers shortly.' 
                            : 'We need a few more details about your event. Please take a moment to fill out this questionnaire.'}
                        </p>
                        
                        {questionnaire.status !== 'completed' ? (
                          <button
                            onClick={handleCompleteQuestionnaire}
                            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                          >
                            Start Questionnaire
                            <ArrowRight className="ml-2 h-5 w-5" />
                          </button>
                        ) : (
                          <button
                            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                          >
                            View Responses
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No questionnaire</h3>
                      <p className="mt-1 text-sm text-gray-500">There are no questionnaires assigned to this event yet.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'contracts' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Service Contract</h3>
                    {contract && (
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                        contract.status === 'signed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {contract.status}
                      </span>
                    )}
                  </div>
                  
                  {contract ? (
                    <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                      {/* Contract Header */}
                      <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                        <div>
                          <p className="text-sm text-gray-500">Contract ID</p>
                          <p className="font-mono text-sm font-medium">{contract.id.slice(0, 8)}</p>
                        </div>
                        {contract.signed_at && (
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Signed On</p>
                            <p className="text-sm font-medium">{new Date(contract.signed_at).toLocaleDateString()}</p>
                          </div>
                        )}
                      </div>

                      {/* Contract Content */}
                      <div className="p-8 bg-white min-h-[400px] prose max-w-none">
                        <div dangerouslySetInnerHTML={{ __html: contract.content }} />
                      </div>

                      {/* Contract Actions */}
                      <div className="bg-gray-50 px-6 py-4 border-t flex justify-end">
                        {contract.status !== 'signed' ? (
                          <button
                            onClick={handleSignContract}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Sign Contract
                          </button>
                        ) : (
                          <button
                            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                            onClick={() => window.print()}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download PDF
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <FileText className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No contract generated</h3>
                      <p className="mt-1 text-sm text-gray-500">The contract for this event hasn't been created yet.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'invoices' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Invoices</h3>
                  </div>

                  {invoice ? (
                    <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                      {/* Invoice Header */}
                      <div className="p-6 border-b flex justify-between items-start bg-gray-50">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">INVOICE</h2>
                          <p className="text-sm text-gray-500 mt-1">#{invoice.invoice_number}</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                            invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 
                            invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {invoice.status}
                          </span>
                          <p className="text-sm text-gray-500 mt-2">
                            Due Date: <span className="font-medium text-gray-900">{new Date(invoice.due_date).toLocaleDateString()}</span>
                          </p>
                        </div>
                      </div>

                      {/* Invoice Details */}
                      <div className="p-6">
                        <div className="mb-8">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Bill To</h4>
                          <div className="text-sm text-gray-900">
                            <p className="font-medium">{client?.first_name} {client?.last_name}</p>
                            <p>{client?.email}</p>
                            <p>{client?.phone}</p>
                          </div>
                        </div>

                        {/* Line Items */}
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                              <tr>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {invoice.items && invoice.items.length > 0 ? (
                                invoice.items.map((item, index) => (
                                  <tr key={index}>
                                    <td className="px-3 py-4 text-sm text-gray-900">{item.description}</td>
                                    <td className="px-3 py-4 text-sm text-gray-900 text-right">
                                      ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td className="px-3 py-4 text-sm text-gray-900">Invoice Services</td>
                                  <td className="px-3 py-4 text-sm text-gray-900 text-right">
                                    ${invoice.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                            <tfoot>
                              <tr>
                                <td className="px-3 py-4 text-sm font-bold text-gray-900 text-right">Total</td>
                                <td className="px-3 py-4 text-sm font-bold text-gray-900 text-right">
                                  ${invoice.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>

                      {/* Invoice Actions */}
                      <div className="bg-gray-50 px-6 py-4 border-t flex justify-end">
                        {invoice.status !== 'paid' ? (
                          <button
                            onClick={handlePayInvoice}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Pay Now
                          </button>
                        ) : (
                          <button
                            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                            onClick={() => window.print()}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download Receipt
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices</h3>
                      <p className="mt-1 text-sm text-gray-500">There are no invoices available for this event.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Leave a Review</h3>
                  <div className="text-center py-8">
                    <div className="flex justify-center space-x-2 mb-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className="h-8 w-8 text-yellow-400 cursor-pointer hover:scale-110 transition-transform" />
                      ))}
                    </div>
                    <textarea 
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500"
                      rows={4}
                      placeholder="Tell us about your experience..."
                    ></textarea>
                    <button className="mt-4 bg-pink-600 text-white px-6 py-2 rounded-md hover:bg-pink-700">
                      Submit Review
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
