import { FC, FormEvent, useMemo, useState } from 'react';
import {
  MdAdd,
  MdCancel,
  MdCheckCircle,
  MdDelete,
  MdEdit,
  MdHourglassEmpty,
  MdReceipt,
  MdReceiptLong,
  MdThumbDown,
  MdThumbUp,
} from 'react-icons/md';
import { expenseService } from '../services/expenseService';
import { categoryService } from '../services/categoryService';
import { Category, Expense } from '../types';
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
import { Field, Input, Select, Textarea } from '../components/ui/FormField';
import { SkeletonHeader, SkeletonStatCards, SkeletonTable } from '../components/ui/Skeleton';

type ExpenseStatus = Expense['status'];

const STATUS_TONES: Record<ExpenseStatus, BadgeTone> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
};

const PAGE_SIZE = 15;

const EMPTY_FORM = {
  description: '',
  amount: '',
  category: '',
  notes: '',
  status: 'pending' as ExpenseStatus,
};

const ExpenseManagement: FC = () => {
  const perms = usePermissions();
  const toast = useToast();
  const fmt = useFormatters();

  const { data, setData, loading, error, reload } = useAsyncData(
    async () => {
      const [expenses, categories] = await Promise.all([
        expenseService.getAllExpenses({ page: 1, limit: 500 }).then((res) => res.items),
        categoryService.getAllCategories().catch(() => [] as Category[]),
      ]);
      return { expenses, categories };
    },
    { expenses: [] as Expense[], categories: [] as Category[] }
  );
  const { expenses, categories } = data;
  const setExpenses = (update: (list: Expense[]) => Expense[]) =>
    setData((d) => ({ ...d, expenses: update(d.expenses) }));

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | ExpenseStatus>('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reviewing, setReviewing] = useState<string | null>(null);

  const expenseCategoryNames = useMemo(
    () => categories.filter((c) => c.type === 'expense').map((c) => c.name),
    [categories]
  );
  const allCategoryNames = useMemo(
    () => Array.from(new Set([...expenseCategoryNames, ...expenses.map((e) => e.category)])).sort(),
    [expenseCategoryNames, expenses]
  );

  const stats = useMemo(() => {
    const sumBy = (status: ExpenseStatus) =>
      expenses.filter((e) => e.status === status).reduce((s, e) => s + e.amount, 0);
    return {
      total: expenses.reduce((s, e) => s + e.amount, 0),
      approved: sumBy('approved'),
      pending: sumBy('pending'),
      pendingCount: expenses.filter((e) => e.status === 'pending').length,
      rejected: sumBy('rejected'),
    };
  }, [expenses]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return expenses.filter(
      (e) =>
        (!term || e.description.toLowerCase().includes(term) || e.notes?.toLowerCase().includes(term)) &&
        (!statusFilter || e.status === statusFilter) &&
        (!categoryFilter || e.category === categoryFilter)
    );
  }, [expenses, search, statusFilter, categoryFilter]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, category: expenseCategoryNames[0] || '' });
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (e: Expense) => {
    setEditing(e);
    setForm({
      description: e.description,
      amount: String(e.amount),
      category: e.category,
      notes: e.notes || '',
      status: e.status,
    });
    setFormError(null);
    setFormOpen(true);
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
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
    const payload: Partial<Expense> = {
      description: form.description.trim(),
      amount,
      category: form.category.trim(),
      notes: form.notes.trim(),
      ...(perms.canApprove ? { status: form.status } : {}),
    };
    try {
      if (editing) {
        const updated = await expenseService.updateExpense(editing._id, payload);
        setExpenses((list) => list.map((x) => (x._id === updated._id ? updated : x)));
        toast.success('Expense updated');
      } else {
        const created = await expenseService.createExpense(payload);
        setExpenses((list) => [created, ...list]);
        toast.success(perms.canApprove ? 'Expense recorded' : 'Expense submitted for approval');
      }
      setFormOpen(false);
    } catch (err) {
      setFormError(errorMessage(err, 'Failed to save expense'));
    } finally {
      setSaving(false);
    }
  };

  const review = async (expense: Expense, status: ExpenseStatus) => {
    setReviewing(expense._id);
    try {
      const updated = await expenseService.updateExpense(expense._id, { status });
      setExpenses((list) => list.map((x) => (x._id === updated._id ? updated : x)));
      toast.success(`Expense ${status}`);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to update expense'));
    } finally {
      setReviewing(null);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await expenseService.deleteExpense(toDelete._id);
      setExpenses((list) => list.filter((x) => x._id !== toDelete._id));
      toast.success('Expense deleted');
      setToDelete(null);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to delete expense'));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonHeader withAction={perms.canCreate} />
        <SkeletonStatCards />
        <SkeletonTable rows={8} columns={6} />
      </div>
    );
  }

  const hasActions = perms.canUpdate || perms.canDelete || perms.canApprove;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Record, review and approve business spending"
        actions={
          perms.canCreate && (
            <Button icon={<MdAdd className="w-5 h-5" />} onClick={openCreate}>
              New Expense
            </Button>
          )
        }
      />

      {perms.isReadOnly && <ReadOnlyNotice />}
      {error && <ErrorBanner message={error} onRetry={reload} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Expenses" value={fmt.money(stats.total)} icon={<MdReceiptLong className="w-5 h-5" />} hint={`${expenses.length} records`} />
        <StatCard label="Approved" value={fmt.money(stats.approved)} tone="success" icon={<MdCheckCircle className="w-5 h-5" />} />
        <StatCard
          label="Awaiting Approval"
          value={fmt.money(stats.pending)}
          tone="warning"
          icon={<MdHourglassEmpty className="w-5 h-5" />}
          hint={`${stats.pendingCount} pending`}
        />
        <StatCard label="Rejected" value={fmt.money(stats.rejected)} tone="danger" icon={<MdCancel className="w-5 h-5" />} />
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search description or notes"
          className="flex-1"
        />
        <Select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as '' | ExpenseStatus);
            setPage(1);
          }}
          className="md:w-44"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </Select>
        <Select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="md:w-52"
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {allCategoryNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<MdReceipt className="w-7 h-7" />}
          title={expenses.length === 0 ? 'No expenses yet' : 'No expenses match your filters'}
          description={
            expenses.length === 0
              ? 'Log your first business expense to start tracking spending.'
              : 'Try a different search or clear the filters.'
          }
          action={
            perms.canCreate &&
            expenses.length === 0 && (
              <Button icon={<MdAdd className="w-5 h-5" />} onClick={openCreate}>
                New Expense
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
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">Category</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-secondary">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">Status</th>
                    {hasActions && (
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-secondary">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pageItems.map((expense) => (
                    <tr key={expense._id} className="hover:bg-background/60 transition-colors">
                      <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">{fmt.date(expense.createdAt)}</td>
                      <td className="px-6 py-4 text-sm text-text-primary">
                        <SafeText className="font-medium">{expense.description}</SafeText>
                        {expense.notes && (
                          <SafeText as="p" className="text-xs text-text-secondary mt-0.5 line-clamp-1">
                            {expense.notes}
                          </SafeText>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-primary">{expense.category}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-text-primary text-right whitespace-nowrap">
                        {fmt.money(expense.amount)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Badge tone={STATUS_TONES[expense.status]}>{expense.status}</Badge>
                      </td>
                      {hasActions && (
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            {perms.canApprove && expense.status === 'pending' && (
                              <>
                                <IconButton
                                  label="Approve"
                                  tone="success"
                                  disabled={reviewing === expense._id}
                                  onClick={() => review(expense, 'approved')}
                                >
                                  <MdThumbUp className="w-4 h-4" />
                                </IconButton>
                                <IconButton
                                  label="Reject"
                                  tone="danger"
                                  disabled={reviewing === expense._id}
                                  onClick={() => review(expense, 'rejected')}
                                >
                                  <MdThumbDown className="w-4 h-4" />
                                </IconButton>
                              </>
                            )}
                            {perms.canUpdate && (
                              <IconButton label="Edit expense" tone="accent" onClick={() => openEdit(expense)}>
                                <MdEdit className="w-4 h-4" />
                              </IconButton>
                            )}
                            {perms.canDelete && (
                              <IconButton label="Delete expense" tone="danger" onClick={() => setToDelete(expense)}>
                                <MdDelete className="w-4 h-4" />
                              </IconButton>
                            )}
                          </div>
                        </td>
                      )}
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
        title={editing ? 'Edit Expense' : 'New Expense'}
        description={!perms.canApprove && !editing ? 'New expenses are submitted for approval' : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="expense-form" loading={saving}>
              {editing ? 'Save Changes' : perms.canApprove ? 'Record Expense' : 'Submit Expense'}
            </Button>
          </>
        }
      >
        <form id="expense-form" onSubmit={handleSubmit} className="space-y-4">
          {formError && <ErrorBanner message={formError} />}
          <Field label="Description" htmlFor="exp-description" required>
            <Input
              id="exp-description"
              placeholder="Office supplies"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={`Amount (${fmt.currency})`} htmlFor="exp-amount" required>
              <Input
                id="exp-amount"
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
            <Field
              label="Category"
              htmlFor="exp-category"
              required
              hint={expenseCategoryNames.length === 0 ? 'No expense categories yet, type one in' : undefined}
            >
              {expenseCategoryNames.length > 0 ? (
                <Select
                  id="exp-category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  required
                >
                  <option value="" disabled>
                    Select a category
                  </option>
                  {Array.from(new Set([...expenseCategoryNames, form.category].filter(Boolean))).map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  id="exp-category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  required
                />
              )}
            </Field>
          </div>
          {perms.canApprove && (
            <Field label="Status" htmlFor="exp-status">
              <Select
                id="exp-status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ExpenseStatus })}
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </Select>
            </Field>
          )}
          <Field label="Notes" htmlFor="exp-notes">
            <Textarea
              id="exp-notes"
              rows={3}
              maxLength={500}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete expense"
        message={
          <>
            Delete <strong className="text-text-primary">{toDelete?.description}</strong> (
            {fmt.money(toDelete?.amount)})? This cannot be undone.
          </>
        }
        confirmLabel="Delete Expense"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};

export default ExpenseManagement;
