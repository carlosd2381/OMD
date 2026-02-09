import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Edit, Loader2 } from 'lucide-react';
import { quoteService } from '../../services/quoteService';
import { clientService } from '../../services/clientService';
import { eventService } from '../../services/eventService';
import { settingsService, type BrandingSettings } from '../../services/settingsService';
import { formatCurrency, formatDocumentID, parseDateInput } from '../../utils/formatters';
import { currencyService } from '../../services/currencyService';
import type { Quote } from '../../types/quote';
import type { Client } from '../../types/client';
import type { Event } from '../../types/event';
import toast from 'react-hot-toast';

export default function QuoteViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      try {
        const [quoteData, brandingData] = await Promise.all([
          quoteService.getQuote(id),
          settingsService.getBrandingSettings(),
        ]);

        if (quoteData) {
          setQuote(quoteData);
          const [clientData, eventData] = await Promise.all([
            clientService.getClient(quoteData.client_id),
            eventService.getEvent(quoteData.event_id)
          ]);
          setClient(clientData);
          setEvent(eventData);
        }

        setBranding(brandingData);
      } catch (error) {
        console.error('Error loading quote:', error);
        toast.error('Failed to load quote details');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (!quote || !client) return <div className="p-8">Quote not found</div>;

  // Calculate totals (MXN base)
  const subtotal = quote.items.reduce((sum, item) => sum + item.total, 0);
  const taxNet = quote.taxes?.reduce((sum, tax) => sum + (tax.is_retention ? -tax.amount : tax.amount), 0) || 0;
  const totalBase = subtotal + taxNet;
  const effectiveRate = quote.currency === 'MXN'
    ? 1
    : (quote.exchange_rate || currencyService.getRate(quote.currency));
  const safeRate = effectiveRate > 0 ? effectiveRate : 1;
  const showConvertedValues = quote.currency !== 'MXN' && safeRate > 0;

  const formatBaseCurrency = (amount: number) => formatCurrency(amount, 'MXN');
  const formatConvertedCurrency = (amount: number) => formatCurrency(amount / safeRate, quote.currency);
  const MoneyDisplay = ({ amount, align = 'right' }: { amount: number; align?: 'left' | 'right' }) => (
    <div className={`flex flex-col ${align === 'right' ? 'items-end text-right' : ''}`}>
      <span>{formatBaseCurrency(amount)}</span>
      {showConvertedValues && (
        <span className="text-[10px] text-gray-500 dark:text-gray-400">
          ≈ {formatConvertedCurrency(amount)} ({quote.currency})
        </span>
      )}
    </div>
  );
  
  // Quote Number generation
  const quoteNumber = formatDocumentID('QT', event?.date || quote.created_at);
  const eventDateDisplay = event?.date ? parseDateInput(event.date).toLocaleDateString() : null;
  const quoteDateDisplay = parseDateInput(quote.created_at).toLocaleDateString();
  const validUntilDisplay = parseDateInput(quote.valid_until).toLocaleDateString();

  const handleDownloadQuote = async () => {
    if (!quote || !client) {
      toast.error('Quote or client information is missing.');
      return;
    }

    try {
      setDownloading(true);
      const itemsForPdf = quote.items?.map((item, index) => ({
        ...item,
        id: item.id || `item-${index}`,
      })) ?? [];

      const totalsForPdf = {
        subtotal,
        tax: taxNet,
        total: totalBase,
      };

      const [{ pdf }, { QuotePDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./QuotePDF'),
      ]);

      const blob = await pdf(
        <QuotePDF
          quote={quote}
          client={client}
          branding={branding}
          items={itemsForPdf}
          totals={totalsForPdf}
          quoteNumber={quoteNumber}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${quoteNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Quote PDF downloaded');
    } catch (error) {
      console.error('Error generating quote PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  };

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
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadQuote}
            disabled={downloading || !client}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {downloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {downloading ? 'Preparing PDF...' : 'Download PDF'}
          </button>
          <button
            onClick={() => navigate(`/quotes/${id}/edit`)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90"
          >
            <Edit className="h-4 w-4 mr-2" /> Edit Quote
          </button>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow-lg sm:rounded-lg overflow-hidden p-10 min-h-[800px]">
        {/* Header */}
        <div className="flex justify-between items-start mb-12">
          <div>
            <h2 className="text-3xl font-serif text-gray-900 dark:text-white dark:text-white uppercase tracking-widest mb-2">Price Quote</h2>
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
            <h4 className="text-xs font-bold text-gray-900 dark:text-white dark:text-white uppercase mb-2">Prepared For</h4>
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
            {event && (
               <div className="mt-4">
                 <h4 className="text-xs font-bold text-gray-900 dark:text-white dark:text-white uppercase mb-2">Event Details</h4>
                 <div className="text-xs text-gray-900 dark:text-white dark:text-white">
                   <p className="mb-1">{event.name}</p>
                   {eventDateDisplay && (
                     <p className="text-gray-500 dark:text-gray-400 dark:text-gray-400">{eventDateDisplay}</p>
                   )}
                 </div>
               </div>
            )}
          </div>
          <div className="w-1/2 pl-10">
            <div className="flex justify-between border-b border-gray-100 pb-1 mb-1">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase">Quote #:</span>
              <span className="text-xs text-right font-mono">{quoteNumber}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1 mb-1">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase">Date:</span>
              <span className="text-xs text-right">{quoteDateDisplay}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1 mb-1">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase">Valid Until:</span>
              <span className="text-xs text-right">{validUntilDisplay}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1 mb-1">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase">Status:</span>
              <span className={`text-xs text-right font-bold ${
                quote.status === 'accepted' ? 'text-green-600' : 
                quote.status === 'rejected' ? 'text-red-600' : 
                'text-blue-600'
              }`}>{quote.status.toUpperCase()}</span>
            </div>
            {showConvertedValues && (
              <div className="flex justify-between border-b border-gray-100 pb-1 mb-1">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase">Exchange Rate:</span>
                <span className="text-xs text-right">1 {quote.currency} ≈ {formatBaseCurrency(safeRate)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="mb-8">
          <div className="flex bg-[#f5f0eb] py-2 px-2 mb-2">
            <div className="w-7/12 text-xs font-bold text-gray-900 dark:text-white dark:text-white uppercase">Description</div>
            <div className="w-2/12 text-xs font-bold text-gray-900 dark:text-white dark:text-white uppercase text-right">Qty</div>
            <div className="w-3/12 text-xs font-bold text-gray-900 dark:text-white dark:text-white uppercase text-right">Total</div>
          </div>
          
          {quote.items && quote.items.length > 0 ? (
            quote.items.map((item, index) => (
              <div key={index} className="flex border-b border-gray-100 py-2 px-2">
                <div className="w-7/12 text-xs text-gray-900 dark:text-white dark:text-white">{item.description}</div>
                <div className="w-2/12 text-xs text-gray-900 dark:text-white dark:text-white text-right">{item.quantity}</div>
                <div className="w-3/12 text-xs text-gray-900 dark:text-white dark:text-white text-right">
                  <MoneyDisplay amount={item.total} />
                </div>
              </div>
            ))
          ) : (
            <div className="py-4 text-center text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">No items in this quote</div>
          )}
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-12">
          <div className="w-1/2 pl-10">
            <div className="flex justify-between py-1">
              <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">Subtotal</span>
              <MoneyDisplay amount={subtotal} />
            </div>
            {quote.taxes && quote.taxes.length > 0 && quote.taxes.map((tax, index) => (
              <div className="flex justify-between py-1" key={`${tax.name}-${index}`}>
                <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">
                  {tax.name} {typeof tax.rate === 'number' ? `(${tax.rate}%)` : ''}
                </span>
                <MoneyDisplay amount={tax.is_retention ? -tax.amount : tax.amount} />
              </div>
            ))}
            <div className="flex justify-between py-2 border-t border-gray-200 dark:border-gray-700 dark:border-gray-700 mt-2">
              <span className="text-sm font-bold text-gray-900 dark:text-white dark:text-white">Total</span>
              <MoneyDisplay amount={totalBase} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center border-t border-gray-100 pt-8">
          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 mb-1">This quote is valid until {new Date(quote.valid_until).toLocaleDateString()}</p>
          <p className="text-[10px] text-gray-400">
            {branding?.company_name || 'Oh My Desserts MX'}
          </p>
        </div>
      </div>
    </div>
  );
}
