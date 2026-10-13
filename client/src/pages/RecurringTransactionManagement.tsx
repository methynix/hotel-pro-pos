import { FC, FormEvent, useMemo, useState } from 'react';
import {
  MdAdd,
  MdArrowDownward,
  MdArrowUpward,
  MdDelete,
  MdEdit,
  MdPause,
  MdPlayArrow,
  MdRepeat,
  MdErrorOutline,
} from 'react-icons/md';
import { recurringTransactionService } from '../services/recurringTransactionService';
import { categoryService } from '../services/categoryService';
import { accountService } from '../services/accountService';
import { Account, Category, RecurringTransaction } from '../types';
import { useAsyncData } from '../hooks/useAsyncData';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../hooks/useToast';
import { useFormatters } from '../hooks/useFormatters';
import { apiToDateInput, dateInputToApi, errorMessage, todayInput } from '../utils/format';
import { SafeText } from '../utils/SafeText';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import IconButton from '../components/ui/IconButton';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import ErrorBanner from '../components/ui/ErrorBanner';
import StatCard, { StatStrip } from '../components/ui/StatCard';
import ReadOnlyNotice from '../components/ui/ReadOnlyNotice';
import { Field, Input, Select } from '../components/ui/FormField';
import { SkeletonHeader, SkeletonStatCards, SkeletonTable } from '../components/ui/Skeleton';

type Frequency = RecurringTransaction['frequency'];
type TxType = RecurringTransaction['type'];

const FREQUENCIES: Frequency[] = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];

// Rough monthly equivalents, used for the projected monthly totals.
const PER_MONTH: Record<Frequency, number> = { daily: 30, weekly: 4.33, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 };

const EMPTY_FORM = {
  description: '',
  amount: '',
  type: 'expense' as TxType,
  accountId: '',
  categoryId: '',
  frequency: 'monthly' as Frequency,
  nextDate: '',
};

const RecurringTransactionManagement: FC = () => {
  const perms = usePermissions();
  const toast = useToast();
  const fmt = useFormatters();

  const { data, setData, loading, error, reload } = useAsyncData(
    async () => {
      const [items, categories, accounts] = await Promise.all([
        recurringTransactionService.getAllRecurring(),
        categoryService.getAllCategories().catch(() => [] as Category[]),
        accountService.getAllAccounts().catch(() => [] as Account[]),
      ]);
      return { items, categories, accounts };
    },
    { items: [] as RecurringTransaction[], categories: [] as Category[], accounts: [] as Account[] },
  );
  const { items, categories, accounts } = data;
  const setItems = (update: (list: RecurringTransaction[]) => RecurringTransaction[]) =>
    setData((d) => ({ ...d, items: update(d.items) }));

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringTransaction | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<RecurringTransaction | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const categoryName = (id: string) => categories.find((c) => c._id === id)?.name || 'Uncategorized';
  const accountName = (id: string) => accounts.find((a) => a._id === id)?.name || 'Unknown account';
  const accountOptions = (selected: string) => accounts.filter((a) => a.status === 'active' || a._id === selected);

  const projections = useMemo(() => {
    const active = items.filter((i) => i.isActive);
    const monthly = (type: TxType) =>
      active.filter((i) => i.type === type).reduce((s, i) => s + i.amount * PER_MONTH[i.frequency], 0);
    return { inflow: monthly('income'), outflow: monthly('expense'), active: active.length };
  }, [items]);

  const categoryOptions = (type: TxType) => categories.filter((c) => c.type === type);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      nextDate: todayInput(),
      accountId: accounts.find((a) => a.status === 'active')?._id || '',
      categoryId: categoryOptions('expense')[0]?._id || '',
    });
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (item: RecurringTransaction) => {
    setEditing(item);
    setForm({
      description: item.description,
      amount: String(item.amount),
      type: item.type,
      accountId: item.accountId,
      categoryId: item.categoryId,
      frequency: item.frequency,
      nextDate: apiToDateInput(item.nextDate) || todayInput(),
    });
    setFormError(null);
    setFormOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!amount || amount <= 0) return setFormError('Enter an amount greater than zero');
    if (!form.accountId) return setFormError('Choose an account');
    if (!form.categoryId) return setFormError('Choose a category');

    setSaving(true);
    setFormError(null);
    const payload = {
      description: form.description.trim(),
      amount,
      type: form.type,
      accountId: form.accountId,
      categoryId: form.categoryId,
      frequency: form.frequency,
      nextDate: dateInputToApi(form.nextDate),
    };
    try {
      if (editing) {
        const updated = await recurringTransactionService.updateRecurring(editing._id, payload);
        setItems((list) => list.map((i) => (i._id === updated._id ? updated : i)));
        toast.success('Recurring transaction updated');
      } else {
        const created = await recurringTransactionService.createRecurring(payload);
        setItems((list) => [created, ...list]);
        toast.success('Recurring transaction created');
      }
      setFormOpen(false);
    } catch (err) {
      setFormError(errorMessage(err, 'Failed to save recurring transaction'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item: RecurringTransaction) => {
    setToggling(item._id);
    try {
      const updated = await recurringTransactionService.toggleRecurring(item._id);
      setItems((list) => list.map((i) => (i._id === updated._id ? updated : i)));
      toast.success(updated.isActive ? 'Schedule resumed' : 'Schedule paused');
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to update schedule'));
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await recurringTransactionService.deleteRecurring(toDelete._id);
      setItems((list) => list.filter((i) => i._id !== toDelete._id));
      toast.success('Recurring transaction deleted');
      setToDelete(null);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to delete'));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonHeader withAction={perms.canCreate} />
        <SkeletonStatCards count={3} />
        <SkeletonTable rows={6} columns={6} />
      </div>
    );
  }

  const formCategories = categoryOptions(form.type);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recurring Transactions"
        description="Schedule regular income and expenses such as rent, payroll or subscriptions"
        actions={
          perms.canCreate &&
          accounts.length > 0 && (
            <Button icon={<MdAdd className="w-4 h-4" />} onClick={openCreate}>
              New Schedule
            </Button>
          )
        }
      />

      {perms.isReadOnly && <ReadOnlyNotice />}
      {error && <ErrorBanner message={error} onRetry={reload} />}

      <StatStrip columns={3}>
        <StatCard label="Projected Monthly Inflow" value={fmt.money(projections.inflow)} tone="success" />
        <StatCard label="Projected Monthly Outflow" value={fmt.money(projections.outflow)} tone="danger" />
        <StatCard
          label="Active Schedules"
          value={projections.active}
          hint={`${items.length - projections.active} paused`}
        />
      </StatStrip>

      {items.length === 0 ? (
        <EmptyState
          icon={<MdRepeat className="w-7 h-7" />}
          title="No recurring transactions"
          description={
            accounts.length === 0
              ? 'Add an account on the Accounts page first; each schedule posts to an account.'
              : 'Set up schedules for payments that happen on a regular basis. They post to the ledger automatically on each run date.'
          }
          action={
            perms.canCreate &&
            accounts.length > 0 && (
              <Button icon={<MdAdd className="w-4 h-4" />} onClick={openCreate}>
                New Schedule
              </Button>
            )
          }
        />
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Frequency</th>
                  <th>Next run</th>
                  <th className="text-right">Amount</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id} className={`${item.isActive ? '' : 'opacity-60'}`}>
                    <td>
                      <SafeText className="font-medium text-text-primary">{item.description}</SafeText>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {categoryName(item.categoryId)} · {accountName(item.accountId)}
                      </p>
                      {item.lastError && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-danger-600">
                          <MdErrorOutline className="w-3.5 h-3.5 shrink-0" />
                          Last run failed: {item.lastError}
                        </p>
                      )}
                    </td>
                    <td className="capitalize text-text-primary">{item.frequency}</td>
                    <td className="text-text-secondary whitespace-nowrap">{fmt.date(item.nextDate)}</td>
                    <td className={`num ${item.type === 'income' ? 'text-success-700' : 'text-text-primary'}`}>
                      {item.type === 'income' ? '+' : '-'}
                      {fmt.money(item.amount)}
                    </td>
                    <td>
                      <Badge tone={item.isActive ? 'success' : 'neutral'}>{item.isActive ? 'Active' : 'Paused'}</Badge>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        {perms.canUpdate && (
                          <>
                            <IconButton
                              label={item.isActive ? 'Pause schedule' : 'Resume schedule'}
                              tone={item.isActive ? 'neutral' : 'success'}
                              disabled={toggling === item._id}
                              onClick={() => handleToggle(item)}
                            >
                              {item.isActive ? <MdPause className="w-4 h-4" /> : <MdPlayArrow className="w-4 h-4" />}
                            </IconButton>
                            <IconButton label="Edit schedule" tone="accent" onClick={() => openEdit(item)}>
                              <MdEdit className="w-4 h-4" />
                            </IconButton>
                          </>
                        )}
                        {perms.canDelete && (
                          <IconButton label="Delete schedule" tone="danger" onClick={() => setToDelete(item)}>
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
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        dismissible={!saving}
        title={editing ? 'Edit Schedule' : 'New Schedule'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="recurring-form" loading={saving}>
              {editing ? 'Save Changes' : 'Create Schedule'}
            </Button>
          </>
        }
      >
        <form id="recurring-form" onSubmit={handleSubmit} className="space-y-4">
          {formError && <ErrorBanner message={formError} />}
          <div className="grid grid-cols-2 gap-2">
            {(['income', 'expense'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    type,
                    categoryId: categoryOptions(type).some((c) => c._id === form.categoryId)
                      ? form.categoryId
                      : categoryOptions(type)[0]?._id || '',
                  })
                }
                className={`flex items-center justify-center gap-2 h-9 px-3 rounded-md border text-sm font-medium transition-colors ${
                  form.type === type
                    ? 'border-primary-900 bg-primary-900 text-white'
                    : 'border-border text-text-secondary hover:bg-secondary-50'
                }`}
              >
                {type === 'income' ? <MdArrowUpward className="w-4 h-4" /> : <MdArrowDownward className="w-4 h-4" />}
                {type === 'income' ? 'Money in' : 'Money out'}
              </button>
            ))}
          </div>
          <Field label="Description" htmlFor="rec-description" required>
            <Input
              id="rec-description"
              placeholder="Office rent"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={`Amount (${fmt.currency})`} htmlFor="rec-amount" required>
              <Input
                id="rec-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </Field>
            <Field label={form.type === 'income' ? 'Paid into' : 'Paid from'} htmlFor="rec-account" required>
              <Select
                id="rec-account"
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
            <Field label="Category" htmlFor="rec-category" required>
              <Select
                id="rec-category"
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
            <Field label="Frequency" htmlFor="rec-frequency">
              <Select
                id="rec-frequency"
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value as Frequency })}
              >
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Next run" htmlFor="rec-next" required>
              <Input
                id="rec-next"
                type="date"
                value={form.nextDate}
                onChange={(e) => setForm({ ...form, nextDate: e.target.value })}
                required
              />
            </Field>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete schedule"
        message={
          <>
            Delete the recurring transaction <strong className="text-text-primary">{toDelete?.description}</strong>?
            Transactions it already created are kept.
          </>
        }
        confirmLabel="Delete Schedule"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};

export default RecurringTransactionManagement;
