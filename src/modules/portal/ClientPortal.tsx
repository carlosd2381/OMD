import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { FileText, CheckSquare, PenTool, DollarSign, Star, Layout, Lock, Download, ClipboardList, CreditCard, CheckCircle, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { portalService } from '../../services/portalService';
import { questionnaireService } from '../../services/questionnaireService';
import { clientService } from '../../services/clientService';
import { eventService } from '../../services/eventService';
import { venueService } from '../../services/venueService';
import { plannerService } from '../../services/plannerService';
import { settingsService, type BrandingSettings } from '../../services/settingsService';
import { tokenService } from '../../services/tokenService';
import { formatCurrency, formatDocumentID } from '../../utils/formatters';
import { currencyService } from '../../services/currencyService';
import { CONTRACT_HEADER_HTML } from '../../constants/contractTemplate';
import {
  buildContractInvoiceSchedule,
  hydrateContractContent,
  parseContractContentBlocks,
} from '../contracts/contractPdfUtils';
import { generateDocumentFingerprint } from '../../utils/fingerprint';
import { SignatureCertificate } from '../../components/SignatureCertificate';
import type { Quote } from '../../types/quote';
import type { Client } from '../../types/client';
import type { Event } from '../../types/event';
import type { Venue } from '../../types/venue';
import type { Planner } from '../../types/planner';
import type { Questionnaire } from '../../types/questionnaire';
import type { Contract, SignatureMetadata } from '../../types/contract';
import type { Invoice } from '../../types/invoice';
// import type { Review } from '../../types/review';
import toast from 'react-hot-toast';
import { useConfirm } from '../../contexts/ConfirmContext';
import { useAuth } from '../../contexts/AuthContext';
import { userService } from '../../services/userService';

type PortalTab = 'overview' | 'quotes' | 'questionnaires' | 'contracts' | 'invoices' | 'reviews';

export default function ClientPortal() {
  const { confirm } = useConfirm();
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId: string }>(); // Assuming route /portal/:clientId
  const [activeTab, setActiveTab] = useState<PortalTab>('overview');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [quoteDownloading, setQuoteDownloading] = useState(false);
  const [quoteActionLoading, setQuoteActionLoading] = useState(false);
  const [portalClientId, setPortalClientId] = useState<string | null>(null);
  const [portalError, setPortalError] = useState<string | null>(null);
  
  const [client, setClient] = useState<Client | null>(null);
  const [branding, setBranding] = useState<BrandingSettings | null>(null);

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<Questionnaire | null>(null);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [nextStepPrompt, setNextStepPrompt] = useState<{
    title: string;
    message: string;
    actionLabel: string;
    nextTab: PortalTab;
  } | null>(null);

  const [quote, setQuote] = useState<Quote | undefined>();
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | undefined>();
  const [contract, setContract] = useState<Contract | undefined>();
  const [invoice, setInvoice] = useState<Invoice | undefined>();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [planner, setPlanner] = useState<Planner | null>(null);

  // Mock event status for the last step
  const [eventStatus, setEventStatus] = useState<'upcoming' | 'completed'>('upcoming');
  const [legalName, setLegalName] = useState('');
  const [hasConfirmedAgreement, setHasConfirmedAgreement] = useState(false);
  const [isFillingQuestionnaire, setIsFillingQuestionnaire] = useState(false);
  const [contractFingerprint, setContractFingerprint] = useState('');

  const handleProceedToNextStep = () => {
    if (!nextStepPrompt) return;
    const targetTab = nextStepPrompt.nextTab;
    setNextStepPrompt(null);
    setActiveTab(targetTab);

    if (targetTab === 'questionnaires') {
      setSelectedQuote(null);
    } else if (targetTab === 'contracts') {
      setSelectedQuestionnaire(null);
      setIsFillingQuestionnaire(false);
    } else if (targetTab === 'invoices') {
      setSelectedContract(null);
    } else if (targetTab === 'overview') {
      setSelectedInvoice(null);
    }
  };

  const dismissNextStepPrompt = () => setNextStepPrompt(null);

  const quoteCurrencyHelpers = useMemo(() => {
    if (!selectedQuote) return null;
    const exchangeRate = selectedQuote.currency === 'MXN'
      ? 1
      : (selectedQuote.exchange_rate || currencyService.getRate(selectedQuote.currency));
    const safeRate = exchangeRate > 0 ? exchangeRate : 1;
    const showConvertedValues = selectedQuote.currency !== 'MXN' && safeRate > 0;

    const renderMoney = (amount: number, align: 'left' | 'right' = 'right') => (
      <div className={`flex flex-col ${align === 'right' ? 'items-end text-right' : ''}`}>
        <span>{formatCurrency(amount, 'MXN')}</span>
        {showConvertedValues && (
          <span className="text-[10px] text-gray-500 dark:text-gray-400">
            ≈ {formatCurrency(amount / safeRate, selectedQuote.currency)} ({selectedQuote.currency})
          </span>
        )}
      </div>
    );

    return { safeRate, showConvertedValues, renderMoney };
  }, [selectedQuote]);

  const eventInvoices = useMemo(() => {
    if (!event) return invoices;
    return invoices.filter(inv => inv.event_id === event.id);
  }, [event, invoices]);

  // Helper to format time for input fields (HH:mm:ss -> HH:mm)
  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '';
    return timeStr.split(':').slice(0, 2).join(':');
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth/login', { state: { from: location }, replace: true });
      return;
    }

    const initPortal = async () => {
      setLoading(true);
      setPortalError(null);
      try {
        const linkedClient = await clientService.getClientByAuthUser(user.id);
        
        let targetClientId = linkedClient?.id;

        // If not linked or ID doesn't match, check if Admin/Staff
        if ((!linkedClient || (clientId && linkedClient.id !== clientId))) {
          const linkedStaff = await userService.getUserByAuthId(user.id);
          // Check if admin/staff role
          if (linkedStaff && ['admin', 'super_admin', 'manager', 'planner'].some(r => linkedStaff.role.includes(r))) {
            // Admin can view any portal they requested via URL
             if (clientId) {
                targetClientId = clientId;
             }
          }
        }

        if (!targetClientId) {
           setPortalError('No client profile is linked to this account.');
           setLoading(false);
           return;
        }

        if (clientId && targetClientId !== clientId) {
           setPortalError('This portal link does not match your account.');
           setLoading(false);
           return;
        }

        setPortalClientId(targetClientId);
        await loadPortalData(targetClientId);
      } catch (error) {
        console.error('Error initializing portal:', error);
        toast.error('Failed to load portal data');
        setLoading(false);
      }
    };

    initPortal();
  }, [authLoading, user, clientId, location, navigate]);

  useEffect(() => {
    let active = true;
    const syncFingerprint = async () => {
      if (!selectedContract?.content) {
        if (active) setContractFingerprint('');
        return;
      }
      const hash = await generateDocumentFingerprint(selectedContract.content);
      if (active) setContractFingerprint(hash);
    };
    syncFingerprint();
    return () => {
      active = false;
    };
  }, [selectedContract?.content]);

  useEffect(() => {
    setLegalName('');
    setHasConfirmedAgreement(false);
  }, [selectedContract?.id]);

  const loadPortalData = async (id: string) => {
    try {
      const [portalData, clientData, brandingData] = await Promise.all([
        portalService.getPortalStatus(id),
        clientService.getClient(id),
        settingsService.getBrandingSettings(),
      ]);

      setQuotes(portalData.quotes || []);
      setQuestionnaires(portalData.questionnaires || []);
      setContracts(portalData.contracts || []);
      setInvoices(portalData.invoices || []);

      setQuote(portalData.quote);
      setQuestionnaire(portalData.questionnaire);
      setContract(portalData.contract);
      setInvoice(portalData.invoice);
      // setReview(portalData.review);
      
      setClient(clientData);
      setBranding(brandingData);

      // Fetch Event Details if available
      const eventId = portalData.quote?.event_id || portalData.questionnaire?.event_id || portalData.contract?.event_id;
      if (eventId) {
        const eventData = await eventService.getEvent(eventId);
        setEvent(eventData);

        if (eventData?.venue_id) {
          const venueData = await venueService.getVenue(eventData.venue_id);
          setVenue(venueData);
        } else {
          setVenue(null);
        }

        if (eventData?.planner_id) {
          const plannerData = await plannerService.getPlanner(eventData.planner_id);
          setPlanner(plannerData);
        } else {
          setPlanner(null);
        }
      } else {
        setEvent(null);
        setVenue(null);
        setPlanner(null);
      }
    } catch (error) {
      console.error('Error loading portal data:', error);
      toast.error('Failed to load portal data');
    } finally {
      setLoading(false);
    }
  };

  const buildSignatureMetadata = async (signedName: string, targetContract: Contract): Promise<SignatureMetadata> => {
    const now = new Date().toISOString();
    const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : 'client-portal';
    const fingerprintValue = contractFingerprint || (targetContract.content
      ? await generateDocumentFingerprint(targetContract.content)
      : undefined);

    return {
      client: {
        name: signedName.trim(),
        email: client?.email || undefined,
        role: 'Client',
        signed_at: now,
        ip_address: 'client-portal',
        user_agent: userAgent,
        fingerprint: fingerprintValue,
      },
      provider: {
        name: branding?.company_name || 'Oh My Desserts MX',
        email: branding?.email || undefined,
        role: 'Service Provider',
        signed_at: now,
        ip_address: 'system',
        user_agent: 'OMD Admin Console',
        fingerprint: fingerprintValue,
      },
      transaction: {
        method: 'Client Portal',
        location: typeof window !== 'undefined' ? window.location.href : undefined,
        reference: targetContract?.id,
      },
    };
  };

  const handleSignContract = async (targetContract: Contract) => {
    if (!targetContract) return;
    if (!legalName.trim()) {
      toast.error('Please enter your full legal name to sign');
      return;
    }
    if (!hasConfirmedAgreement) {
      toast.error('Please confirm you agree to the Service Agreement before signing');
      return;
    }

    const confirmed = await confirm({
      title: 'Sign Contract',
      message: 'By signing this contract, you agree to all terms and conditions. Continue?',
      confirmLabel: 'Sign & Continue',
      type: 'info'
    });

    if (!confirmed) return;

    try {
      setProcessing(true);
      const toastId = toast.loading('Signing contract...');

      const signatureMetadata = await buildSignatureMetadata(legalName, targetContract);
      
      await portalService.signContract(targetContract.id, legalName, signatureMetadata);
      
      toast.success('Contract Signed Successfully!', { id: toastId });
      if (portalClientId) {
        await loadPortalData(portalClientId);
      }
      setSelectedContract(null);
      setNextStepPrompt({
        title: 'Contract signed',
        message: 'Thank you! You can now review your invoices and submit payments on schedule.',
        actionLabel: 'View invoices',
        nextTab: 'invoices'
      });
    } catch (error) {
      console.error('Error signing contract:', error);
      toast.error('Failed to sign contract');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadContract = async (targetContract: Contract) => {
    if (!targetContract || !client) {
      toast.error('Contract or client information is missing.');
      return;
    }

    const displayId = formatDocumentID('CON', event?.date || targetContract.created_at);
    const fingerprintValue = contractFingerprint || await generateDocumentFingerprint(targetContract.content);
    const relatedQuote = targetContract.quote_id
      ? quotes.find(q => q.id === targetContract.quote_id) || quote
      : quote;
    const relatedInvoices = invoices.filter(inv => inv.event_id === targetContract.event_id);
    const scheduleEntries = buildContractInvoiceSchedule({
      invoices: relatedInvoices,
      quote: relatedQuote,
      event,
    });
    const hydratedHtml = hydrateContractContent(targetContract, {
      client,
      event,
      venue,
      planner,
      quote: relatedQuote,
      invoices: relatedInvoices,
    });
    const contentBlocks = parseContractContentBlocks(hydratedHtml);

    try {
      const [{ pdf }, { ContractPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../contracts/ContractPDF'),
      ]);

      const blob = await pdf(
        <ContractPDF
          contract={targetContract}
          client={client}
          branding={branding}
          event={event}
          documentId={displayId}
          contentBlocks={contentBlocks}
          invoiceSchedule={scheduleEntries}
          fingerprint={fingerprintValue}
          signatureMetadata={targetContract.signature_metadata}
          quoteItems={relatedQuote?.items}
          quote={relatedQuote}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${displayId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Contract PDF downloaded');
    } catch (error) {
      console.error('Error generating contract PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handlePayInvoice = async (targetInvoice: Invoice) => {
    if (!targetInvoice) return;
    
    const confirmed = await confirm({
      title: 'Confirm Payment',
      message: 'Proceed with payment for this invoice?',
      confirmLabel: 'Pay Now',
      type: 'info'
    });

    if (!confirmed) return;

    try {
      setProcessing(true);
      const toastId = toast.loading('Processing payment...');
      
      await portalService.payInvoice(targetInvoice.id);
      
      toast.success('Payment Successful! Invoice marked as paid.', { id: toastId });
      if (portalClientId) {
        await loadPortalData(portalClientId);
      }
      setSelectedInvoice(null);
      setNextStepPrompt({
        title: 'Payment received',
        message: 'We’ve recorded your payment. Feel free to return to the overview or continue exploring upcoming tasks.',
        actionLabel: 'Return to overview',
        nextTab: 'overview'
      });
    } catch (error) {
      console.error('Error paying invoice:', error);
      toast.error('Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadInvoice = async (targetInvoice: Invoice) => {
    if (!targetInvoice || !client) return;

    const displayId = formatDocumentID('INV', event?.date || targetInvoice.created_at);

    try {
      const [{ pdf }, { InvoicePDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../invoices/InvoicePDF'),
      ]);

      const blob = await pdf(
        <InvoicePDF
          invoice={targetInvoice}
          client={client}
          branding={branding}
          displayId={displayId}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${displayId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Invoice PDF downloaded');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handleDownloadQuote = async (targetQuote: Quote) => {
    if (!targetQuote || !client) {
      toast.error('Quote or client information is missing.');
      return;
    }

    try {
      setQuoteDownloading(true);

      const sanitizedItems = targetQuote.items?.map((item, index) => ({
        ...item,
        id: item.id || `item-${index}`,
      })) ?? [];

      const subtotal = targetQuote.items?.reduce((sum, item) => sum + (item.total ?? item.unit_price * item.quantity), 0) || 0;
      const taxNet = targetQuote.taxes?.reduce((sum, tax) => sum + (tax.is_retention ? -tax.amount : tax.amount), 0) || 0;
      const totals = {
        subtotal,
        tax: taxNet,
        total: subtotal + taxNet,
      };

      const displayId = formatDocumentID('QT', event?.date || targetQuote.created_at);

      const [{ pdf }, { QuotePDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../quotes/QuotePDF'),
      ]);

      const blob = await pdf(
        <QuotePDF
          quote={targetQuote}
          client={client}
          branding={branding}
          items={sanitizedItems}
          totals={totals}
          quoteNumber={displayId}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${displayId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Quote PDF downloaded');
    } catch (error) {
      console.error('Error generating quote PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setQuoteDownloading(false);
    }
  };

  const handleStartQuestionnaire = () => {
    if (!selectedQuestionnaire) return;
    setIsFillingQuestionnaire(true);
  };

  const submitQuestionnaire = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedQuestionnaire) return;

    try {
      setProcessing(true);
      const formData = new FormData(e.currentTarget);
      const answers = Array.from(formData.entries())
        .map(([question_id, value]) => ({
          question_id,
          answer: typeof value === 'string' ? value : value.name,
        }))
        .filter((item) => item.answer.trim().length > 0);

      await questionnaireService.saveAnswers(selectedQuestionnaire.id, answers);
      toast.success('Questionnaire submitted');
      setIsFillingQuestionnaire(false);
      if (portalClientId) {
        await loadPortalData(portalClientId);
      }
      setSelectedQuestionnaire(null);
      setNextStepPrompt({
        title: 'Questionnaire submitted',
        message: 'Thanks for the details! You can now review and sign your contract.',
        actionLabel: 'Review contract',
        nextTab: 'contracts'
      });
    } catch (error) {
      console.error('Error submitting questionnaire:', error);
      toast.error('Failed to submit questionnaire');
    } finally {
      setProcessing(false);
    }
  };

  const handleAcceptQuote = async (targetQuote: Quote) => {
    if (!targetQuote || !clientId) return;

    const confirmed = await confirm({
      title: 'Accept Quote',
      message: 'Ready to lock in this quote and continue to the questionnaire?',
      confirmLabel: 'Accept Quote',
      type: 'info'
    });

    if (!confirmed) return;

    try {
      setQuoteActionLoading(true);
      const toastId = toast.loading('Accepting quote...');
      await portalService.acceptQuote(targetQuote.id);
      toast.success('Quote accepted! Next up: questionnaire details.', { id: toastId });
      if (portalClientId) {
        await loadPortalData(portalClientId);
      }
      setSelectedQuote(null);
      setNextStepPrompt({
        title: 'Quote accepted',
        message: 'Great choice! Please complete your questionnaire so we can finalize the event details.',
        actionLabel: 'Fill questionnaire',
        nextTab: 'questionnaires'
      });
    } catch (error) {
      console.error('Error accepting quote:', error);
      toast.error('Failed to accept quote');
    } finally {
      setQuoteActionLoading(false);
    }
  };

  const isTabLocked = (tabId: PortalTab) => {
    const hasAcceptedQuote = quote?.status === 'accepted' || quotes.some((q) => q.status === 'accepted');
    const hasCompletedQuestionnaire = questionnaire?.status === 'completed' || questionnaires.some((q) => q.status === 'completed');
    const hasSignedContract = contract?.status === 'signed' || contracts.some((c) => c.status === 'signed');
    const hasInvoices = invoices.length > 0;
    const invoicesPaid = hasInvoices && invoices.every((inv) => inv.status === 'paid');

    switch (tabId) {
      case 'overview':
      case 'quotes':
        return false;
      case 'questionnaires':
        return !hasAcceptedQuote;
      case 'contracts':
        return !hasCompletedQuestionnaire;
      case 'invoices':
        return !hasSignedContract || !hasInvoices;
      case 'reviews':
        return eventStatus !== 'completed' || !invoicesPaid;
      default:
        return false;
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading Portal...</div>;
  if (portalError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center px-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Portal access blocked</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{portalError}</p>
        <button
          onClick={() => navigate('/auth/login', { replace: true })}
          className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary/90"
        >
          Return to login
        </button>
      </div>
    );
  }

  const tabs: { id: PortalTab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: Layout },
    { id: 'quotes', label: 'Quotes', icon: DollarSign },
    { id: 'questionnaires', label: 'Questionnaires', icon: CheckSquare },
    { id: 'contracts', label: 'Contracts', icon: PenTool },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'reviews', label: 'Reviews', icon: Star },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-700 dark:bg-gray-700">
      <header className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white dark:text-white">Client Portal</h1>
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
                        ? 'bg-secondary text-accent hover:text-accent hover:bg-secondary'
                        : locked
                        ? 'text-gray-400 cursor-not-allowed opacity-60'
                        : 'text-gray-900 dark:text-white dark:text-white hover:text-gray-900 dark:text-white dark:text-white hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700'
                    } group rounded-md px-3 py-2 flex items-center text-sm font-medium w-full`}
                  >
                    <tab.icon
                      className={`${
                        activeTab === tab.id ? 'text-primary' : 'text-gray-400'
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
            <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow sm:rounded-lg p-6">
              {activeTab === 'overview' && (
                <div className="text-center py-10">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">Welcome to your Event Portal</h2>
                  <p className="mt-2 text-gray-500 dark:text-gray-400 dark:text-gray-400">Track your planning progress, view documents, and manage payments.</p>
                  <div className="mt-8 flex justify-center space-x-4">
                    <div className="text-center cursor-pointer" onClick={() => !isTabLocked('quotes') && setActiveTab('quotes')}>
                      <div className={`rounded-full p-3 ${quote?.status === 'accepted' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'} hover:opacity-80 transition-opacity`}>
                        <DollarSign className="h-6 w-6" />
                      </div>
                      <span className="text-xs mt-1 block group-hover:text-primary">Quote</span>
                    </div>
                    <div className="w-8 border-t-2 border-gray-200 dark:border-gray-700 mt-6"></div>
                    <div className="text-center cursor-pointer" onClick={() => !isTabLocked('questionnaires') && setActiveTab('questionnaires')}>
                      <div className={`rounded-full p-3 ${questionnaire?.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'} hover:opacity-80 transition-opacity`}>
                        <CheckSquare className="h-6 w-6" />
                      </div>
                      <span className="text-xs mt-1 block">Details</span>
                    </div>
                    <div className="w-8 border-t-2 border-gray-200 dark:border-gray-700 mt-6"></div>
                    <div className="text-center cursor-pointer" onClick={() => !isTabLocked('contracts') && setActiveTab('contracts')}>
                      <div className={`rounded-full p-3 ${contract?.status === 'signed' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'} hover:opacity-80 transition-opacity`}>
                        <PenTool className="h-6 w-6" />
                      </div>
                      <span className="text-xs mt-1 block">Contract</span>
                    </div>
                    <div className="w-8 border-t-2 border-gray-200 dark:border-gray-700 mt-6"></div>
                    <div className="text-center cursor-pointer" onClick={() => !isTabLocked('invoices') && setActiveTab('invoices')}>
                      <div className={`rounded-full p-3 ${invoice?.status === 'paid' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'} hover:opacity-80 transition-opacity`}>
                        <FileText className="h-6 w-6" />
                      </div>
                      <span className="text-xs mt-1 block">Invoice</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'quotes' && (
                <div>
                  {!selectedQuote ? (
                    // List View
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white mb-6">Your Quotes</h3>
                      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
                        <ul className="divide-y divide-gray-200">
                          {quotes.map((q) => (
                            <li key={q.id}>
                              <div className="px-4 py-4 flex items-center sm:px-6">
                                <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                                  <div className="truncate">
                                    <div className="flex text-sm">
                                      <p className="font-medium text-primary truncate">{formatDocumentID('QT', event?.date || q.created_at)}</p>
                                      <p className="ml-1 flex-shrink-0 font-normal text-gray-500 dark:text-gray-400 dark:text-gray-400">
                                        for {event?.name || 'Event'}
                                      </p>
                                    </div>
                                    <div className="mt-2 flex">
                                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                                        <p>
                                          Created on {new Date(q.created_at).toLocaleDateString()}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="mt-4 flex-shrink-0 sm:mt-0 sm:ml-5">
                                    <div className="flex overflow-hidden -space-x-1">
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        q.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {q.status.toUpperCase()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="ml-5 flex-shrink-0">
                                  <button
                                    onClick={() => setSelectedQuote(q)}
                                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                                  >
                                    View
                                  </button>
                                </div>
                              </div>
                            </li>
                          ))}
                          {quotes.length === 0 && (
                            <li className="px-4 py-4 text-center text-gray-500 dark:text-gray-400 dark:text-gray-400">No quotes available.</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    // Detail View
                    (() => {
                      if (!quoteCurrencyHelpers) return null;
                      const { renderMoney, safeRate, showConvertedValues } = quoteCurrencyHelpers;
                      const subtotalMXN = selectedQuote.items.reduce((sum, item) => sum + item.total, 0);
                      const taxNet = selectedQuote.taxes?.reduce((sum, tax) => sum + (tax.is_retention ? -tax.amount : tax.amount), 0) || 0;
                      const totalBase = subtotalMXN + taxNet;
                      const otherCharges = totalBase - subtotalMXN;
                      return (
                        <div>
                          <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center">
                              <button 
                                onClick={() => setSelectedQuote(null)} 
                                className="mr-4 text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700"
                              >
                                <ArrowLeft className="h-5 w-5" />
                              </button>
                              <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white">Quote Details</h3>
                            </div>
                            <div className="flex space-x-3">
                              <button
                                onClick={() => handleDownloadQuote(selectedQuote)}
                                disabled={quoteDownloading || !client}
                                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {quoteDownloading ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4 mr-2" />
                                )}
                                {quoteDownloading ? 'Preparing PDF...' : 'Download PDF'}
                              </button>
                              {selectedQuote.status !== 'accepted' && (
                                <button
                                  onClick={() => handleAcceptQuote(selectedQuote)}
                                  disabled={quoteActionLoading}
                                  className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 shadow-sm text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {quoteActionLoading ? (
                                    <span className="inline-flex items-center">
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                      Processing...
                                    </span>
                                  ) : (
                                    'Accept Quote'
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                          
                          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 border rounded-lg shadow-sm overflow-hidden p-10">
                            {/* PDF-Style Header */}
                            <div className="flex justify-between items-start mb-10">
                              <div>
                                <h2 className="text-3xl font-serif text-gray-900 dark:text-white uppercase tracking-widest mb-2">Price Quote</h2>
                                <div className="text-xs font-bold uppercase mb-1">{branding?.company_name || 'Oh My Desserts MX'}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">{branding?.address || 'Priv. Palmilla, Jardines del Sur II, Benito Juarez, Quintana Roo, 77535'}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">{branding?.website || 'www.ohmydessertsmx.com'} | {branding?.email || 'info@ohmydessertsmx.com'}</div>
                              </div>
                              <div className="w-20 h-20 rounded-full bg-[#f5f0eb] flex items-center justify-center overflow-hidden">
                                {branding?.logo_url ? (
                                  <img src={branding.logo_url} alt="Logo" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-xs text-gray-400">LOGO</span>
                                )}
                              </div>
                            </div>

                            {/* Info Section */}
                            <div className="flex justify-between mb-8">
                              <div className="w-1/2">
                                <h4 className="text-xs font-bold text-gray-900 dark:text-white dark:text-white uppercase mb-2">Bill To</h4>
                                <div className="text-xs text-gray-900 dark:text-white dark:text-white">
                                  <p className="mb-1">{client?.first_name} {client?.last_name}</p>
                                  <p className="text-gray-500 dark:text-gray-400 dark:text-gray-400 mb-1">{client?.email}</p>
                                  <p className="text-gray-500 dark:text-gray-400 dark:text-gray-400">{client?.phone}</p>
                                </div>
                              </div>
                              <div className="w-1/2 pl-10">
                                <div className="flex justify-between border-b border-gray-100 pb-1 mb-1">
                                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase">Quote #:</span>
                                  <span className="text-xs text-right">{formatDocumentID('QT', event?.date || selectedQuote.created_at)}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-100 pb-1 mb-1">
                                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase">Date:</span>
                                  <span className="text-xs text-right">{new Date(selectedQuote.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-100 pb-1 mb-1">
                                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase">Valid Until:</span>
                                  <span className="text-xs text-right">{new Date(selectedQuote.valid_until).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-100 pb-1 mb-1">
                                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase">Status:</span>
                                  <span className={`text-xs text-right font-bold ${
                                    selectedQuote.status === 'accepted' ? 'text-green-600' : 
                                    selectedQuote.status === 'rejected' ? 'text-red-600' : 
                                    'text-yellow-600'
                                  }`}>{selectedQuote.status.toUpperCase()}</span>
                                </div>
                                {showConvertedValues && (
                                  <div className="flex justify-between border-b border-gray-100 pb-1 mb-1">
                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase">Exchange Rate:</span>
                                    <span className="text-xs text-right">1 {selectedQuote.currency} ≈ {formatCurrency(safeRate, 'MXN')}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Table */}
                            <div className="mb-8">
                              <div className="flex bg-[#f5f0eb] py-2 px-2 mb-2">
                                <div className="w-6/12 text-xs font-bold text-gray-900 dark:text-white dark:text-white uppercase">Description</div>
                                <div className="w-2/12 text-xs font-bold text-gray-900 dark:text-white dark:text-white uppercase text-right">Qty</div>
                                <div className="w-2/12 text-xs font-bold text-gray-900 dark:text-white dark:text-white uppercase text-right">Price</div>
                                <div className="w-2/12 text-xs font-bold text-gray-900 dark:text-white dark:text-white uppercase text-right">Amount</div>
                              </div>
                              
                              {selectedQuote.items.map((item, index) => (
                                <div key={index} className="flex border-b border-gray-100 py-2 px-2">
                                  <div className="w-6/12 text-xs text-gray-900 dark:text-white dark:text-white">{item.description}</div>
                                  <div className="w-2/12 text-xs text-gray-900 dark:text-white dark:text-white text-right">{item.quantity}</div>
                                  <div className="w-2/12 text-xs text-gray-900 dark:text-white dark:text-white text-right">
                                    {renderMoney(item.unit_price)}
                                  </div>
                                  <div className="w-2/12 text-xs text-gray-900 dark:text-white dark:text-white text-right">
                                    {renderMoney(item.total)}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Footer Section with Terms and Totals */}
                            <div className="flex justify-between mb-12">
                              {/* Terms */}
                              <div className="w-7/12 pr-8">
                                <div className="bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 p-4 border border-gray-100 rounded">
                                  <h5 className="text-xs font-bold text-gray-900 dark:text-white dark:text-white uppercase mb-2">Terms & Conditions</h5>
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400 dark:text-gray-400 leading-relaxed">
                                    This quote is an estimate based on the event details provided and is subject to our standard Catering Services Agreement. Final pricing may vary if guest count, service time, location, or menu selections change.
                                  </p>
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400 dark:text-gray-400 leading-relaxed mt-3">
                                    The booking is only confirmed once the corresponding contract is signed and the required retainer is received. By accepting this quote, the client acknowledges that all services will be provided in accordance with the terms and conditions set out in the Catering Services Agreement.
                                  </p>
                                </div>
                              </div>

                              {/* Totals */}
                              <div className="w-4/12">
                                <div className="flex justify-between border-b border-gray-100 pb-1 mb-1">
                                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase">Subtotal</span>
                                  <span className="text-xs text-gray-900 dark:text-white dark:text-white">
                                    {renderMoney(subtotalMXN)}
                                  </span>
                                </div>

                                {selectedQuote.taxes && selectedQuote.taxes.length > 0 ? (
                                  selectedQuote.taxes.map((tax, index) => (
                                    <div key={index} className="flex justify-between border-b border-gray-100 pb-1 mb-1">
                                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase">{tax.name} ({tax.rate}%)</span>
                                      <span className={`text-xs ${tax.is_retention ? 'text-red-600' : 'text-gray-900 dark:text-white dark:text-white'}`}>
                                        {renderMoney(tax.is_retention ? -tax.amount : tax.amount)}
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  otherCharges > 0 && (
                                    <div className="flex justify-between border-b border-gray-100 pb-1 mb-1">
                                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase">Tax</span>
                                      <span className="text-xs text-gray-900 dark:text-white dark:text-white">
                                        {renderMoney(otherCharges)}
                                      </span>
                                    </div>
                                  )
                                )}

                                <div className="flex justify-between bg-[#f5f0eb] py-2 px-2 mt-2">
                                  <span className="text-xs font-bold text-gray-900 dark:text-white dark:text-white uppercase">Amount Due</span>
                                  <span className="text-xs font-bold text-gray-900 dark:text-white dark:text-white">
                                    {renderMoney(totalBase)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Footer */}
                            <div className="border-t border-gray-100 pt-6 text-center">
                              <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-widest bg-[#f5f0eb] inline-block px-4 py-1">
                                Thank you for your business!
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>
              )}

              {activeTab === 'questionnaires' && (
                <div className="space-y-6">
                  {!selectedQuestionnaire ? (
                    // List View
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white mb-6">Your Questionnaires</h3>
                      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
                        <ul className="divide-y divide-gray-200">
                          {questionnaires.map((q) => (
                            <li key={q.id}>
                              <div className="px-4 py-4 flex items-center sm:px-6">
                                <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                                  <div className="truncate">
                                    <div className="flex text-sm">
                                      <p className="font-medium text-primary truncate">{formatDocumentID('QST', event?.date || q.created_at)} - {q.title}</p>
                                      <p className="ml-1 flex-shrink-0 font-normal text-gray-500 dark:text-gray-400 dark:text-gray-400">
                                        Due on {q.due_date ? new Date(q.due_date).toLocaleDateString() : 'N/A'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="mt-4 flex-shrink-0 sm:mt-0 sm:ml-5">
                                    <div className="flex overflow-hidden -space-x-1">
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        q.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                      }`}>
                                        {q.status.toUpperCase()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="ml-5 flex-shrink-0">
                                  <button
                                    onClick={() => setSelectedQuestionnaire(q)}
                                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                                  >
                                    View
                                  </button>
                                </div>
                              </div>
                            </li>
                          ))}
                          {questionnaires.length === 0 && (
                            <li className="px-4 py-4 text-center text-gray-500 dark:text-gray-400 dark:text-gray-400">No questionnaires available.</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    // Detail View
                    <div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <button 
                            onClick={() => { setSelectedQuestionnaire(null); setIsFillingQuestionnaire(false); }} 
                            className="mr-4 text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700"
                          >
                            <ArrowLeft className="h-5 w-5" />
                          </button>
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white">Event Questionnaire</h3>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 border rounded-lg shadow-sm overflow-hidden mt-6">
                        <div className="p-6 border-b bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 flex justify-between items-center">
                          <div>
                            <h4 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white">{selectedQuestionnaire.title}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 mt-1">Please complete this form to help us plan your event.</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                            selectedQuestionnaire.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {selectedQuestionnaire.status}
                          </span>
                        </div>
                        
                        {isFillingQuestionnaire ? (
                          <form onSubmit={submitQuestionnaire} className="p-8 space-y-8">
                            {/* Client Details */}
                            <div>
                              <h5 className="text-md font-bold text-gray-900 dark:text-white dark:text-white mb-4 border-b pb-2">Client Details</h5>
                              <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                  <label className="block text-sm font-medium text-gray-700">Name (Full Legal Name)</label>
                                  <input type="text" name="client_full_name" defaultValue={`${client?.first_name || ''} ${client?.last_name || ''}`} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                                </div>
                                <div className="sm:col-span-2">
                                  <label className="block text-sm font-medium text-gray-700">Address (Complete)</label>
                                  <input type="text" name="client_address" defaultValue={client?.address || ''} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Phone #</label>
                                  <input type="tel" name="client_phone" defaultValue={client?.phone || ''} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Email</label>
                                  <input type="email" name="client_email" defaultValue={client?.email || ''} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Role/Relationship</label>
                                  <input type="text" name="client_role" defaultValue={client?.role || ''} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" placeholder="e.g. Bride, Groom, Planner" />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Social Media Usernames</label>
                                  <input type="text" name="client_instagram" defaultValue={client?.instagram || ''} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                                </div>
                              </div>
                            </div>

                            {/* Event Details */}
                            <div>
                              <h5 className="text-md font-bold text-gray-900 dark:text-white dark:text-white mb-4 border-b pb-2">Event Details</h5>
                              <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Event Type</label>
                                  <input type="text" name="event_type" defaultValue={event?.type || ''} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Event Date</label>
                                  <input type="date" name="event_date" defaultValue={event?.date ? new Date(event.date).toISOString().split('T')[0] : ''} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                                </div>
                                <div className="sm:col-span-2">
                                  <label className="block text-sm font-medium text-gray-700">Event Name</label>
                                  <input type="text" name="event_name" defaultValue={event?.name || ''} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Event (Service) Start Time</label>
                                  <input type="time" name="event_start_time" defaultValue={formatTime(event?.start_time)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Event (Service) End Time</label>
                                  <input type="time" name="event_end_time" defaultValue={formatTime(event?.end_time)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Event HashTag(s)</label>
                                  <input type="text" name="event_hashtag" defaultValue={event?.hashtag || ''} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Guest Count</label>
                                  <input type="number" name="event_guest_count" defaultValue={event?.guest_count || ''} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                                </div>
                              </div>
                            </div>

                            {/* Venue Details */}
                            <div>
                              <h5 className="text-md font-bold text-gray-900 dark:text-white dark:text-white mb-4 border-b pb-2">Venue Details</h5>
                              <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Venue Name</label>
                                  <input type="text" name="venue_name" defaultValue={venue?.name || event?.venue_name || ''} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Venue Sub-Location</label>
                                  <input type="text" name="venue_sub_location" defaultValue={event?.venue_sub_location || ''} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                                </div>
                                <div className="sm:col-span-2">
                                  <label className="block text-sm font-medium text-gray-700">Venue Address (Complete)</label>
                                  <input type="text" name="venue_address" defaultValue={venue?.address || event?.venue_address || ''} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Venue Main Contact Name</label>
                                  <input type="text" name="venue_contact_name" defaultValue={event?.venue_contact_name || ''} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Venue Main Contact Phone #</label>
                                  <input type="tel" name="venue_contact_phone" defaultValue={venue?.phone || event?.venue_contact_phone || ''} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                                </div>
                                <div className="sm:col-span-2">
                                  <label className="block text-sm font-medium text-gray-700">Venue Main Contact Email</label>
                                  <input type="email" name="venue_contact_email" defaultValue={venue?.email || event?.venue_contact_email || ''} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                                </div>
                              </div>
                            </div>

                            {/* External Planner Details */}
                            <div>
                              <h5 className="text-md font-bold text-gray-900 dark:text-white dark:text-white mb-4 border-b pb-2">External Planner Details</h5>
                              <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                  <label className="block text-sm font-medium text-gray-700">Planner Agency/Company Name</label>
                                  <input type="text" name="planner_company" defaultValue={planner?.company || event?.planner_company || ''} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Lead Planner First Name</label>
                                  <input type="text" name="planner_first_name" defaultValue={planner?.first_name || event?.planner_first_name || ''} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Lead Planner Last Name</label>
                                  <input type="text" name="planner_last_name" defaultValue={planner?.last_name || event?.planner_last_name || ''} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Lead Planner Phone</label>
                                  <input type="tel" name="planner_phone" defaultValue={planner?.phone || event?.planner_phone || ''} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Lead Planner Email</label>
                                  <input type="email" name="planner_email" defaultValue={planner?.email || event?.planner_email || ''} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                                </div>
                                <div className="sm:col-span-2">
                                  <label className="block text-sm font-medium text-gray-700">Lead Planner Instagram Handle</label>
                                  <input type="text" name="planner_instagram" defaultValue={planner?.instagram || event?.planner_instagram || ''} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                                </div>
                              </div>
                            </div>

                            {/* Day-of Coordinator */}
                            <div>
                              <h5 className="text-md font-bold text-gray-900 dark:text-white dark:text-white mb-4 border-b pb-2">Day-of Coordinator (If different from Lead Planner)</h5>
                              <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Day-of Contact Name</label>
                                  <input type="text" name="event_day_of_contact_name" defaultValue={event?.day_of_contact_name || ''} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Day-of Contact Mobile #</label>
                                  <input type="tel" name="event_day_of_contact_phone" defaultValue={event?.day_of_contact_phone || ''} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                                </div>
                              </div>
                            </div>

                            {/* Additional Details */}
                            <div>
                              <h5 className="text-md font-bold text-gray-900 dark:text-white dark:text-white mb-4 border-b pb-2">Additional Details</h5>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Notes / Special Requests</label>
                                <textarea rows={4} name="event_notes" defaultValue={event?.notes || ''} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" placeholder="Any other details we should know?"></textarea>
                              </div>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t">
                              <button
                                type="button"
                                onClick={() => setIsFillingQuestionnaire(false)}
                                className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 focus:outline-none"
                              >
                                {selectedQuestionnaire.status === 'completed' ? 'Close' : 'Cancel'}
                              </button>
                              <button
                                type="submit"
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                              >
                                {selectedQuestionnaire.status === 'completed' ? 'Update Details' : 'Submit Questionnaire'}
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="p-8 text-center">
                            <div className="mx-auto h-24 w-24 bg-secondary rounded-full flex items-center justify-center mb-4">
                              <ClipboardList className="h-12 w-12 text-primary" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white mb-2">
                              {selectedQuestionnaire.status === 'completed' ? 'Thank You!' : 'Action Required'}
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 dark:text-gray-400 max-w-md mx-auto mb-6">
                              {selectedQuestionnaire.status === 'completed' 
                                ? 'You have successfully submitted this questionnaire. We will review your answers shortly.' 
                                : 'We need a few more details about your event. Please take a moment to fill out this questionnaire.'}
                            </p>
                            
                            {selectedQuestionnaire.status !== 'completed' ? (
                              <button
                                onClick={handleStartQuestionnaire}
                                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                              >
                                Start Questionnaire
                                <ArrowRight className="ml-2 h-5 w-5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => setIsFillingQuestionnaire(true)}
                                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                              >
                                View Responses
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'contracts' && (
                <div>
                  {!selectedContract ? (
                    // List View
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white mb-6">Your Contracts</h3>
                      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
                        <ul className="divide-y divide-gray-200">
                          {contracts.map((con) => (
                            <li key={con.id}>
                              <div className="px-4 py-4 flex items-center sm:px-6">
                                <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                                  <div className="truncate">
                                    <div className="flex text-sm">
                                      <p className="font-medium text-primary truncate">{formatDocumentID('CON', event?.date || con.created_at)}</p>
                                      <p className="ml-1 flex-shrink-0 font-normal text-gray-500 dark:text-gray-400 dark:text-gray-400">
                                        Created on {new Date(con.created_at).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="mt-4 flex-shrink-0 sm:mt-0 sm:ml-5">
                                    <div className="flex overflow-hidden -space-x-1">
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        con.status === 'signed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {con.status.toUpperCase()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="ml-5 flex-shrink-0">
                                  <button
                                    onClick={() => setSelectedContract(con)}
                                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                                  >
                                    View
                                  </button>
                                </div>
                              </div>
                            </li>
                          ))}
                          {contracts.length === 0 && (
                            <li className="px-4 py-4 text-center text-gray-500 dark:text-gray-400 dark:text-gray-400">No contracts available.</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    // Detail View
                    <div>
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center">
                          <button 
                            onClick={() => setSelectedContract(null)} 
                            className="mr-4 text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700"
                          >
                            <ArrowLeft className="h-5 w-5" />
                          </button>
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white">Service Contract</h3>
                        </div>
                        <div className="flex space-x-3">
                          {selectedContract.status === 'signed' && (
                            <button
                              onClick={() => handleDownloadContract(selectedContract)}
                              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download PDF
                            </button>
                          )}
                        </div>
                      </div>
                      
                        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 border rounded-lg shadow-sm overflow-hidden p-10">
                        {/* PDF-Style Header */}
                        <div className="flex justify-between items-start mb-10">
                          <div>
                            <h2 className="text-3xl font-serif text-gray-900 dark:text-white dark:text-white uppercase tracking-widest mb-2">Contract</h2>
                            <div className="text-xs font-bold uppercase mb-1">{branding?.company_name || 'Oh My Desserts MX'}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">{branding?.address || 'Priv. Palmilla, Jardines del Sur II, Benito Juarez, Quintana Roo, 77535'}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">{branding?.website || 'www.ohmydessertsmx.com'} | {branding?.email || 'info@ohmydessertsmx.com'}</div>
                          </div>
                          <div className="w-20 h-20 rounded-full bg-[#f5f0eb] flex items-center justify-center overflow-hidden">
                            {branding?.logo_url ? (
                              <img src={branding.logo_url} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs text-gray-400">LOGO</span>
                            )}
                          </div>
                        </div>

                        {/* Info Section */}
                        <div className="flex justify-between mb-8">
                          <div className="w-1/2">
                            <h4 className="text-xs font-bold text-gray-900 dark:text-white dark:text-white uppercase mb-2">Client</h4>
                            <div className="text-xs text-gray-900 dark:text-white dark:text-white">
                              <p className="mb-1">{client?.first_name} {client?.last_name}</p>
                              <p className="text-gray-500 dark:text-gray-400 dark:text-gray-400 mb-1">{client?.email}</p>
                              <p className="text-gray-500 dark:text-gray-400 dark:text-gray-400">{client?.phone}</p>
                            </div>
                          </div>
                          <div className="w-1/2 pl-10">
                            <div className="flex justify-between border-b border-gray-100 pb-1 mb-1">
                              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase">Contract ID:</span>
                              <span className="text-xs text-right font-mono">
                                {formatDocumentID('CON', event?.date || selectedContract.created_at)}
                              </span>
                            </div>
                            <div className="flex justify-between border-b border-gray-100 pb-1 mb-1">
                              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase">Date:</span>
                              <span className="text-xs text-right">{new Date(selectedContract.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-100 pb-1 mb-1">
                              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase">Status:</span>
                              <span className={`text-xs text-right font-bold ${
                                selectedContract.status === 'signed' ? 'text-green-600' : 'text-yellow-600'
                              }`}>{selectedContract.status.toUpperCase()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Contract Content */}
                        <div className="mb-12">
                          <style>{`
                            .prose ol { list-style-type: decimal; padding-left: 1.5em; }
                            .prose li { margin-bottom: 0.5em; }
                            .prose p { margin-bottom: 1em; }
                            .prose strong { font-weight: 600; }
                          `}</style>
                          <div className="prose max-w-none text-gray-800">
                            <div dangerouslySetInnerHTML={{ 
                              __html: (() => {
                                // 1. Replace placeholder text with token
                                let content = selectedContract.content.replace(
                                  'Invoice schedule will be generated upon booking.',
                                  '{{invoice_schedule}}'
                                );

                                // 1.5 Reconstruct Layout if "Terms and Conditions" is found (Fix for flattened templates)
                                const termsIndex = content.search(/Terms and Conditions/i);
                                if (termsIndex !== -1) {
                                  const termsContent = content.substring(termsIndex);
                                  content = CONTRACT_HEADER_HTML + 
                                  `
                                  <div style="margin-bottom: 40px;">
                                    <p style="font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">Service Details</p>
                                    {{quote_line_items}}
                                  </div>

                                  <div style="margin-bottom: 40px;">
                                    <p style="font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">Payment Schedule</p>
                                    {{invoice_schedule}}
                                  </div>
                                  
                                  <div style="margin-bottom: 40px;">
                                    ${termsContent}
                                  </div>
                                  `;
                                }
                                
                                // 2. Apply dynamic token replacement
                                content = tokenService.replaceTokens(content, {
                                  client: client || undefined,
                                  event: event || undefined,
                                  venue: venue || undefined,
                                  planner: planner || undefined,
                                  quote: quote || undefined,
                                  invoices: eventInvoices
                                });

                                // 3. Remove logo placeholder
                                content = content.replace(
                                  /<div style="width: 120px; height: 120px;.*?<\/div>/s, 
                                  ''
                                );
                                content = content.replace(/^LOGO\s*/i, '');
                                content = content.replace(/<p>LOGO<\/p>/i, '');

                                return content;
                              })()
                            }} />
                          </div>
                        </div>

                        {/* Closing Statement */}
                        <div className="mb-8 text-sm text-gray-800 font-serif leading-relaxed">
                          <p>
                            IN WITNESS WHEREOF, the parties hereto have executed this Agreement as of the date first above written.
                          </p>
                        </div>

                        <SignatureCertificate
                          metadata={selectedContract.signature_metadata}
                          clientFallback={{
                            name: legalName || `${client?.first_name || ''} ${client?.last_name || ''}`.trim(),
                            email: client?.email || undefined,
                            role: 'Client',
                            signed_at: selectedContract.signed_at,
                          }}
                          providerFallback={{
                            name: branding?.company_name,
                            email: branding?.email,
                            role: 'Service Provider',
                            signed_at: selectedContract.updated_at,
                          }}
                          fingerprint={contractFingerprint}
                        />

                        {/* Signature Section */}
                        <div className="mt-12 pt-8 border-t border-gray-100">
                          {selectedContract.status !== 'signed' && (
                            <label
                              htmlFor="contract-confirmation"
                              className="flex items-start space-x-3 mb-6 text-sm text-gray-700 dark:text-gray-100"
                            >
                              <input
                                id="contract-confirmation"
                                type="checkbox"
                                checked={hasConfirmedAgreement}
                                onChange={(e) => setHasConfirmedAgreement(e.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                              />
                              <span className="leading-relaxed">
                                I have read and agree to the Service Agreement above. I understand that my electronic signature below is legally binding and carries the same full force and effect as a handwritten signature.
                              </span>
                            </label>
                          )}

                          <div className="flex justify-between items-end">
                            <div className="w-5/12">
                              <div className="border-b border-gray-900 mb-2 pb-2">
                                {branding?.company_name || 'Oh My Desserts MX'}
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase">Service Provider Signature</p>
                            </div>
                            
                            <div className="w-5/12">
                              <div className="border-b border-gray-900 mb-2 pb-2 min-h-[30px]">
                                {selectedContract.status === 'signed' ? (
                                  <div className="font-script text-xl text-blue-900">
                                    {selectedContract.signed_by || `${client?.first_name} ${client?.last_name}`}
                                  </div>
                                ) : (
                                  <input
                                    type="text"
                                    value={legalName}
                                    onChange={(e) => setLegalName(e.target.value)}
                                    placeholder="Type Full Legal Name"
                                    className="w-full border-none p-0 text-xl font-script text-blue-900 placeholder-gray-300 focus:ring-0 bg-transparent"
                                  />
                                )}
                              </div>
                              <div className="flex justify-between">
                                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase">Client Signature</p>
                                {selectedContract.signed_at && (
                                  <p className="text-[10px] text-gray-400">
                                    {new Date(selectedContract.signed_at).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                              {selectedContract.status !== 'signed' && (
                                <p className="text-[10px] text-gray-400 mt-1">
                                  * Typing your name above constitutes a legal signature
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {selectedContract.status !== 'signed' && (
                          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-end">
                            <button
                              type="button"
                              onClick={() => handleSignContract(selectedContract)}
                              disabled={processing || !legalName.trim() || !hasConfirmedAgreement}
                              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <CheckCircle className="h-5 w-5 mr-2" />
                              Sign Contract
                            </button>
                          </div>
                        )}
                        <div className="mt-6 text-center text-[11px] text-gray-400">
                          Document ID {formatDocumentID('CON', event?.date || selectedContract.created_at)} • Version v{selectedContract.document_version || 1}.0 • Fingerprint {contractFingerprint || 'pending'}
                        </div>

                        {/* Footer */}
                        <div className="mt-12 text-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-widest bg-[#f5f0eb] inline-block px-4 py-1">
                            {selectedContract.status === 'signed' ? 'Document Signed & Valid' : 'Please Review & Sign'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'invoices' && (
                <div>
                  {!selectedInvoice ? (
                    // List View
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white mb-6">Your Invoices</h3>
                      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
                        <ul className="divide-y divide-gray-200">
                          {invoices.map((inv) => (
                            <li key={inv.id}>
                              <div className="px-4 py-4 flex items-center sm:px-6">
                                <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                                  <div className="truncate">
                                    <div className="flex text-sm">
                                      <p className="font-medium text-primary truncate">{formatDocumentID('INV', event?.date || inv.created_at)}</p>
                                      <p className="ml-1 flex-shrink-0 font-normal text-gray-500 dark:text-gray-400 dark:text-gray-400">
                                        ${inv.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                      </p>
                                    </div>
                                    <div className="mt-2 flex">
                                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                                        <p>
                                          Due on {new Date(inv.due_date).toLocaleDateString()}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="mt-4 flex-shrink-0 sm:mt-0 sm:ml-5">
                                    <div className="flex overflow-hidden -space-x-1">
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        inv.status === 'paid' ? 'bg-green-100 text-green-800' : 
                                        inv.status === 'overdue' ? 'bg-red-100 text-red-800' : 
                                        'bg-blue-100 text-blue-800'
                                      }`}>
                                        {inv.status.toUpperCase()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="ml-5 flex-shrink-0">
                                  <button
                                    onClick={() => setSelectedInvoice(inv)}
                                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                                  >
                                    View
                                  </button>
                                </div>
                              </div>
                            </li>
                          ))}
                          {invoices.length === 0 && (
                            <li className="px-4 py-4 text-center text-gray-500 dark:text-gray-400 dark:text-gray-400">No invoices available.</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    // Detail View
                    <div>
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center">
                          <button 
                            onClick={() => setSelectedInvoice(null)} 
                            className="mr-4 text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700"
                          >
                            <ArrowLeft className="h-5 w-5" />
                          </button>
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white">Invoice Details</h3>
                        </div>
                        <button
                          onClick={() => handleDownloadInvoice(selectedInvoice)}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </button>
                      </div>

                      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 border rounded-lg shadow-sm overflow-hidden p-10">
                        {/* PDF-Style Header */}
                        <div className="flex justify-between items-start mb-10">
                          <div>
                            <h2 className="text-3xl font-serif text-gray-900 dark:text-white dark:text-white uppercase tracking-widest mb-2">Invoice</h2>
                            <div className="text-xs font-bold uppercase mb-1">{branding?.company_name || 'Oh My Desserts MX'}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">{branding?.address || 'Priv. Palmilla, Jardines del Sur II, Benito Juarez, Quintana Roo, 77535'}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">{branding?.website || 'www.ohmydessertsmx.com'} | {branding?.email || 'info@ohmydessertsmx.com'}</div>
                          </div>
                          <div className="w-20 h-20 rounded-full bg-[#f5f0eb] flex items-center justify-center overflow-hidden">
                            {branding?.logo_url ? (
                              <img src={branding.logo_url} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs text-gray-400">LOGO</span>
                            )}
                          </div>
                        </div>

                        {/* Info Section */}
                        <div className="flex justify-between mb-8">
                          <div className="w-1/2">
                            <h4 className="text-xs font-bold text-gray-900 dark:text-white dark:text-white uppercase mb-2">Bill To</h4>
                            <div className="text-xs text-gray-900 dark:text-white dark:text-white">
                              <p className="mb-1">{client?.first_name} {client?.last_name}</p>
                              <p className="text-gray-500 dark:text-gray-400 dark:text-gray-400 mb-1">{client?.email}</p>
                              <p className="text-gray-500 dark:text-gray-400 dark:text-gray-400">{client?.phone}</p>
                            </div>
                          </div>
                          <div className="w-1/2 pl-10">
                            <div className="flex justify-between border-b border-gray-100 pb-1 mb-1">
                              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase">Invoice #:</span>
                              <span className="text-xs text-right">{formatDocumentID('INV', event?.date || selectedInvoice.created_at)}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-100 pb-1 mb-1">
                              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase">Date:</span>
                              <span className="text-xs text-right">{new Date(selectedInvoice.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-100 pb-1 mb-1">
                              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase">Due Date:</span>
                              <span className="text-xs text-right">{new Date(selectedInvoice.due_date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-100 pb-1 mb-1">
                              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase">Status:</span>
                              <span className={`text-xs text-right font-bold ${
                                selectedInvoice.status === 'paid' ? 'text-green-600' : 
                                selectedInvoice.status === 'overdue' ? 'text-red-600' : 
                                'text-blue-600'
                              }`}>{selectedInvoice.status.toUpperCase()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Table */}
                        <div className="mb-8">
                          <div className="flex bg-[#f5f0eb] py-2 px-2 mb-2">
                            <div className="w-1/12 text-xs font-bold text-gray-900 dark:text-white dark:text-white uppercase text-center">No</div>
                            <div className="w-8/12 text-xs font-bold text-gray-900 dark:text-white dark:text-white uppercase">Description</div>
                            <div className="w-3/12 text-xs font-bold text-gray-900 dark:text-white dark:text-white uppercase text-right">Amount</div>
                          </div>
                          
                          {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                            selectedInvoice.items.map((item, index) => (
                              <div key={index} className="flex border-b border-gray-100 py-2 px-2">
                                <div className="w-1/12 text-xs text-gray-900 dark:text-white dark:text-white text-center">{index + 1}</div>
                                <div className="w-8/12 text-xs text-gray-900 dark:text-white dark:text-white">{item.description}</div>
                                <div className="w-3/12 text-xs text-gray-900 dark:text-white dark:text-white text-right">
                                  ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="flex border-b border-gray-100 py-2 px-2">
                              <div className="w-1/12 text-xs text-gray-900 dark:text-white dark:text-white text-center">1</div>
                              <div className="w-8/12 text-xs text-gray-900 dark:text-white dark:text-white">Invoice Services</div>
                              <div className="w-3/12 text-xs text-gray-900 dark:text-white dark:text-white text-right">
                                ${selectedInvoice.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Totals */}
                        <div className="flex justify-end mb-12">
                          <div className="w-5/12">
                            <div className="flex justify-between bg-[#f5f0eb] py-2 px-2 mt-2">
                              <span className="text-xs font-bold text-gray-900 dark:text-white dark:text-white uppercase">Total</span>
                              <span className="text-xs font-bold text-gray-900 dark:text-white dark:text-white">
                                ${selectedInvoice.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t border-gray-100 pt-6 text-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-widest bg-[#f5f0eb] inline-block px-4 py-1">
                            Thank you for your business!
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="mt-8 flex justify-end">
                          {selectedInvoice.status !== 'paid' && (
                            <button
                              onClick={() => handlePayInvoice(selectedInvoice)}
                              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                              <CreditCard className="h-5 w-5 mr-2" />
                              Pay Now
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white mb-4">Leave a Review</h3>
                  <div className="text-center py-8">
                    <div className="flex justify-center space-x-2 mb-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className="h-8 w-8 text-yellow-400 cursor-pointer hover:scale-110 transition-transform" />
                      ))}
                    </div>
                    <textarea 
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                      rows={4}
                      placeholder="Tell us about your experience..."
                    ></textarea>
                    <button className="mt-4 bg-primary text-white px-6 py-2 rounded-md hover:bg-primary/90">
                      Submit Review
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Processing Overlay */}
      {processing && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg p-8 max-w-sm w-full text-center shadow-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white mb-2">Processing...</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">Please wait while we save your changes.</p>
          </div>
        </div>
      )}

      {nextStepPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-xl shadow-2xl p-6">
            <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">Next Step</p>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              {nextStepPrompt.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              {nextStepPrompt.message}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={dismissNextStepPrompt}
                className="w-full sm:w-1/2 border border-gray-300 dark:border-gray-600 rounded-md py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Stay here
              </button>
              <button
                type="button"
                onClick={handleProceedToNextStep}
                className="w-full sm:w-1/2 bg-primary text-white rounded-md py-2 text-sm font-semibold shadow hover:bg-primary/90"
              >
                {nextStepPrompt.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

 
