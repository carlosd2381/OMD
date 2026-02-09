import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { eventService } from '../../services/eventService';
import { settingsService, type BrandingSettings } from '../../services/settingsService';
import { formatDocumentID } from '../../utils/formatters';
import { buildDocSequenceMap, buildEventSequenceMap, buildEventsMap, resolveDocumentId } from '../../utils/documentSequences';
import type { Invoice } from '../../types/invoice';

export default function InvoiceViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [documentId, setDocumentId] = useState('');

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
        const typedInvoice = invoiceData as unknown as Invoice;
        setInvoice(typedInvoice);

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

  const client = (invoice as any).client;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </button>
      </div>
      
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow-lg sm:rounded-lg overflow-hidden p-10 min-h-[800px]">
        {/* Header */}
        <div className="flex justify-between items-start mb-12">
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
        <div className="flex justify-between mb-12">
          <div className="w-1/2">
            <h4 className="text-xs font-bold text-gray-900 dark:text-white dark:text-white uppercase mb-2">Bill To</h4>
            <div className="text-xs text-gray-900 dark:text-white dark:text-white">
              <p className="mb-1 font-bold">{client?.first_name} {client?.last_name}</p>
              <p className="text-gray-500 dark:text-gray-400 dark:text-gray-400 mb-1">{client?.email}</p>
              <p className="text-gray-500 dark:text-gray-400 dark:text-gray-400 mb-1">{client?.phone}</p>
              {client?.address && <p className="text-gray-500 dark:text-gray-400 dark:text-gray-400">{client.address}</p>}
              {(client?.city || client?.state) && (
                <p className="text-gray-500 dark:text-gray-400 dark:text-gray-400">
                  {[client.city, client.state, client.zip_code].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          </div>
          <div className="w-1/2 pl-10">
            <div className="flex justify-between border-b border-gray-100 pb-1 mb-1">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase">Invoice #:</span>
              <span className="text-xs text-right font-mono">
                {documentId || formatDocumentID('INV', (invoice as any).event?.date || invoice.created_at)}
              </span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1 mb-1">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase">Date:</span>
              <span className="text-xs text-right">{new Date(invoice.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1 mb-1">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase">Due Date:</span>
              <span className="text-xs text-right">{new Date(invoice.due_date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1 mb-1">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase">Status:</span>
              <span className={`text-xs text-right font-bold ${
                invoice.status === 'paid' ? 'text-green-600' : 
                invoice.status === 'overdue' ? 'text-red-600' : 
                'text-blue-600'
              }`}>{invoice.status.toUpperCase()}</span>
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
          
          {invoice.items && invoice.items.length > 0 ? (
            invoice.items.map((item, index) => (
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
                ${invoice.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-12">
          <div className="w-1/2 pl-10">
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
              <span className="text-sm font-bold text-gray-900 dark:text-white dark:text-white">Total</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white dark:text-white">
                ${invoice.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center border-t border-gray-100 pt-8">
          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 mb-1">Thank you for your business!</p>
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
