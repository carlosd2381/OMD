import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { clientService } from '../../services/clientService';
import { eventService } from '../../services/eventService';
import { venueService } from '../../services/venueService';
import { plannerService } from '../../services/plannerService';
import { quoteService } from '../../services/quoteService';
import { settingsService, type BrandingSettings } from '../../services/settingsService';
import { tokenService } from '../../services/tokenService';
import { invoiceService } from '../../services/invoiceService';
import { formatDocumentID, formatPhoneNumber } from '../../utils/formatters';
import { buildDocSequenceMap, buildEventSequenceMap, buildEventsMap, resolveDocumentId } from '../../utils/documentSequences';
import { CONTRACT_HEADER_HTML } from '../../constants/contractTemplate';
import { SignatureCertificate } from '../../components/SignatureCertificate';
import { generateDocumentFingerprint } from '../../utils/fingerprint';
import {
  buildContractInvoiceSchedule,
  hydrateContractContent,
  parseContractContentBlocks,
} from './contractPdfUtils';
import toast from 'react-hot-toast';
import type { Contract } from '../../types/contract';
import type { Client } from '../../types/client';
import type { Event } from '../../types/event';
import type { Venue } from '../../types/venue';
import type { Planner } from '../../types/planner';
import type { Quote } from '../../types/quote';
import type { Invoice } from '../../types/invoice';

export default function ContractViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contract, setContract] = useState<Contract | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [planner, setPlanner] = useState<Planner | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [documentId, setDocumentId] = useState('');
  const [documentFingerprint, setDocumentFingerprint] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      try {
        // Fetch Contract
        const { data: contractData, error } = await supabase
          .from('contracts')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        const contract = contractData as unknown as Contract;
        setContract(contract);

        // Fetch Related Data
        const [clientData, eventData, brandingData] = await Promise.all([
          clientService.getClient(contract.client_id),
          eventService.getEvent(contract.event_id),
          settingsService.getBrandingSettings()
        ]);

        setClient(clientData);
        setEvent(eventData);
        setBranding(brandingData);

        // Fetch Venue, Planner, Quote if event exists
        if (eventData) {
          if (eventData.venue_id) {
            const venueData = await venueService.getVenue(eventData.venue_id);
            setVenue(venueData);
          }
          if (eventData.planner_id) {
            const plannerData = await plannerService.getPlanner(eventData.planner_id);
            setPlanner(plannerData);
          }
          const [quotes, relatedInvoices] = await Promise.all([
            quoteService.getQuotesByEvent(eventData.id),
            contract.quote_id
              ? invoiceService.getInvoicesByQuote(contract.quote_id)
              : invoiceService.getInvoicesByEvent(eventData.id)
          ]);
          if (quotes.length > 0) {
            setQuote(quotes[0]); // Use the most recent quote
          }
          setInvoices(relatedInvoices);
        }

        const [eventsList, contractScope] = await Promise.all([
          eventService.getEvents(),
          fetchContractScope(contract)
        ]);

        const resolvedId = resolveDocumentId('CON', contract, {
          eventsMap: buildEventsMap(eventsList),
          eventSequences: buildEventSequenceMap(eventsList),
          docSequences: buildDocSequenceMap(contractScope),
          fallbackEvent: eventData || undefined
        });
        setDocumentId(resolvedId);

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  useEffect(() => {
    let active = true;
    const syncFingerprint = async () => {
      if (!contract?.content) {
        if (active) setDocumentFingerprint('');
        return;
      }
      const hash = await generateDocumentFingerprint(contract.content);
      if (active) setDocumentFingerprint(hash);
    };
    syncFingerprint();
    return () => {
      active = false;
    };
  }, [contract?.content]);

  const handleDownloadContract = async () => {
    if (!contract || !client) {
      toast.error('Contract or client information is missing.');
      return;
    }

    try {
      setDownloading(true);
      const displayId = documentId || formatDocumentID('CON', event?.date || contract.created_at);
      const fingerprintValue = documentFingerprint || (contract.content ? await generateDocumentFingerprint(contract.content) : '');
      const relatedQuote = quote;
      const hydratedHtml = hydrateContractContent(contract, {
        client,
        event,
        venue,
        planner,
        quote: relatedQuote,
        invoices,
      });
      const contentBlocks = parseContractContentBlocks(hydratedHtml);
      const scheduleEntries = buildContractInvoiceSchedule({
        invoices,
        quote: relatedQuote,
        event,
      });

      const [{ pdf }, { ContractPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./ContractPDF'),
      ]);

      const blob = await pdf(
        <ContractPDF
          contract={contract}
          client={client}
          branding={branding}
          event={event}
          documentId={displayId}
          contentBlocks={contentBlocks}
          invoiceSchedule={scheduleEntries}
          fingerprint={fingerprintValue}
          signatureMetadata={contract.signature_metadata}
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
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!contract) return <div className="p-8">Contract not found</div>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </button>
        <button
          onClick={handleDownloadContract}
          disabled={downloading || !client}
          className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Download className="mr-2 h-4 w-4" />
          {downloading ? 'Preparing PDF...' : 'Download PDF'}
        </button>
      </div>
      
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden p-10">
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
              <p className="text-gray-500 dark:text-gray-400 dark:text-gray-400">{formatPhoneNumber(client?.phone)}</p>
            </div>
          </div>
          <div className="w-1/2 pl-10">
            <div className="flex justify-between border-b border-gray-100 pb-1 mb-1">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase">Contract ID:</span>
              <span className="text-xs text-right font-mono">
                {documentId || formatDocumentID('CON', event?.date || contract.created_at)}
              </span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1 mb-1">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase">Date:</span>
              <span className="text-xs text-right">{new Date(contract.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1 mb-1">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase">Status:</span>
              <span className={`text-xs text-right font-bold ${
                contract.status === 'signed' ? 'text-green-600' : 'text-yellow-600'
              }`}>{contract.status.toUpperCase()}</span>
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
                let content = contract.content.replace(
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
                  invoices: invoices.filter(inv => !event || inv.event_id === event.id)
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
          metadata={contract.signature_metadata}
          clientFallback={{
            name: `${client?.first_name || ''} ${client?.last_name || ''}`.trim(),
            email: client?.email || undefined,
            role: 'Client',
            signed_at: contract.signed_at,
          }}
          providerFallback={{
            name: branding?.company_name,
            email: branding?.email,
            role: 'Service Provider',
            signed_at: contract.updated_at,
          }}
          fingerprint={documentFingerprint}
        />

        {/* Signature Section */}
        <div className="mt-12 pt-8 border-t border-gray-100">
          <div className="flex justify-between items-end">
            <div className="w-5/12">
              <div className="border-b border-gray-900 mb-2 pb-2">
                {branding?.company_name || 'Oh My Desserts MX'}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase">Service Provider Signature</p>
            </div>
            
            <div className="w-5/12">
              <div className="border-b border-gray-900 mb-2 pb-2 min-h-[30px]">
                {contract.status === 'signed' ? (
                  <div className="font-script text-xl text-blue-900">
                    {contract.signed_by || `${client?.first_name} ${client?.last_name}`}
                  </div>
                ) : (
                  <div className="text-gray-400 italic">Not signed yet</div>
                )}
              </div>
              <div className="flex justify-between">
                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase">Client Signature</p>
                {contract.signed_at && (
                  <p className="text-[10px] text-gray-400">
                    {new Date(contract.signed_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 text-center text-[11px] text-gray-400">
          Document ID {documentId || 'CON-UNKNOWN'} • Version v{contract.document_version || 1}.0 • Fingerprint {documentFingerprint || 'pending'}
        </div>
      </div>
    </div>
  );
}

type ContractSequenceRow = Pick<Contract, 'id' | 'event_id' | 'created_at' | 'client_id'>;

async function fetchContractScope(contract: Contract): Promise<ContractSequenceRow[]> {
  let query = supabase
    .from('contracts')
    .select('id, event_id, created_at, client_id')
    .order('created_at', { ascending: true });

  if (contract.event_id) {
    query = query.eq('event_id', contract.event_id);
  } else {
    query = query.eq('client_id', contract.client_id).is('event_id', null);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as ContractSequenceRow[];
}
