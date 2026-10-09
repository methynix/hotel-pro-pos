import { FC, FormEvent, useMemo, useState } from 'react';
import {
  MdAdd,
  MdArrowDownward,
  MdArrowUpward,
  MdClose,
  MdDelete,
  MdEdit,
  MdFilterList,
  MdPrint,
  MdSwapHoriz,
} from 'react-icons/md';
import { transactionService } from '../services/transactionService';
import { categoryService } from '../services/categoryService';
import { receiptService } from '../services/receiptService';
import { Category, Transaction } from '../types';
import { useAsyncData } from '../hooks/useAsyncData';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../hooks/useToast';
import { useFormatters } from '../hooks/useFormatters';
import { errorMessage } from '../utils/format';
import { SafeText } from '../utils/SafeText';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import IconButton from '../components/ui/IconButton';
import Badge, { BadgeTone } from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import ErrorBanner from '../components/ui/ErrorBanner';
import StatCard from '../components/ui/StatCard';
import SearchInput from '../components/ui/SearchInput';
import Pagination from '../components/ui/Pagination';
import ReadOnlyNotice from '../components/ui/ReadOnlyNotice';
import { Field, Input, Select } from '../components/ui/FormField';
import { SkeletonHeader, SkeletonStatCards, SkeletonTable } from '../components/ui/Skeleton';

type TxType = Transaction['type'];
type TxStatus = Transaction['status'];

const STATUS_TONES: Record<TxStatus, BadgeTone> = {
  completed: 'success',
  pending: 'warning',
  failed: 'danger',
};

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Card', 'Mobile Money', 'Cheque', 'Other'];
const PAGE_SIZE = 15;

const EMPTY_FILTERS = { search: '', dateFrom: '', dateTo: '', amountMin: '', amountMax: '', status: '', type: '' };

const EMPTY_FORM = {
  description: '',
  amount: '',
  type: 'inflow' as TxType,
  category: '',
  status: 'completed' as TxStatus,
  paymentMethod: '',
  reference: '',
};

const TransactionManagement: FC = () => {
  const perms = usePermissions();
  const toast = useToast();
  const fmt = useFormatters();

  const { data, setData, loading, error, reload } = useAsyncData(
    async () => {
      const [transactions, categories] = await Promise.all([
        transactionService.getAllTransactions({ page: 1, limit: 500 }).then((r) => r.items),
        categoryService.getAllCategories().catch(() => [] as Category[]),
      ]);
      return { transactions, categories };
    },
    { transactions: [] as Transaction[], categories: [] as Category[] }
  );
  const { transactions, categories } = data;
  const setTransactions = (update: (list: Transaction[]) => Transaction[]) =>
    setData((d) => ({ ...d, transactions: update(d.transactions) }));

  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [printing, setPrinting] = useState<string | null>(null);

  const updateFilter = (patch: Partial<typeof EMPTY_FILTERS>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };
  const activeFilterCount = Object.entries(filters).filter(([k, v]) => k !== 'search' && v).length;

  const filtered = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    const from = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`) : null;
    const to = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999`) : null;
    return transactions.filter((t) => {
      const created = new Date(t.createdAt);
      return (
        (!term ||
          t.description.toLowerCase().includes(term) ||
          t.category?.toLowerCase().includes(term) ||
          t.reference?.toLowerCase().includes(term)) &&
        (!filters.status || t.status === filters.status) &&
        (!filters.type || t.type === filters.type) &&
        (!filters.amountMin || t.amount >= parseFloat(filters.amountMin)) &&
        (!filters.amountMax || t.amount <= parseFloat(filters.amountMax)) &&
        (!from || created >= from) &&
        (!to || created <= to)
      );
    });
  }, [transactions, filters]);

  const totals = useMemo(() => {
    const inflow = filtered.filter((t) => t.type === 'inflow').reduce((s, t) => s + t.amount, 0);
    const outflow = filtered.filter((t) => t.type === 'outflow').reduce((s, t) => s + t.amount, 0);
    return { inflow, outflow, net: inflow - outflow };
  }, [filtered]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const categoryOptions = (type: TxType) => {
    const wanted = type === 'inflow' ? 'income' : 'expense';
    return categories.filter((c) => c.type === wanted).map((c) => c.name);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, category: categoryOptions('inflow')[0] || '' });
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (t: Transaction) => {
    setEditing(t);
    setForm({
      description: t.description,
      amount: String(t.amount),
      type: t.type,
      category: t.category,
      status: t.status,
      paymentMethod: t.paymentMethod || '',
      reference: t.reference || '',
    });
    setFormError(null);
    setFormOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      setFormError('Enter an amount greater than zero');
      return;
    }
    if (!form.category.trim()) {
      setFormError('Choose a category');
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload: Partial<Transaction> = {
      description: form.description.trim(),
      amount,
      type: form.type,
      category: form.category.trim(),
      status: form.status,
      paymentMethod: form.paymentMethod || undefined,
      reference: form.reference.trim() || undefined,
    };
    try {
      if (editing) {
        const updated = await transactionService.updateTransaction(editing._id, payload);
        setTransactions((list) => list.map((t) => (t._id === updated._id ? updated : t)));
        toast.success('Transaction updated');
      } else {
        const created = await transactionService.createTransaction(payload);
        setTransactions((list) => [created, ...list]);
        toast.success('Transaction recorded');
      }
      setFormOpen(false);
    } catch (err) {
      setFormError(errorMessage(err, 'Failed to save transaction'));
    } finally {
      setSaving(false);
    }
  };

  const handlePrintReceipt = async (transactionId: string) => {
    setPrinting(transactionId);
    try {
      let receipt = await receiptService.getReceiptsByTransaction(transactionId).catch(() => null);
      if (!receipt) {
        receipt = await receiptService.generateReceipt(transactionId);
      }
      const html = await receiptService.printReceipt(receipt._id);
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Allow pop-ups for this site to print receipts');
        return;
      }
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to print receipt'));
    } finally {
      setPrinting(null);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await transactionService.deleteTransaction(toDelete._id);
      setTransactions((list) => list.filter((t) => t._id !== toDelete._id));
      toast.success('Transaction deleted');
      setToDelete(null);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to delete transaction'));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonHeader />
        <SkeletonStatCards count={3} />
        <SkeletonTable rows={8} columns={6} />
      </div>
    );
  }

  const formCategories = Array.from(new Set([...categoryOptions(form.type), form.category].filter(Boolean)));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        description="Manage and track all financial transactions"
        actions={
          <>
            <Button
              variant="secondary"
              icon={<MdFilterList className="w-5 h-5" />}
              onClick={() => setShowFilter(!showFilter)}
            >
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 px-1.5 rounded-full bg-accent-600 text-white text-xs">{activeFilterCount}</span>
              )}
            </Button>
            {perms.canCreate && (
              <Button icon={<MdAdd className="w-5 h-5" />} onClick={openCreate}>
                New Transaction
              </Button>
            )}
          </>
        }
      />

      {perms.isReadOnly && <ReadOnlyNotice />}
      {error && <ErrorBanner message={error} onRetry={reload} />}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard label="Inflows" value={fmt.money(totals.inflow)} tone="success" icon={<MdArrowUpward className="w-5 h-5" />} />
        <StatCard label="Outflows" value={fmt.money(totals.outflow)} tone="danger" icon={<MdArrowDownward className="w-5 h-5" />} />
        <StatCard
          label="Net"
          value={fmt.money(totals.net)}
          tone="accent"
          icon={<MdSwapHoriz className="w-5 h-5" />}
          hint={`${filtered.length} transactions`}
        />
      </div>

      <SearchInput
        value={filters.search}
        onChange={(search) => updateFilter({ search })}
        placeholder="Search description, category or reference"
      />

      {showFilter && (
        <div className="bg-surface rounded-xl border border-border shadow-sm p-6 animate-slide-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">Filter Transactions</h2>
            <IconButton label="Close filters" onClick={() => setShowFilter(false)}>
              <MdClose className="w-5 h-5" />
            </IconButton>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Status" htmlFor="f-status">
              <Select id="f-status" value={filters.status} onChange={(e) => updateFilter({ status: e.target.value })}>
                <option value="">All statuses</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </Select>
            </Field>
            <Field label="Type" htmlFor="f-type">
              <Select id="f-type" value={filters.type} onChange={(e) => updateFilter({ type: e.target.value })}>
                <option value="">All types</option>
                <option value="inflow">Inflow</option>
                <option value="outflow">Outflow</option>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Min amount" htmlFor="f-min">
                <Input id="f-min" type="number" value={filters.amountMin} onChange={(e) => updateFilter({ amountMin: e.target.value })} />
              </Field>
              <Field label="Max amount" htmlFor="f-max">
                <Input id="f-max" type="number" value={filters.amountMax} onChange={(e) => updateFilter({ amountMax: e.target.value })} />
              </Field>
            </div>
            <Field label="From" htmlFor="f-from">
              <Input id="f-from" type="date" value={filters.dateFrom} onChange={(e) => updateFilter({ dateFrom: e.target.value })} />
            </Field>
            <Field label="To" htmlFor="f-to">
              <Input id="f-to" type="date" value={filters.dateTo} onChange={(e) => updateFilter({ dateTo: e.target.value })} />
            </Field>
            <div className="flex items-end">
              <Button variant="secondary" className="w-full" onClick={() => updateFilter(EMPTY_FILTERS)}>
                Clear Filters
              </Button>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<MdSwapHoriz className="w-7 h-7" />}
          title={transactions.length === 0 ? 'No transactions yet' : 'No transactions match your filters'}
          description={
            transactions.length === 0
              ? 'Record money coming in and going out to see it here.'
              : 'Try a different search or clear the filters.'
          }
          action={
            perms.canCreate &&
            transactions.length === 0 && (
              <Button icon={<MdAdd className="w-5 h-5" />} onClick={openCreate}>
                New Transaction
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-background border-b border-border">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">Type</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-secondary">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-secondary">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pageItems.map((tx) => (
                    <tr key={tx._id} className="hover:bg-background/60 transition-colors">
                      <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">{fmt.date(tx.createdAt)}</td>
                      <td className="px-6 py-4 text-sm">
                        <SafeText className="font-medium text-text-primary">{tx.description}</SafeText>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {tx.category}
                          {tx.reference && <> · Ref {tx.reference}</>}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Badge
                          tone={tx.type === 'inflow' ? 'success' : 'danger'}
                          icon={
                            tx.type === 'inflow' ? (
                              <MdArrowUpward className="w-3.5 h-3.5" />
                            ) : (
                              <MdArrowDownward className="w-3.5 h-3.5" />
                            )
                          }
                        >
                          {tx.type}
                        </Badge>
                      </td>
                      <td
                        className={`px-6 py-4 text-sm font-semibold text-right whitespace-nowrap ${
                          tx.type === 'inflow' ? 'text-success-700' : 'text-text-primary'
                        }`}
                      >
                        {tx.type === 'outflow' ? '-' : '+'}
                        {fmt.money(tx.amount)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Badge tone={STATUS_TONES[tx.status]}>{tx.status}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <IconButton
                            label="Print receipt"
                            tone="neutral"
                            disabled={printing === tx._id}
                            onClick={() => handlePrintReceipt(tx._id)}
                          >
                            <MdPrint className="w-4 h-4" />
                          </IconButton>
                          {perms.canUpdate && (
                            <IconButton label="Edit transaction" tone="accent" onClick={() => openEdit(tx)}>
                              <MdEdit className="w-4 h-4" />
                            </IconButton>
                          )}
                          {perms.canDelete && (
                            <IconButton label="Delete transaction" tone="danger" onClick={() => setToDelete(tx)}>
                              <MdDelete className="w-4 h-4" />
                            </IconButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination page={currentPage} pages={pages} total={filtered.length} onChange={setPage} />
        </>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        dismissible={!saving}
        title={editing ? 'Edit Transaction' : 'New Transaction'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="tx-form" loading={saving}>
              {editing ? 'Save Changes' : 'Record Transaction'}
            </Button>
          </>
        }
      >
        <form id="tx-form" onSubmit={handleSubmit} className="space-y-4">
          {formError && <ErrorBanner message={formError} />}
          <div className="grid grid-cols-2 gap-2">
            {(['inflow', 'outflow'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    type,
                    category: categoryOptions(type).includes(form.category) ? form.category : categoryOptions(type)[0] || '',
                  })
                }
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  form.type === type
                    ? type === 'inflow'
                      ? 'border-success-500 bg-success-50 text-success-700'
                      : 'border-danger-500 bg-danger-50 text-danger-700'
                    : 'border-border text-text-secondary hover:bg-background'
                }`}
              >
                {type === 'inflow' ? <MdArrowUpward className="w-4 h-4" /> : <MdArrowDownward className="w-4 h-4" />}
                {type === 'inflow' ? 'Money in' : 'Money out'}
              </button>
            ))}
          </div>
          <Field label="Description" htmlFor="tx-description" required>
            <Input
              id="tx-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={`Amount (${fmt.currency})`} htmlFor="tx-amount" required>
              <Input
                id="tx-amount"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </Field>
            <Field label="Category" htmlFor="tx-category" required>
              {formCategories.length > 0 ? (
                <Select
                  id="tx-category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  required
                >
                  <option value="" disabled>
                    Select a category
                  </option>
                  {formCategories.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  id="tx-category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  required
                />
              )}
            </Field>
            <Field label="Status" htmlFor="tx-status">
              <Select
                id="tx-status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as TxStatus })}
              >
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </Select>
            </Field>
            <Field label="Payment method" htmlFor="tx-method">
              <Select
                id="tx-method"
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
              >
                <option value="">Not specified</option>
                {Array.from(new Set([...PAYMENT_METHODS, form.paymentMethod].filter(Boolean))).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Reference" htmlFor="tx-reference" hint="Invoice number, receipt ID or similar">
            <Input
              id="tx-reference"
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
            />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete transaction"
        message={
          <>
            Delete <strong className="text-text-primary">{toDelete?.description}</strong> ({fmt.money(toDelete?.amount)})?
            This cannot be undone.
          </>
        }
        confirmLabel="Delete Transaction"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};

export default TransactionManagement;
