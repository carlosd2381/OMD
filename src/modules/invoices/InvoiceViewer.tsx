import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { eventService } from '../../services/eventService';
import { settingsService, type BrandingSettings } from '../../services/settingsService';
import { activityLogService, type DocumentNotificationStatus } from '../../services/activityLogService';
import { NotificationStatus } from '../../components/NotificationStatus';
import { formatDocumentID } from '../../utils/formatters';
import { buildDocSequenceMap, buildEventSequenceMap, buildEventsMap, resolveDocumentId } from '../../utils/documentSequences';
import { buildQuotePathFromLegacyInvoice } from '../../utils/quoteNavigation';
import type { Invoice } from '../../types/invoice';
import type { Quote } from '../../types/quote';

type InvoiceViewerClient = {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
};

type InvoiceViewerEvent = {
  name?: string;
  date?: string;
};

type InvoiceWithRelations = Invoice & {
  client?: InvoiceViewerClient;
  event?: InvoiceViewerEvent;
};

export default function InvoiceViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<InvoiceWithRelations | null>(null);
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [documentId, setDocumentId] = useState('');
  const [notificationStatus, setNotificationStatus] = useState<DocumentNotificationStatus | null>(null);
  const [activeRevisionQuoteId, setActiveRevisionQuoteId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      
      try {
        // Fetch Invoice
        const { data: invoiceData, error } = await supabase
          .from('invoices')
          .select(`
            *,
            client:clients (first_name, last_name, email, phone, address, city, state, zip_code),
            event:events (name, date)
          `)
          .eq('id', id)
          .single();
        
        if (error) throw error;
        const typedInvoice = invoiceData as unknown as InvoiceWithRelations;
        setInvoice(typedInvoice);
        setActiveRevisionQuoteId(null);

        if (typedInvoice.client_id && typedInvoice.id) {
          const statusData = await activityLogService.getLatestDocumentNotificationStatus(typedInvoice.client_id, 'invoice', typedInvoice.id);
          setNotificationStatus(statusData);
        }

        if (typedInvoice.quote_id) {
          let quoteQuery = supabase
            .from('quotes')
            .select('id, parent_quote_id, version, client_id, event_id, created_at')
            .order('created_at', { ascending: true });

          if (typedInvoice.event_id) {
            quoteQuery = quoteQuery.eq('event_id', typedInvoice.event_id);
          } else {
            quoteQuery = quoteQuery.eq('client_id', typedInvoice.client_id).is('event_id', null);
          }

          const { data: quoteRows, error: quoteError } = await quoteQuery;
          if (quoteError) throw quoteError;

          const quotes = (quoteRows || []) as Pick<Quote, 'id' | 'parent_quote_id' | 'version' | 'created_at'>[];
          const quoteById = new Map(quotes.map((quote) => [quote.id, quote]));
          const getRootQuoteId = (quoteId: string) => {
            let current = quoteById.get(quoteId);
            const seen = new Set<string>();

            while (current?.parent_quote_id && quoteById.has(current.parent_quote_id) && !seen.has(current.parent_quote_id)) {
              seen.add(current.id);
              current = quoteById.get(current.parent_quote_id);
            }

            return current?.id || quoteId;
          };

          const currentQuote = quoteById.get(typedInvoice.quote_id);
          if (currentQuote) {
            const currentRoot = getRootQuoteId(currentQuote.id);
            const revisionChain = quotes
              .filter((quote) => getRootQuoteId(quote.id) === currentRoot)
              .sort((a, b) => (a.version || 1) - (b.version || 1));
            const activeQuote = revisionChain[revisionChain.length - 1];

            if (activeQuote && activeQuote.id !== currentQuote.id) {
              setActiveRevisionQuoteId(activeQuote.id);
            }
          }
        }

        // Fetch Branding
        const [brandingData, eventsList, invoiceScope] = await Promise.all([
          settingsService.getBrandingSettings(),
          eventService.getEvents(),
          fetchInvoiceScope(typedInvoice)
        ]);
        setBranding(brandingData);

        const resolvedId = resolveDocumentId('INV', typedInvoice, {
          eventsMap: buildEventsMap(eventsList),
          eventSequences: buildEventSequenceMap(eventsList),
          docSequences: buildDocSequenceMap(invoiceScope)
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

  if (loading) return <div className="p-8">Loading...</div>;
  if (!invoice) return <div className="p-8">Invoice not found</div>;

  const client = invoice.client;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </button>
      </div>
      
      <div className="bg-white dark:bg-gray-800 shadow-lg sm:rounded-lg overflow-hidden p-10 min-h-[800px]">
        {activeRevisionQuoteId && (
          <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-amber-900">
              This invoice belongs to a legacy quote revision.
            </p>
            <button
              onClick={() => navigate(buildQuotePathFromLegacyInvoice(activeRevisionQuoteId, { invoiceId: id }))}
              title="View active quote"
              aria-label="View active quote"
              className="inline-flex items-center px-3 py-1.5 border border-amber-300 text-xs font-medium rounded-md text-amber-900 bg-white hover:bg-amber-100"
            >
              View active quote
            </button>
          </div>
        )}
        {/* Header */}
        <div className="flex justify-between items-start mb-12">
          <div>
            <h2 className="text-3xl font-serif text-gray-900 dark:text-white uppercase tracking-widest mb-2">Invoice</h2>
            <div className="text-xs font-bold uppercase mb-1">{branding?.company_name || 'Oh My Desserts MX'}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{branding?.address || 'Priv. Palmilla, Jardines del Sur II, Benito Juarez, Quintana Roo, 77535'}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{branding?.website || 'www.ohmydessertsmx.com'} | {branding?.email || 'info@ohmydessertsmx.com'}</div>
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
        <div className="flex justify-between mb-12">
          <div className="w-1/2">
            <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase mb-2">Bill To</h4>
            <div className="text-xs text-gray-900 dark:text-white">
              <p className="mb-1 font-bold">{client?.first_name} {client?.last_name}</p>
              <p className="text-gray-500 dark:text-gray-400 mb-1">{client?.email}</p>
              <p className="text-gray-500 dark:text-gray-400 mb-1">{client?.phone}</p>
              {client?.address && <p className="text-gray-500 dark:text-gray-400">{client.address}</p>}
              {(client?.city || client?.state) && (
                <p className="text-gray-500 dark:text-gray-400">
                  {[client.city, client.state, client.zip_code].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          </div>
          <div className="w-1/2 pl-10">
            <div className="flex justify-between border-b border-gray-100 pb-1 mb-1">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Invoice #:</span>
              <span className="text-xs text-right font-mono">
                {documentId || formatDocumentID('INV', invoice.event?.date || invoice.created_at)}
              </span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1 mb-1">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Date:</span>
              <span className="text-xs text-right">{new Date(invoice.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1 mb-1">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Due Date:</span>
              <span className="text-xs text-right">{new Date(invoice.due_date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1 mb-1">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Status:</span>
              <span className={`text-xs text-right font-bold ${
                invoice.status === 'paid' ? 'text-green-600' : 
                invoice.status === 'overdue' ? 'text-red-600' : 
                'text-blue-600'
              }`}>{invoice.status.toUpperCase()}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1 mb-1">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Notification:</span>
              <NotificationStatus status={notificationStatus} showDate />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="mb-8">
          <div className="flex bg-[#f5f0eb] py-2 px-2 mb-2">
            <div className="w-1/12 text-xs font-bold text-gray-900 dark:text-white uppercase text-center">No</div>
            <div className="w-8/12 text-xs font-bold text-gray-900 dark:text-white uppercase">Description</div>
            <div className="w-3/12 text-xs font-bold text-gray-900 dark:text-white uppercase text-right">Amount</div>
          </div>
          
          {invoice.items && invoice.items.length > 0 ? (
            invoice.items.map((item, index) => (
              <div key={index} className="flex border-b border-gray-100 py-2 px-2">
                <div className="w-1/12 text-xs text-gray-900 dark:text-white text-center">{index + 1}</div>
                <div className="w-8/12 text-xs text-gray-900 dark:text-white">{item.description}</div>
                <div className="w-3/12 text-xs text-gray-900 dark:text-white text-right">
                  ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))
          ) : (
            <div className="flex border-b border-gray-100 py-2 px-2">
              <div className="w-1/12 text-xs text-gray-900 dark:text-white text-center">1</div>
              <div className="w-8/12 text-xs text-gray-900 dark:text-white">Invoice Services</div>
              <div className="w-3/12 text-xs text-gray-900 dark:text-white text-right">
                ${invoice.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-12">
          <div className="w-1/2 pl-10">
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm font-bold text-gray-900 dark:text-white">Total</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                ${invoice.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center border-t border-gray-100 pt-8">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Thank you for your business!</p>
          <p className="text-[10px] text-gray-400">
            Please make checks payable to {branding?.company_name || 'Oh My Desserts MX'}
          </p>
        </div>
      </div>
    </div>
  );
}

type InvoiceSequenceRow = Pick<Invoice, 'id' | 'event_id' | 'created_at' | 'client_id'>;

async function fetchInvoiceScope(invoice: Invoice): Promise<InvoiceSequenceRow[]> {
  let query = supabase
    .from('invoices')
    .select('id, event_id, created_at, client_id')
    .order('created_at', { ascending: true });

  if (invoice.event_id) {
    query = query.eq('event_id', invoice.event_id);
  } else {
    query = query.eq('client_id', invoice.client_id).is('event_id', null);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as InvoiceSequenceRow[];
}
