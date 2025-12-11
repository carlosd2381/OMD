import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Invoice } from '../../types/invoice';

export default function InvoiceViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInvoice() {
      if (!id) return;
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          client:clients (first_name, last_name),
          event:events (name, date)
        `)
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching invoice:', error);
      } else {
        setInvoice(data as unknown as Invoice);
      }
      setLoading(false);
    }
    fetchInvoice();
  }, [id]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (!invoice) return <div className="p-8">Invoice not found</div>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </button>
      </div>
      
      <div className="bg-white shadow sm:rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Invoice #{invoice.invoice_number}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Due Date: {invoice.due_date}
            </p>
            {(invoice as any).client && (
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Client: {(invoice as any).client.first_name} {(invoice as any).client.last_name}
              </p>
            )}
            {(invoice as any).event && (
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Event: {(invoice as any).event.name} ({(invoice as any).event.date})
              </p>
            )}
          </div>
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
            invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {invoice.status.toUpperCase()}
          </span>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-4">
            <span className="text-gray-600">Total Amount</span>
            <span className="text-2xl font-bold text-gray-900">${invoice.total_amount}</span>
          </div>
          
          <h4 className="text-md font-medium text-gray-900 mb-4">Line Items</h4>
          <ul className="divide-y divide-gray-200">
            {invoice.items.map((item: any, index: number) => (
              <li key={index} className="py-4 flex justify-between">
                <span className="text-gray-900">{item.description}</span>
                <span className="text-gray-600">${item.amount}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
