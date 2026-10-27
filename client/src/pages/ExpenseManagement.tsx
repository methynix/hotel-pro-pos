import { FC, FormEvent, useMemo, useState } from 'react';
import { MdAdd, MdDelete, MdEdit, MdPayments, MdReceipt, MdThumbDown, MdThumbUp } from 'react-icons/md';
import { expenseService } from '../services/expenseService';
import { categoryService } from '../services/categoryService';
import { accountService } from '../services/accountService';
import { newIdempotencyKey } from '../services/crud';
import { Account, Category, Expense } from '../types';
import { useAsyncData } from '../hooks/useAsyncData';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../hooks/useToast';
import { useFormatters } from '../hooks/useFormatters';
import { dateInputToApi, errorMessage, todayInput } from '../utils/format';
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
import { Field, Input, Select, Textarea } from '../components/ui/FormField';
import { SkeletonHeader, SkeletonStatCards, SkeletonTable } from '../components/ui/Skeleton';

type ExpenseStatus = Expense['status'];

const STATUS_TONES: Record<ExpenseStatus, BadgeTone> = {
  pending: 'warning',
  approved: 'info',
  paid: 'success',
  rejected: 'danger',
};

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Card', 'Mobile Money', 'Cheque', 'Other'];

const EMPTY_PAY = { accountId: '', paidDate: '', paymentMethod: '', reference: '' };

const PAGE_SIZE = 15;

const EMPTY_FORM = {
  description: '',
  amount: '',
  categoryId: '',
  notes: '',
  status: 'pending' as ExpenseStatus,
};

const ExpenseManagement: FC = () => {
  const perms = usePermissions();
  const toast = useToast();
  const fmt = useFormatters();

  const { data, setData, loading, error, reload } = useAsyncData(
    async () => {
      const [expenses, categories, accounts] = await Promise.all([
        expenseService.getAllExpenses({ page: 1, limit: 500 }).then((res) => res.items),
        categoryService.getAllCategories().catch(() => [] as Category[]),
        accountService.getAllAccounts().catch(() => [] as Account[]),
      ]);
      return { expenses, categories, accounts };
    },
    { expenses: [] as Expense[], categories: [] as Category[], accounts: [] as Account[] },
  );
  const { expenses, categories, accounts } = data;
  const activeAccounts = useMemo(() => accounts.filter((a) => a.status === 'active'), [accounts]);
  const accountName = (id?: string) => accounts.find((a) => a._id === id)?.name ?? 'an account';
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
  const [submitKey, setSubmitKey] = useState('');

  const [toReject, setToReject] = useState<Expense | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [toPay, setToPay] = useState<Expense | null>(null);
  const [payForm, setPayForm] = useState(EMPTY_PAY);
  const [payKey, setPayKey] = useState('');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const expenseCategories = useMemo(() => categories.filter((c) => c.type === 'expense'), [categories]);
  const categoryName = useMemo(() => {
    const names = new Map(categories.map((c) => [c._id, c.name]));
    return (id: string) => names.get(id) ?? 'Uncategorized';
  }, [categories]);

  const stats = useMemo(() => {
    const sumBy = (status: ExpenseStatus) =>
      expenses.filter((e) => e.status === status).reduce((s, e) => s + e.amount, 0);
    const countBy = (status: ExpenseStatus) => expenses.filter((e) => e.status === status).length;
    return {
      pending: sumBy('pending'),
      pendingCount: countBy('pending'),
      approved: sumBy('approved'),
      approvedCount: countBy('approved'),
      paid: sumBy('paid'),
      rejected: sumBy('rejected'),
    };
  }, [expenses]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return expenses.filter(
      (e) =>
        (!term || e.description.toLowerCase().includes(term) || e.notes?.toLowerCase().includes(term)) &&
        (!statusFilter || e.status === statusFilter) &&
        (!categoryFilter || e.categoryId === categoryFilter),
    );
  }, [expenses, search, statusFilter, categoryFilter]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, categoryId: expenseCategories[0]?._id || '' });
    setSubmitKey(newIdempotencyKey());
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (e: Expense) => {
    setEditing(e);
    setForm({
      description: e.description,
      amount: String(e.amount),
      categoryId: e.categoryId,
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
    if (!form.categoryId) {
      setFormError('Choose a category');
      return;
    }

    setSaving(true);
    setFormError(null);
    const payload: Partial<Expense> = {
      description: form.description.trim(),
      amount,
      categoryId: form.categoryId,
      notes: form.notes.trim(),
      ...(perms.canApprove && !editing ? { status: form.status } : {}),
    };
    try {
      if (editing) {
        const updated = await expenseService.updateExpense(editing._id, payload);
        setExpenses((list) => list.map((x) => (x._id === updated._id ? updated : x)));
        toast.success('Expense updated');
      } else {
        const created = await expenseService.createExpense(payload, submitKey);
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

  const replaceExpense = (updated: Expense) => setExpenses((list) => list.map((x) => (x._id === updated._id ? updated : x)));

  const approve = async (expense: Expense) => {
    setReviewing(expense._id);
    try {
      replaceExpense(await expenseService.approve(expense._id));
      toast.success('Expense approved; it can now be paid');
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to approve expense'));
      reload();
    } finally {
      setReviewing(null);
    }
  };

  const handleReject = async () => {
    if (!toReject) return;
    setReviewing(toReject._id);
    try {
      replaceExpense(await expenseService.reject(toReject._id, rejectReason.trim() || undefined));
      toast.success('Expense rejected');
      setToReject(null);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to reject expense'));
      reload();
    } finally {
      setReviewing(null);
    }
  };

  const openPay = (expense: Expense) => {
    setToPay(expense);
    setPayForm({ ...EMPTY_PAY, accountId: activeAccounts[0]?._id || '', paidDate: todayInput() });
    setPayKey(newIdempotencyKey());
    setPayError(null);
  };

  const handlePay = async (e: FormEvent) => {
    e.preventDefault();
    if (!toPay) return;
    if (!payForm.accountId) return setPayError('Choose the account the money comes from');
    setPaying(true);
    setPayError(null);
    try {
      const paid = await expenseService.pay(
        toPay._id,
        {
          accountId: payForm.accountId,
          paidDate: dateInputToApi(payForm.paidDate || todayInput()),
          paymentMethod: payForm.paymentMethod || undefined,
          reference: payForm.reference.trim() || undefined,
        },
        payKey,
      );
      replaceExpense(paid);
      toast.success(`Paid from ${accountName(paid.accountId)} and recorded in the ledger`);
      setToPay(null);
    } catch (err) {
      setPayError(errorMessage(err, 'Failed to pay expense'));
    } finally {
      setPaying(false);
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
            <Button icon={<MdAdd className="w-4 h-4" />} onClick={openCreate}>
              New Expense
            </Button>
          )
        }
      />

      {perms.isReadOnly && <ReadOnlyNotice />}
      {error && <ErrorBanner message={error} onRetry={reload} />}

      <StatStrip>
        <StatCard
          label="Awaiting Approval"
          value={fmt.money(stats.pending)}
          tone="warning"
          hint={`${stats.pendingCount} pending`}
        />
        <StatCard
          label="Approved, Unpaid"
          value={fmt.money(stats.approved)}
          tone="info"
          hint={`${stats.approvedCount} to pay`}
        />
        <StatCard label="Paid" value={fmt.money(stats.paid)} tone="success" hint="Recorded in the ledger" />
        <StatCard label="Rejected" value={fmt.money(stats.rejected)} tone="danger" />
      </StatStrip>

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
          <option value="approved">Approved, unpaid</option>
          <option value="paid">Paid</option>
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
          {expenseCategories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
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
              <Button icon={<MdAdd className="w-4 h-4" />} onClick={openCreate}>
                New Expense
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
                    <th>Category</th>
                    <th className="text-right">Amount</th>
                    <th>Status</th>
                    {hasActions && <th className="text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((expense) => (
                    <tr key={expense._id}>
                      <td className="text-text-secondary whitespace-nowrap">{fmt.date(expense.createdAt)}</td>
                      <td className="text-text-primary">
                        <SafeText className="font-medium">{expense.description}</SafeText>
                        {expense.notes && (
                          <SafeText as="p" className="text-xs text-text-secondary mt-0.5 line-clamp-1">
                            {expense.notes}
                          </SafeText>
                        )}
                      </td>
                      <td className="text-text-primary">{categoryName(expense.categoryId)}</td>
                      <td className="num text-text-primary">{fmt.money(expense.amount)}</td>
                      <td>
                        <Badge tone={STATUS_TONES[expense.status]}>{expense.status}</Badge>
                        {expense.status === 'paid' && (
                          <p className="text-xs text-text-secondary mt-1 whitespace-nowrap">
                            {fmt.date(expense.paidAt)} from {accountName(expense.accountId)}
                          </p>
                        )}
                      </td>
                      {hasActions && (
                        <td>
                          <div className="flex items-center justify-end gap-1">
                            {perms.canApprove && expense.status === 'pending' && (
                              <>
                                <IconButton
                                  label="Approve"
                                  tone="success"
                                  disabled={reviewing === expense._id}
                                  onClick={() => approve(expense)}
                                >
                                  <MdThumbUp className="w-4 h-4" />
                                </IconButton>
                                <IconButton
                                  label="Reject"
                                  tone="danger"
                                  disabled={reviewing === expense._id}
                                  onClick={() => {
                                    setToReject(expense);
                                    setRejectReason('');
                                  }}
                                >
                                  <MdThumbDown className="w-4 h-4" />
                                </IconButton>
                              </>
                            )}
                            {perms.canApprove && expense.status === 'approved' && (
                              <Button size="sm" icon={<MdPayments className="w-4 h-4" />} onClick={() => openPay(expense)}>
                                Pay
                              </Button>
                            )}
                            {perms.canUpdate && expense.status === 'pending' && (
                              <IconButton label="Edit expense" tone="accent" onClick={() => openEdit(expense)}>
                                <MdEdit className="w-4 h-4" />
                              </IconButton>
                            )}
                            {perms.canDelete && expense.status !== 'paid' && (
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
              hint={expenseCategories.length === 0 ? 'Add an expense category on the Categories page first' : undefined}
            >
              <Select
                id="exp-category"
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                required
              >
                <option value="" disabled>
                  Select a category
                </option>
                {expenseCategories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {perms.canApprove && !editing && (
            <Field label="Status" htmlFor="exp-status" hint="Approved expenses still need to be paid before money leaves an account">
              <Select
                id="exp-status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ExpenseStatus })}
              >
                <option value="pending">Pending approval</option>
                <option value="approved">Approved</option>
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

      <Modal
        open={!!toPay}
        onClose={() => setToPay(null)}
        dismissible={!paying}
        title="Pay expense"
        description={toPay ? `${toPay.description}, ${fmt.money(toPay.amount)}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setToPay(null)} disabled={paying}>
              Cancel
            </Button>
            <Button type="submit" form="pay-form" loading={paying}>
              Record Payment
            </Button>
          </>
        }
      >
        <form id="pay-form" onSubmit={handlePay} className="space-y-4">
          {payError && <ErrorBanner message={payError} />}
          <p className="text-sm text-text-secondary">
            This records the money leaving the account in the ledger and marks the expense paid. To undo it later,
            void the payment on the Transactions page.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Paid from"
              htmlFor="pay-account"
              required
              hint={activeAccounts.length === 0 ? 'Add an active account on the Accounts page first' : undefined}
            >
              <Select
                id="pay-account"
                value={payForm.accountId}
                onChange={(e) => setPayForm({ ...payForm, accountId: e.target.value })}
                required
              >
                <option value="" disabled>
                  Select an account
                </option>
                {activeAccounts.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.name} ({fmt.money(a.currentBalance)})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Payment date" htmlFor="pay-date" required>
              <Input
                id="pay-date"
                type="date"
                value={payForm.paidDate}
                onChange={(e) => setPayForm({ ...payForm, paidDate: e.target.value })}
                required
              />
            </Field>
            <Field label="Payment method" htmlFor="pay-method">
              <Select
                id="pay-method"
                value={payForm.paymentMethod}
                onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}
              >
                <option value="">Not specified</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Reference" htmlFor="pay-reference">
              <Input
                id="pay-reference"
                value={payForm.reference}
                onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })}
              />
            </Field>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!toReject}
        onClose={() => setToReject(null)}
        dismissible={!reviewing}
        title="Reject expense"
        description={toReject ? `${toReject.description}, ${fmt.money(toReject.amount)}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setToReject(null)} disabled={!!reviewing}>
              Cancel
            </Button>
            <Button variant="danger" loading={!!reviewing} onClick={handleReject}>
              Reject Expense
            </Button>
          </>
        }
      >
        <Field label="Reason" htmlFor="reject-reason" hint="Optional. The person who submitted it will see this.">
          <Textarea
            id="reject-reason"
            rows={3}
            maxLength={500}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </Field>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete expense"
        message={
          <>
            Delete <strong className="text-text-primary">{toDelete?.description}</strong> ({fmt.money(toDelete?.amount)}
            )? This cannot be undone.
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
