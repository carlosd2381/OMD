import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, CheckSquare, PenTool, DollarSign, Star, Layout, Lock } from 'lucide-react';
import { portalService } from '../../services/portalService';
import type { Quote } from '../../types/quote';
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
      const data = await portalService.getPortalStatus(id);
      setQuote(data.quote);
      setQuestionnaire(data.questionnaire);
      setContract(data.contract);
      setInvoice(data.invoice);
      // setReview(data.review);
    } catch (error) {
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
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Your Quote</h3>
                  {quote ? (
                    <div className="border rounded-md p-4">
                      <div className="flex justify-between mb-4">
                        <span className="font-medium">Total Amount:</span>
                        <span className="text-xl font-bold">${quote.total_amount}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          quote.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          Status: {quote.status.toUpperCase()}
                        </span>
                        {quote.status !== 'accepted' && (
                          <button
                            onClick={handleAcceptQuote}
                            className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700"
                          >
                            Accept Quote
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">No quote available.</p>
                  )}
                </div>
              )}

              {activeTab === 'questionnaires' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Event Questionnaire</h3>
                  {questionnaire ? (
                    <div className="border rounded-md p-4">
                      <p className="mb-4">{questionnaire.title}</p>
                      <div className="flex justify-between items-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          questionnaire.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          Status: {questionnaire.status.toUpperCase()}
                        </span>
                        {questionnaire.status !== 'completed' && (
                          <button
                            onClick={handleCompleteQuestionnaire}
                            className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700"
                          >
                            Submit Questionnaire
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">No questionnaire assigned.</p>
                  )}
                </div>
              )}

              {activeTab === 'contracts' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Service Contract</h3>
                  {contract ? (
                    <div className="border rounded-md p-4">
                      <div className="bg-gray-50 p-4 mb-4 rounded text-sm font-mono">
                        {contract.content}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          contract.status === 'signed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          Status: {contract.status.toUpperCase()}
                        </span>
                        {contract.status !== 'signed' && (
                          <button
                            onClick={handleSignContract}
                            className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700"
                          >
                            Sign Contract
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">No contract generated yet.</p>
                  )}
                </div>
              )}

              {activeTab === 'invoices' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Invoices</h3>
                  {invoice ? (
                    <div className="border rounded-md p-4">
                      <div className="flex justify-between mb-2">
                        <span>Invoice #{invoice.invoice_number}</span>
                        <span className="font-bold">${invoice.total_amount}</span>
                      </div>
                      <div className="flex justify-between items-center mt-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          Status: {invoice.status.toUpperCase()}
                        </span>
                        {invoice.status !== 'paid' && (
                          <button
                            onClick={handlePayInvoice}
                            className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700"
                          >
                            Pay Now
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">No invoices available.</p>
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
