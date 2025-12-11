import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PDFViewer } from '@react-pdf/renderer';
import { QuotePDF } from './QuotePDF';
import { quoteService } from '../../services/quoteService';
import { clientService } from '../../services/clientService';
import { settingsService, type BrandingSettings } from '../../services/settingsService';
import type { Quote } from '../../types/quote';
import type { Client } from '../../types/client';
import toast from 'react-hot-toast';
import { ArrowLeft, Edit } from 'lucide-react';

export default function QuoteViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [quotePrefix, setQuotePrefix] = useState('QTE');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      try {
        const [quoteData, brandingData, financialSettings] = await Promise.all([
          quoteService.getQuote(id),
          settingsService.getBrandingSettings(),
          settingsService.getFinancialSettings(),
        ]);

        if (quoteData) {
          setQuote(quoteData);
          const clientData = await clientService.getClient(quoteData.client_id);
          setClient(clientData);
        }

        setBranding(brandingData);
        if (financialSettings?.quote_sequence_prefix) {
          setQuotePrefix(financialSettings.quote_sequence_prefix);
        }
      } catch (error) {
        console.error('Error loading quote:', error);
        toast.error('Failed to load quote details');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (!quote || !client) return <div className="flex justify-center items-center h-screen">Quote not found</div>;

  // Calculate totals
  const subtotal = quote.items.reduce((sum, item) => sum + item.total, 0);
  const tax = quote.total_amount - subtotal;
  
  // Quote Number generation
  const quoteNumber = `${quotePrefix}-${new Date(quote.created_at).getFullYear().toString().substr(-2)}${String(new Date(quote.created_at).getMonth() + 1).padStart(2, '0')}${String(new Date(quote.created_at).getDate()).padStart(2, '0')}-001-001`;

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <header className="bg-white shadow px-4 py-4 flex justify-between items-center z-10">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="mr-4 text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Quote Viewer</h1>
        </div>
        <button
          onClick={() => navigate(`/quotes/${id}/edit`)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700"
        >
          <Edit className="h-4 w-4 mr-2" /> Edit Quote
        </button>
      </header>
      <div className="flex-1 p-4 overflow-hidden">
        <PDFViewer width="100%" height="100%" className="rounded-lg shadow-lg border-none">
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
        </PDFViewer>
      </div>
    </div>
  );
}
