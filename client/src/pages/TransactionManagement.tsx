import { FC, FormEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
import { IconType } from 'react-icons';
import { transactionService } from '../services/transactionService';
import { categoryService } from '../services/categoryService';
import { accountService } from '../services/accountService';
import { receiptService } from '../services/receiptService';
import { Account, Category, Transaction, TransactionType } from '../types';
import { useAsyncData } from '../hooks/useAsyncData';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../hooks/useToast';
import { useFormatters } from '../hooks/useFormatters';
import { apiToDateInput, dateInputToApi, errorMessage, todayInput } from '../utils/format';
import { SafeText } from '../utils/SafeText';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import IconButton from '../components/ui/IconButton';
import Badge, { BadgeTone } from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import ErrorBanner from '../components/ui/ErrorBanner';
import StatCard, { StatStrip } from '../components/ui/StatCard';
import SearchInput from '../components/ui/SearchInput';
import Pagination from '../components/ui/Pagination';
import ReadOnlyNotice from '../components/ui/ReadOnlyNotice';
import { Field, Input, Select } from '../components/ui/FormField';
import { SkeletonHeader, SkeletonStatCards, SkeletonTable } from '../components/ui/Skeleton';

type TxStatus = Transaction['status'];

const STATUS_TONES: Record<TxStatus, BadgeTone> = {
  completed: 'success',
  pending: 'warning',
  failed: 'danger',
};

const TYPE_META: Record<TransactionType, { label: string; button: string; tone: BadgeTone; icon: IconType }> = {
  income: { label: 'Income', button: 'Money in', tone: 'success', icon: MdArrowUpward },
  expense: { label: 'Expense', button: 'Money out', tone: 'danger', icon: MdArrowDownward },
  transfer: { label: 'Transfer', button: 'Transfer', tone: 'info', icon: MdSwapHoriz },
};

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Card', 'Mobile Money', 'Cheque', 'Other'];
const PAGE_SIZE = 15;

const EMPTY_FILTERS = {
  search: '',
  dateFrom: '',
  dateTo: '',
  amountMin: '',
  amountMax: '',
  status: '',
  type: '',
  accountId: '',
};

const EMPTY_FORM = {
  type: 'income' as TransactionType,
  description: '',
  amount: '',
  transactionDate: '',
  accountId: '',
  categoryId: '',
  fromAccountId: '',
  toAccountId: '',
  status: 'completed' as TxStatus,
  paymentMethod: '',
  reference: '',
};

/** True when the transaction posts to (or moves money through) the account. */
const touchesAccount = (t: Transaction, accountId: string) =>
  t.accountId === accountId || t.fromAccountId === accountId || t.toAccountId === accountId;

const TransactionManagement: FC = () => {
  const perms = usePermissions();
  const toast = useToast();
  const fmt = useFormatters();

  const { data, setData, loading, error, reload } = useAsyncData(
    async () => {
      const [transactions, categories, accounts] = await Promise.all([
        transactionService.getAllTransactions({ page: 1, limit: 500 }).then((r) => r.items),
        categoryService.getAllCategories().catch(() => [] as Category[]),
        accountService.getAllAccounts().catch(() => [] as Account[]),
      ]);
      return { transactions, categories, accounts };
    },
    { transactions: [] as Transaction[], categories: [] as Category[], accounts: [] as Account[] },
  );
  const { transactions, categories, accounts } = data;
  const setTransactions = (update: (list: Transaction[]) => Transaction[]) =>
    setData((d) => ({ ...d, transactions: update(d.transactions) }));

  const categoryById = useMemo(() => new Map(categories.map((c) => [c._id, c])), [categories]);
  const accountById = useMemo(() => new Map(accounts.map((a) => [a._id, a])), [accounts]);
  const activeAccounts = useMemo(() => accounts.filter((a) => a.status === 'active'), [accounts]);
  const accountName = (id?: string) => (id && accountById.get(id)?.name) || 'Unknown account';

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
      const date = new Date(t.transactionDate);
      const category = t.categoryId ? categoryById.get(t.categoryId)?.name ?? '' : '';
      const accounts = [t.accountId, t.fromAccountId, t.toAccountId].map((id) => (id ? accountById.get(id)?.name ?? '' : ''));
      return (
        (!term ||
          t.description.toLowerCase().includes(term) ||
          category.toLowerCase().includes(term) ||
          accounts.some((name) => name.toLowerCase().includes(term)) ||
          t.reference?.toLowerCase().includes(term)) &&
        (!filters.status || t.status === filters.status) &&
        (!filters.type || t.type === filters.type) &&
        (!filters.accountId || touchesAccount(t, filters.accountId)) &&
        (!filters.amountMin || t.amount >= parseFloat(filters.amountMin)) &&
        (!filters.amountMax || t.amount <= parseFloat(filters.amountMax)) &&
        (!from || date >= from) &&
        (!to || date <= to)
      );
    });
  }, [transactions, filters, categoryById, accountById]);

  // Only completed income and expense count as money in and out; transfers
  // just move money between your own accounts.
  const totals = useMemo(() => {
    const completed = filtered.filter((t) => t.status === 'completed');
    const inflow = completed.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const outflow = completed.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { inflow, outflow, net: inflow - outflow };
  }, [filtered]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const categoriesFor = (type: TransactionType) => categories.filter((c) => c.type === type);

  /** Accounts offered in the form: active ones, plus whatever the edited transaction already uses. */
  const accountOptions = (selected: string) =>
    accounts.filter((a) => a.status === 'active' || a._id === selected);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      transactionDate: todayInput(),
      accountId: activeAccounts[0]?._id || '',
      fromAccountId: activeAccounts[0]?._id || '',
      toAccountId: activeAccounts[1]?._id || '',
      categoryId: categoriesFor('income')[0]?._id || '',
    });
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (t: Transaction) => {
    setEditing(t);
    setForm({
      type: t.type,
      description: t.description,
      amount: String(t.amount),
      transactionDate: apiToDateInput(t.transactionDate),
      accountId: t.accountId || '',
      categoryId: t.categoryId || '',
      fromAccountId: t.fromAccountId || '',
      toAccountId: t.toAccountId || '',
      status: t.status,
      paymentMethod: t.paymentMethod || '',
      reference: t.reference || '',
    });
    setFormError(null);
    setFormOpen(true);
  };

  const changeType = (type: TransactionType) => {
    const options = type === 'transfer' ? [] : categoriesFor(type);
    setForm((f) => ({
      ...f,
      type,
      categoryId: options.some((c) => c._id === f.categoryId) ? f.categoryId : options[0]?._id || '',
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!amount || amount <= 0) return setFormError('Enter an amount greater than zero');
    if (form.type === 'transfer') {
      if (!form.fromAccountId || !form.toAccountId) return setFormError('Choose both accounts');
      if (form.fromAccountId === form.toAccountId) return setFormError('Choose two different accounts');
    } else {
      if (!form.accountId) return setFormError('Choose an account');
      if (!form.categoryId) return setFormError('Choose a category');
    }

    setSaving(true);
    setFormError(null);
    const payload: Partial<Transaction> = {
      type: form.type,
      description: form.description.trim(),
      amount,
      transactionDate: dateInputToApi(form.transactionDate || todayInput()),
      status: form.status,
      paymentMethod: form.paymentMethod || undefined,
      reference: form.reference.trim() || undefined,
      ...(form.type === 'transfer'
        ? { fromAccountId: form.fromAccountId, toAccountId: form.toAccountId }
        : { accountId: form.accountId, categoryId: form.categoryId }),
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
      // Balances changed on the server; keep the account list current.
      accountService
        .getAllAccounts()
        .then((fresh) => setData((d) => ({ ...d, accounts: fresh })))
        .catch(() => undefined);
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

  const noAccounts = accounts.length === 0;
  const formCategories = form.type === 'transfer' ? [] : categoriesFor(form.type);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        description="Money in, money out and transfers between your accounts"
        actions={
          <>
            <Button
              variant="secondary"
              icon={<MdFilterList className="w-4 h-4" />}
              onClick={() => setShowFilter(!showFilter)}
            >
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-0.5 font-mono text-xs text-text-secondary">{activeFilterCount}</span>
              )}
            </Button>
            {perms.canCreate && !noAccounts && (
              <Button icon={<MdAdd className="w-4 h-4" />} onClick={openCreate}>
                New Transaction
              </Button>
            )}
          </>
        }
      />

      {perms.isReadOnly && <ReadOnlyNotice />}
      {error && <ErrorBanner message={error} onRetry={reload} />}

      <StatStrip columns={3}>
        <StatCard label="Money in" value={fmt.money(totals.inflow)} tone="success" />
        <StatCard label="Money out" value={fmt.money(totals.outflow)} tone="danger" />
        <StatCard
          label="Net"
          value={fmt.money(totals.net)}
          tone="accent"
          hint={`${filtered.length} transactions, completed only in totals`}
        />
      </StatStrip>

      <SearchInput
        value={filters.search}
        onChange={(search) => updateFilter({ search })}
        placeholder="Search description, category, account or reference"
      />

      {showFilter && (
        <div className="panel p-6 animate-slide-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">Filter Transactions</h2>
            <IconButton label="Close filters" onClick={() => setShowFilter(false)}>
              <MdClose className="w-5 h-5" />
            </IconButton>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Type" htmlFor="f-type">
              <Select id="f-type" value={filters.type} onChange={(e) => updateFilter({ type: e.target.value })}>
                <option value="">All types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
                <option value="transfer">Transfer</option>
              </Select>
            </Field>
            <Field label="Account" htmlFor="f-account">
              <Select
                id="f-account"
                value={filters.accountId}
                onChange={(e) => updateFilter({ accountId: e.target.value })}
              >
                <option value="">All accounts</option>
                {accounts.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status" htmlFor="f-status">
              <Select id="f-status" value={filters.status} onChange={(e) => updateFilter({ status: e.target.value })}>
                <option value="">All statuses</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </Select>
            </Field>
            <Field label="From" htmlFor="f-from">
              <Input
                id="f-from"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => updateFilter({ dateFrom: e.target.value })}
              />
            </Field>
            <Field label="To" htmlFor="f-to">
              <Input
                id="f-to"
                type="date"
                value={filters.dateTo}
                onChange={(e) => updateFilter({ dateTo: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Min amount" htmlFor="f-min">
                <Input
                  id="f-min"
                  type="number"
                  value={filters.amountMin}
                  onChange={(e) => updateFilter({ amountMin: e.target.value })}
                />
              </Field>
              <Field label="Max amount" htmlFor="f-max">
                <Input
                  id="f-max"
                  type="number"
                  value={filters.amountMax}
                  onChange={(e) => updateFilter({ amountMax: e.target.value })}
                />
              </Field>
            </div>
            <div className="flex items-end lg:col-start-3">
              <Button variant="secondary" className="w-full" onClick={() => updateFilter(EMPTY_FILTERS)}>
                Clear Filters
              </Button>
            </div>
          </div>
        </div>
      )}

      {noAccounts ? (
        <EmptyState
          icon={<MdSwapHoriz className="w-7 h-7" />}
          title="Add an account first"
          description="Every transaction moves money in or out of an account, so set up your bank, cash or mobile money accounts before recording one."
          action={
            perms.canCreate && (
              <Link to="/app/accounts">
                <Button icon={<MdAdd className="w-4 h-4" />}>Add Account</Button>
              </Link>
            )
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<MdSwapHoriz className="w-7 h-7" />}
          title={transactions.length === 0 ? 'No transactions yet' : 'No transactions match your filters'}
          description={
            transactions.length === 0
              ? 'Record money coming in, going out, or moving between accounts to see it here.'
              : 'Try a different search or clear the filters.'
          }
          action={
            perms.canCreate &&
            transactions.length === 0 && (
              <Button icon={<MdAdd className="w-4 h-4" />} onClick={openCreate}>
                New Transaction
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Type</th>
                    <th className="text-right">Amount</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((tx) => {
                    const meta = TYPE_META[tx.type];
                    const Icon = meta.icon;
                    return (
                      <tr key={tx._id}>
                        <td className="text-text-secondary whitespace-nowrap">{fmt.date(tx.transactionDate)}</td>
                        <td>
                          <SafeText className="font-medium text-text-primary">{tx.description}</SafeText>
                          <p className="text-xs text-text-secondary mt-0.5">
                            {tx.type === 'transfer' ? (
                              <>
                                {accountName(tx.fromAccountId)} to {accountName(tx.toAccountId)}
                              </>
                            ) : (
                              <>
                                {categoryById.get(tx.categoryId ?? '')?.name ?? 'Uncategorized'} · {accountName(tx.accountId)}
                              </>
                            )}
                            {tx.reference && <> · Ref {tx.reference}</>}
                          </p>
                        </td>
                        <td>
                          <Badge tone={meta.tone} icon={<Icon className="w-3.5 h-3.5" />}>
                            {meta.label}
                          </Badge>
                        </td>
                        <td
                          className={`num ${
                            tx.type === 'income' ? 'text-success-700' : tx.type === 'transfer' ? 'text-text-secondary' : 'text-text-primary'
                          }`}
                        >
                          {tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : ''}
                          {fmt.money(tx.amount)}
                        </td>
                        <td>
                          <Badge tone={STATUS_TONES[tx.status]}>{tx.status}</Badge>
                        </td>
                        <td>
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
                    );
                  })}
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
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Transaction type">
            {(['income', 'expense', 'transfer'] as const).map((type) => {
              const Icon = TYPE_META[type].icon;
              const disabled = type === 'transfer' && activeAccounts.length < 2;
              return (
                <button
                  key={type}
                  type="button"
                  role="radio"
                  aria-checked={form.type === type}
                  disabled={disabled}
                  title={disabled ? 'You need at least two active accounts to transfer' : undefined}
                  onClick={() => changeType(type)}
                  className={`flex items-center justify-center gap-2 h-9 px-3 rounded-md border text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    form.type === type
                      ? 'border-primary-900 bg-primary-900 text-white'
                      : 'border-border text-text-secondary hover:bg-secondary-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {TYPE_META[type].button}
                </button>
              );
            })}
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
            <Field label="Date" htmlFor="tx-date" required hint="When the money actually moved">
              <Input
                id="tx-date"
                type="date"
                value={form.transactionDate}
                onChange={(e) => setForm({ ...form, transactionDate: e.target.value })}
                required
              />
            </Field>

            {form.type === 'transfer' ? (
              <>
                <Field label="From account" htmlFor="tx-from" required>
                  <Select
                    id="tx-from"
                    value={form.fromAccountId}
                    onChange={(e) => setForm({ ...form, fromAccountId: e.target.value })}
                    required
                  >
                    <option value="" disabled>
                      Select an account
                    </option>
                    {accountOptions(form.fromAccountId).map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.name} ({fmt.money(a.currentBalance)})
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="To account" htmlFor="tx-to" required>
                  <Select
                    id="tx-to"
                    value={form.toAccountId}
                    onChange={(e) => setForm({ ...form, toAccountId: e.target.value })}
                    required
                  >
                    <option value="" disabled>
                      Select an account
                    </option>
                    {accountOptions(form.toAccountId).map((a) => (
                      <option key={a._id} value={a._id} disabled={a._id === form.fromAccountId}>
                        {a.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </>
            ) : (
              <>
                <Field label={form.type === 'income' ? 'Paid into' : 'Paid from'} htmlFor="tx-account" required>
                  <Select
                    id="tx-account"
                    value={form.accountId}
                    onChange={(e) => setForm({ ...form, accountId: e.target.value })}
                    required
                  >
                    <option value="" disabled>
                      Select an account
                    </option>
                    {accountOptions(form.accountId).map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  label="Category"
                  htmlFor="tx-category"
                  required
                  hint={formCategories.length === 0 ? `Add an ${form.type} category on the Categories page` : undefined}
                >
                  <Select
                    id="tx-category"
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    required
                  >
                    <option value="" disabled>
                      Select a category
                    </option>
                    {formCategories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </>
            )}

            <Field label="Status" htmlFor="tx-status" hint="Only completed transactions change balances">
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
            Delete <strong className="text-text-primary">{toDelete?.description}</strong> ({fmt.money(toDelete?.amount)}
            )? Its effect on account balances will be reversed. This cannot be undone.
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
