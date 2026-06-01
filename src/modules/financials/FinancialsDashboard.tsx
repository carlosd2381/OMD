import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { DollarSign, FileText, ArrowUpRight, ArrowDownRight, PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/formatters';
import { financialModuleService } from '../../services/financialModuleService';
import type { CreateFinancialTransactionInput, FinancialTransaction, InvoiceTrackingRow } from '../../types/financialModule';

type AutoStatusUpdateMessage = {
  invoiceId: string;
  previousStatus: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  nextStatus: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  occurredAt: string;
};

type InvoiceStatusFilter = 'all' | 'overdue' | 'settled' | 'open';

const FILTER_STORAGE_KEYS = {
  showOnlyAutoUpdated: 'financials.showOnlyAutoUpdated',
  invoiceStatusFilter: 'financials.invoiceStatusFilter',
} as const;

const DEFAULT_FORM: CreateFinancialTransactionInput = {
  direction: 'received',
  amount: 0,
  currency: 'MXN',
  transaction_date: new Date().toISOString().split('T')[0],
  payment_method: '',
  reference: '',
  notes: '',
  invoice_id: '',
  client_id: '',
  event_id: '',
  status: 'cleared',
};

export default function FinancialsDashboard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invoiceRows, setInvoiceRows] = useState<InvoiceTrackingRow[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [form, setForm] = useState<CreateFinancialTransactionInput>(DEFAULT_FORM);
  const [lastAutoStatusUpdate, setLastAutoStatusUpdate] = useState<AutoStatusUpdateMessage | null>(null);
  const [autoUpdatedInvoices, setAutoUpdatedInvoices] = useState<Record<string, AutoStatusUpdateMessage>>({});
  const [showOnlyAutoUpdated, setShowOnlyAutoUpdated] = useState(() => {
    try {
      const value = window.localStorage.getItem(FILTER_STORAGE_KEYS.showOnlyAutoUpdated);
      return value === 'true';
    } catch {
      return false;
    }
  });
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<InvoiceStatusFilter>(() => {
    try {
      const value = window.localStorage.getItem(FILTER_STORAGE_KEYS.invoiceStatusFilter);
      if (value === 'all' || value === 'overdue' || value === 'settled' || value === 'open') {
        return value;
      }
      return 'all';
    } catch {
      return 'all';
    }
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [invoicesData, transactionData] = await Promise.all([
        financialModuleService.getInvoiceTrackingRows(),
        financialModuleService.getTransactions(),
      ]);

      const persistedAutoUpdates = await financialModuleService.getLatestInvoiceAutoUpdateMap(
        invoicesData.map((invoice) => invoice.id)
      );

      const persistedAutoUpdateMessages: Record<string, AutoStatusUpdateMessage> = Object.fromEntries(
        Object.entries(persistedAutoUpdates)
          .filter(([, audit]) => Boolean(audit))
          .map(([invoiceId, audit]) => [
            invoiceId,
            {
              invoiceId,
              previousStatus: audit!.previousStatus,
              nextStatus: audit!.nextStatus,
              occurredAt: audit!.createdAt,
            },
          ])
      );

      setInvoiceRows(invoicesData);
      setTransactions(transactionData);
      setAutoUpdatedInvoices((prev) => ({
        ...persistedAutoUpdateMessages,
        ...prev,
      }));
    } catch (error) {
      console.error('Failed to load financial module data', error);
      toast.error('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(FILTER_STORAGE_KEYS.showOnlyAutoUpdated, String(showOnlyAutoUpdated));
    } catch {
      // no-op
    }
  }, [showOnlyAutoUpdated]);

  useEffect(() => {
    try {
      window.localStorage.setItem(FILTER_STORAGE_KEYS.invoiceStatusFilter, invoiceStatusFilter);
    } catch {
      // no-op
    }
  }, [invoiceStatusFilter]);

  const totals = useMemo(() => {
    const totalInvoiced = invoiceRows.reduce((sum, row) => sum + row.total_amount, 0);
    const totalReceived = transactions
      .filter((entry) => entry.direction === 'received' && entry.status === 'cleared')
      .reduce((sum, entry) => sum + entry.amount, 0);
    const totalSent = transactions
      .filter((entry) => entry.direction === 'sent' && entry.status === 'cleared')
      .reduce((sum, entry) => sum + entry.amount, 0);
    const totalOutstanding = invoiceRows.reduce((sum, row) => sum + row.amount_outstanding, 0);
    const overdueCount = invoiceRows.filter((row) => row.is_overdue).length;

    return {
      totalInvoiced,
      totalReceived,
      totalSent,
      totalOutstanding,
      overdueCount,
    };
  }, [invoiceRows, transactions]);

  const filteredInvoiceRows = useMemo(() => {
    return invoiceRows.filter((row) => {
      if (showOnlyAutoUpdated && !autoUpdatedInvoices[row.id]) {
        return false;
      }

      if (invoiceStatusFilter === 'overdue') {
        return row.is_overdue;
      }

      if (invoiceStatusFilter === 'settled') {
        return row.amount_outstanding <= 0;
      }

      if (invoiceStatusFilter === 'open') {
        return row.amount_outstanding > 0 && !row.is_overdue;
      }

      return true;
    });
  }, [invoiceRows, showOnlyAutoUpdated, autoUpdatedInvoices, invoiceStatusFilter]);

  const isFilterDefault = !showOnlyAutoUpdated && invoiceStatusFilter === 'all';
  const activeFilterCount = Number(showOnlyAutoUpdated) + Number(invoiceStatusFilter !== 'all');
  const statusFilterLabel =
    invoiceStatusFilter === 'all'
      ? 'all statuses'
      : invoiceStatusFilter === 'overdue'
      ? 'overdue'
      : invoiceStatusFilter === 'settled'
      ? 'settled'
      : 'open';

  const handleResetFilters = () => {
    setShowOnlyAutoUpdated(false);
    setInvoiceStatusFilter('all');
    try {
      window.localStorage.removeItem(FILTER_STORAGE_KEYS.showOnlyAutoUpdated);
      window.localStorage.removeItem(FILTER_STORAGE_KEYS.invoiceStatusFilter);
    } catch {
      // no-op
    }
  };

  const handleSaveTransaction = async () => {
    if (!form.amount || form.amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    setSaving(true);
    try {
      const result = await financialModuleService.createTransaction({
        ...form,
        amount: Number(form.amount),
        invoice_id: form.invoice_id || undefined,
        client_id: form.client_id || undefined,
        event_id: form.event_id || undefined,
        payment_method: form.payment_method || undefined,
        reference: form.reference || undefined,
        notes: form.notes || undefined,
      });

      toast.success('Transaction saved');

      if (result.invoiceStatusSync?.changed) {
        const update = result.invoiceStatusSync;
        const autoUpdateMessage: AutoStatusUpdateMessage = {
          invoiceId: update.invoiceId,
          previousStatus: update.previousStatus,
          nextStatus: update.nextStatus,
          occurredAt: new Date().toISOString(),
        };

        setLastAutoStatusUpdate(autoUpdateMessage);
        setAutoUpdatedInvoices((prev) => ({
          ...prev,
          [autoUpdateMessage.invoiceId]: autoUpdateMessage,
        }));
        toast.success(`Invoice auto-updated: ${update.previousStatus.toUpperCase()} → ${update.nextStatus.toUpperCase()}`);
      }

      setForm({
        ...DEFAULT_FORM,
        transaction_date: new Date().toISOString().split('T')[0],
      });
      await loadData();
    } catch (error) {
      console.error('Failed to save transaction', error);
      toast.error('Failed to save transaction. Run latest DB migrations if this is the first time using Financials.');
    } finally {
      setSaving(false);
    }
  };

  const handleInvoiceSelection = (invoiceId: string) => {
    const selectedInvoice = invoiceRows.find((row) => row.id === invoiceId);
    setForm((prev) => ({
      ...prev,
      invoice_id: invoiceId,
      client_id: selectedInvoice?.client_id || '',
      event_id: selectedInvoice?.event_id || '',
      direction: 'received',
    }));
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading financials...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Financials</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Invoice tracking, payments received, and payments sent.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <SummaryCard label="Total Invoiced" value={formatCurrency(totals.totalInvoiced, 'MXN')} icon={<FileText className="h-5 w-5" />} />
        <SummaryCard label="Received" value={formatCurrency(totals.totalReceived, 'MXN')} icon={<ArrowDownRight className="h-5 w-5 text-green-600" />} />
        <SummaryCard label="Sent" value={formatCurrency(totals.totalSent, 'MXN')} icon={<ArrowUpRight className="h-5 w-5 text-red-600" />} />
        <SummaryCard label="Outstanding" value={formatCurrency(totals.totalOutstanding, 'MXN')} icon={<DollarSign className="h-5 w-5" />} />
        <SummaryCard label="Overdue Invoices" value={String(totals.overdueCount)} icon={<FileText className="h-5 w-5" />} />
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 space-y-4 sm:p-6">
        <div className="flex items-center space-x-2">
          <PlusCircle className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Log Transaction</h3>
        </div>

        {lastAutoStatusUpdate && (
          <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
            Invoice auto-updated ({new Date(lastAutoStatusUpdate.occurredAt).toLocaleTimeString()}): {lastAutoStatusUpdate.previousStatus.toUpperCase()} → {lastAutoStatusUpdate.nextStatus.toUpperCase()} ({lastAutoStatusUpdate.invoiceId.slice(0, 8)})
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Direction</label>
            <select
              value={form.direction}
              onChange={(e) => setForm((prev) => ({ ...prev, direction: e.target.value as CreateFinancialTransactionInput['direction'] }))}
              className="block w-full rounded-md border-gray-300 text-sm"
            >
              <option value="received">Received</option>
              <option value="sent">Sent</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Amount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: Number(e.target.value) }))}
              className="block w-full rounded-md border-gray-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
            <input
              type="date"
              value={form.transaction_date}
              onChange={(e) => setForm((prev) => ({ ...prev, transaction_date: e.target.value }))}
              className="block w-full rounded-md border-gray-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Method</label>
            <input
              type="text"
              value={form.payment_method || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, payment_method: e.target.value }))}
              placeholder="Bank transfer, cash, stripe..."
              className="block w-full rounded-md border-gray-300 text-sm"
            />
          </div>

          <div className="xl:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Linked Invoice (optional)</label>
            <select
              value={form.invoice_id || ''}
              onChange={(e) => handleInvoiceSelection(e.target.value)}
              className="block w-full rounded-md border-gray-300 text-sm"
            >
              <option value="">No linked invoice</option>
              {invoiceRows.map((row) => (
                <option key={row.id} value={row.id}>
                  {(row.invoice_number || row.id.slice(0, 8))} • {row.client_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Reference</label>
            <input
              type="text"
              value={form.reference || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, reference: e.target.value }))}
              placeholder="Txn ID / note"
              className="block w-full rounded-md border-gray-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              value={form.status || 'cleared'}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as CreateFinancialTransactionInput['status'] }))}
              className="block w-full rounded-md border-gray-300 text-sm"
            >
              <option value="cleared">Cleared</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
          <textarea
            value={form.notes || ''}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            rows={2}
            className="block w-full rounded-md border-gray-300 text-sm"
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSaveTransaction}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 rounded-md text-white bg-primary hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Transaction'}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700 sm:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Invoice Tracking</h3>
              {activeFilterCount > 0 && (
                <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  {activeFilterCount} active filter{activeFilterCount > 1 ? 's' : ''}
                </span>
              )}
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {filteredInvoiceRows.length} shown
              </span>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
              <label className="inline-flex w-full items-center gap-2 text-xs text-gray-600 dark:text-gray-300 sm:w-auto">
                <input
                  type="checkbox"
                  checked={showOnlyAutoUpdated}
                  onChange={(event) => setShowOnlyAutoUpdated(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                Show only auto-updated
              </label>
              <select
                value={invoiceStatusFilter}
                onChange={(event) => setInvoiceStatusFilter(event.target.value as InvoiceStatusFilter)}
                className="w-full rounded-md border-gray-300 text-xs sm:w-auto"
                aria-label="Filter invoice status"
              >
                <option value="all">All statuses</option>
                <option value="overdue">Overdue</option>
                <option value="settled">Settled</option>
                <option value="open">Open</option>
              </select>
              <button
                type="button"
                onClick={handleResetFilters}
                disabled={isFilterDefault}
                className="w-full rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                Reset filters
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase sm:px-4">Invoice</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase sm:px-4">Client</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase sm:px-4">Due</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase sm:px-4">Total</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase sm:px-4">Received</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase sm:px-4">Outstanding</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase sm:px-4">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredInvoiceRows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-300 sm:px-4">
                    <div className="flex items-center gap-2">
                      <span>{row.invoice_number || row.id.slice(0, 8)}</span>
                      {autoUpdatedInvoices[row.id] && (
                        <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700">
                          Auto-updated
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 sm:px-4">{row.client_name}</td>
                  <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 sm:px-4">{new Date(row.due_date).toLocaleDateString()}</td>
                  <td className="px-3 py-2 text-sm text-right sm:px-4">{formatCurrency(row.total_amount, 'MXN')}</td>
                  <td className="px-3 py-2 text-sm text-right text-green-700 sm:px-4">{formatCurrency(row.amount_received, 'MXN')}</td>
                  <td className="px-3 py-2 text-sm text-right text-red-700 sm:px-4">{formatCurrency(row.amount_outstanding, 'MXN')}</td>
                  <td className="px-3 py-2 text-xs sm:px-4">
                    <span className={`px-2 py-0.5 rounded-full font-semibold ${
                      row.is_overdue
                        ? 'bg-red-100 text-red-800'
                        : row.amount_outstanding <= 0
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {row.is_overdue ? 'OVERDUE' : row.amount_outstanding <= 0 ? 'SETTLED' : row.status.toUpperCase()}
                    </span>
                    {autoUpdatedInvoices[row.id] && (
                      <div className="mt-1 text-[10px] font-medium text-green-700">
                        {autoUpdatedInvoices[row.id].previousStatus.toUpperCase()} → {autoUpdatedInvoices[row.id].nextStatus.toUpperCase()}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredInvoiceRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-sm text-gray-500 sm:px-4">
                    <div className="flex flex-col items-center gap-2">
                      <span>
                        {showOnlyAutoUpdated
                          ? `No auto-updated invoices found for ${statusFilterLabel}.`
                          : `No invoices found for ${statusFilterLabel}.`}
                      </span>
                      {!isFilterDefault && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700 sm:px-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase sm:px-4">Date</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase sm:px-4">Direction</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase sm:px-4">Method</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase sm:px-4">Reference</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase sm:px-4">Amount</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase sm:px-4">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {transactions.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 sm:px-4">{new Date(entry.transaction_date).toLocaleDateString()}</td>
                  <td className="px-3 py-2 text-sm sm:px-4">
                    <span className={`px-2 py-0.5 rounded-full font-semibold text-xs ${entry.direction === 'received' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {entry.direction.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 sm:px-4">{entry.payment_method || '-'}</td>
                  <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 sm:px-4">{entry.reference || '-'}</td>
                  <td className="px-3 py-2 text-sm text-right font-medium sm:px-4">{formatCurrency(entry.amount, entry.currency)}</td>
                  <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300 sm:px-4">{entry.status.toUpperCase()}</td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-sm text-gray-500 sm:px-4">No transactions found. Add your first received/sent payment above.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 border-l-4 border-primary">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</p>
        <div className="text-gray-400">{icon}</div>
      </div>
      <p className="text-2xl font-bold dark:text-white mt-2">{value}</p>
    </div>
  );
}
