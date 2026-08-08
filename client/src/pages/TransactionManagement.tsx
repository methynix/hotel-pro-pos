import { FC, useEffect, useState } from 'react';
import { MdPrint, MdDelete, MdFilterList, MdClose } from 'react-icons/md';
import { transactionService } from '../services/transactionService';
import { receiptService } from '../services/receiptService';
import { Transaction } from '../types/index';
import { SafeText } from '../utils/SafeText';

const TransactionManagement: FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showFilter, setShowFilter] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    dateFrom: '',
    dateTo: '',
    amountMin: '',
    amountMax: '',
    status: '',
    type: '',
  });

  useEffect(() => {
    loadTransactions();
  }, [page, filters]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const result = await transactionService.getAllTransactions({ page, limit: 20 });

      // Apply client-side filtering
      let filtered: Transaction[] = result.transactions;

      if (filters.search) {
        filtered = filtered.filter((t: Transaction) =>
          t.description.toLowerCase().includes(filters.search.toLowerCase())
        );
      }

      if (filters.status) {
        filtered = filtered.filter((t: Transaction) => t.status === filters.status);
      }

      if (filters.type) {
        filtered = filtered.filter((t: Transaction) => t.type === filters.type);
      }

      if (filters.amountMin) {
        filtered = filtered.filter((t: Transaction) => t.amount >= parseFloat(filters.amountMin));
      }

      if (filters.amountMax) {
        filtered = filtered.filter((t: Transaction) => t.amount <= parseFloat(filters.amountMax));
      }

      setTransactions(filtered);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReceipt = async (transactionId: string) => {
    try {
      // Generate or get receipt
      let receipt = await receiptService.getReceiptsByTransaction(transactionId).catch(() => null);
      if (!receipt) {
        receipt = await receiptService.generateReceipt(transactionId);
      }

      // Print receipt
      const html = await receiptService.printReceipt(receipt._id);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
      }
    } catch (error) {
      console.error('Failed to print receipt:', error);
      alert('Failed to print receipt');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await transactionService.deleteTransaction(id);
      setTransactions(transactions.filter(t => t._id !== id));
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      alert('Failed to delete transaction');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success-100 text-success-700';
      case 'pending':
        return 'bg-warning-100 text-warning-700';
      case 'failed':
        return 'bg-danger-100 text-danger-700';
      default:
        return 'bg-secondary-100 text-secondary-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-text-primary mb-2">Transactions</h1>
          <p className="text-text-secondary">Manage and track all financial transactions</p>
        </div>
        <button
          onClick={() => setShowFilter(!showFilter)}
          className="flex items-center gap-2 px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white rounded-lg font-medium transition-colors"
        >
          <MdFilterList className="w-5 h-5" />
          Filter
        </button>
      </div>

      {/* Filter Panel */}
      {showFilter && (
        <div className="bg-surface rounded-xl border border-border shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-text-primary">Filter Transactions</h2>
            <button
              onClick={() => setShowFilter(false)}
              className="p-1 hover:bg-background rounded transition-colors"
            >
              <MdClose className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Search description..."
              value={filters.search}
              onChange={e => setFilters({ ...filters, search: e.target.value })}
              className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-600"
            />

            <select
              value={filters.status}
              onChange={e => setFilters({ ...filters, status: e.target.value })}
              className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-600"
            >
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>

            <select
              value={filters.type}
              onChange={e => setFilters({ ...filters, type: e.target.value })}
              className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-600"
            >
              <option value="">All Types</option>
              <option value="inflow">Inflow</option>
              <option value="outflow">Outflow</option>
            </select>

            <input
              type="number"
              placeholder="Min amount"
              value={filters.amountMin}
              onChange={e => setFilters({ ...filters, amountMin: e.target.value })}
              className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-600"
            />

            <input
              type="number"
              placeholder="Max amount"
              value={filters.amountMax}
              onChange={e => setFilters({ ...filters, amountMax: e.target.value })}
              className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-600"
            />

            <button
              onClick={() =>
                setFilters({
                  search: '',
                  dateFrom: '',
                  dateTo: '',
                  amountMin: '',
                  amountMax: '',
                  status: '',
                  type: '',
                })
              }
              className="px-4 py-2 border border-border rounded-lg hover:bg-background transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Transactions List */}
      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-text-secondary">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-text-secondary">No transactions found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-text-primary">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-text-primary">Description</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-text-primary">Type</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-text-primary">Amount</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-text-primary">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-text-primary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map(tx => (
                  <tr key={tx._id} className="hover:bg-background transition-colors">
                    <td className="px-6 py-4 text-sm text-text-primary">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-primary">
                      <SafeText>{tx.description}</SafeText>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          tx.type === 'inflow' ? 'bg-success-100 text-success-700' : 'bg-danger-100 text-danger-700'
                        }`}
                      >
                        {tx.type === 'inflow' ? '↑ Inflow' : '↓ Outflow'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-text-primary text-right">
                      ${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(tx.status)}`}>
                        {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePrintReceipt(tx._id)}
                          className="p-1.5 hover:bg-background rounded transition-colors text-accent-600 hover:text-accent-700"
                          title="Print Receipt"
                        >
                          <MdPrint className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(tx._id)}
                          className="p-1.5 hover:bg-background rounded transition-colors text-danger-600 hover:text-danger-700"
                          title="Delete"
                        >
                          <MdDelete className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && transactions.length > 0 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-border rounded-lg hover:bg-background disabled:opacity-50 transition-colors"
          >
            Previous
          </button>
          <span className="text-text-secondary">Page {page}</span>
          <button
            onClick={() => setPage(page + 1)}
            className="px-4 py-2 border border-border rounded-lg hover:bg-background transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default TransactionManagement;
