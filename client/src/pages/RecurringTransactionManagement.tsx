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
} from 'react-icons/md';
import { recurringTransactionService } from '../services/recurringTransactionService';
import { categoryService } from '../services/categoryService';
import { Category, RecurringTransaction } from '../types';
import { useAsyncData } from '../hooks/useAsyncData';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../hooks/useToast';
import { useFormatters } from '../hooks/useFormatters';
import { errorMessage } from '../utils/format';
import { SafeText } from '../utils/SafeText';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import IconButton from '../components/ui/IconButton';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import ErrorBanner from '../components/ui/ErrorBanner';
import StatCard from '../components/ui/StatCard';
import ReadOnlyNotice from '../components/ui/ReadOnlyNotice';
import { Field, Input, Select } from '../components/ui/FormField';
import { SkeletonHeader, SkeletonStatCards, SkeletonTable } from '../components/ui/Skeleton';

type Frequency = RecurringTransaction['frequency'];
type TxType = RecurringTransaction['type'];

const FREQUENCIES: Frequency[] = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];

// Rough monthly equivalents, used for the projected monthly totals.
const PER_MONTH: Record<Frequency, number> = { daily: 30, weekly: 4.33, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 };

const today = () => new Date().toISOString().split('T')[0];

const EMPTY_FORM = {
  description: '',
  amount: '',
  type: 'outflow' as TxType,
  category: '',
  frequency: 'monthly' as Frequency,
  nextDate: today(),
};

const RecurringTransactionManagement: FC = () => {
  const perms = usePermissions();
  const toast = useToast();
  const fmt = useFormatters();

  const { data, setData, loading, error, reload } = useAsyncData(
    async () => {
      const [items, categories] = await Promise.all([
        recurringTransactionService.getAllRecurring(),
        categoryService.getAllCategories().catch(() => [] as Category[]),
      ]);
      return { items, categories };
    },
    { items: [] as RecurringTransaction[], categories: [] as Category[] }
  );
  const { items, categories } = data;
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

  // Older records stored a category id instead of its name.
  const categoryName = (value: string) => categories.find((c) => c._id === value)?.name || value;

  const projections = useMemo(() => {
    const active = items.filter((i) => i.isActive);
    const monthly = (type: TxType) =>
      active.filter((i) => i.type === type).reduce((s, i) => s + i.amount * PER_MONTH[i.frequency], 0);
    return { inflow: monthly('inflow'), outflow: monthly('outflow'), active: active.length };
  }, [items]);

  const categoryOptions = (type: TxType) =>
    categories.filter((c) => c.type === (type === 'inflow' ? 'income' : 'expense')).map((c) => c.name);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, nextDate: today(), category: categoryOptions('outflow')[0] || '' });
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (item: RecurringTransaction) => {
    setEditing(item);
    setForm({
      description: item.description,
      amount: String(item.amount),
      type: item.type,
      category: categoryName(item.category),
      frequency: item.frequency,
      nextDate: item.nextDate?.split('T')[0] || today(),
    });
    setFormError(null);
    setFormOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!amount || amount <= 0) return setFormError('Enter an amount greater than zero');
    if (!form.category.trim()) return setFormError('Choose a category');

    setSaving(true);
    setFormError(null);
    const payload = {
      description: form.description.trim(),
      amount,
      type: form.type,
      category: form.category.trim(),
      frequency: form.frequency,
      nextDate: form.nextDate,
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

  const formCategories = Array.from(new Set([...categoryOptions(form.type), form.category].filter(Boolean)));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recurring Transactions"
        description="Schedule regular income and expenses such as rent, payroll or subscriptions"
        actions={
          perms.canCreate && (
            <Button icon={<MdAdd className="w-5 h-5" />} onClick={openCreate}>
              New Schedule
            </Button>
          )
        }
      />

      {perms.isReadOnly && <ReadOnlyNotice />}
      {error && <ErrorBanner message={error} onRetry={reload} />}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard
          label="Projected Monthly Inflow"
          value={fmt.money(projections.inflow)}
          tone="success"
          icon={<MdArrowUpward className="w-5 h-5" />}
        />
        <StatCard
          label="Projected Monthly Outflow"
          value={fmt.money(projections.outflow)}
          tone="danger"
          icon={<MdArrowDownward className="w-5 h-5" />}
        />
        <StatCard
          label="Active Schedules"
          value={projections.active}
          icon={<MdRepeat className="w-5 h-5" />}
          hint={`${items.length - projections.active} paused`}
        />
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<MdRepeat className="w-7 h-7" />}
          title="No recurring transactions"
          description="Set up schedules for payments that happen on a regular basis."
          action={
            perms.canCreate && (
              <Button icon={<MdAdd className="w-5 h-5" />} onClick={openCreate}>
                New Schedule
              </Button>
            )
          }
        />
      ) : (
        <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">Frequency</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">Next run</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-secondary">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => (
                  <tr key={item._id} className={`hover:bg-background/60 transition-colors ${item.isActive ? '' : 'opacity-60'}`}>
                    <td className="px-6 py-4 text-sm">
                      <SafeText className="font-medium text-text-primary">{item.description}</SafeText>
                      <p className="text-xs text-text-secondary mt-0.5">{categoryName(item.category)}</p>
                    </td>
                    <td className="px-6 py-4 text-sm capitalize text-text-primary">{item.frequency}</td>
                    <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">{fmt.date(item.nextDate)}</td>
                    <td
                      className={`px-6 py-4 text-sm font-semibold text-right whitespace-nowrap ${
                        item.type === 'inflow' ? 'text-success-700' : 'text-text-primary'
                      }`}
                    >
                      {item.type === 'inflow' ? '+' : '-'}
                      {fmt.money(item.amount)}
                    </td>
                    <td className="px-6 py-4">
                      <Badge tone={item.isActive ? 'success' : 'neutral'}>{item.isActive ? 'Active' : 'Paused'}</Badge>
                    </td>
                    <td className="px-6 py-4">
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
            <Field label="Category" htmlFor="rec-category" required>
              {formCategories.length > 0 ? (
                <Select
                  id="rec-category"
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
                  id="rec-category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  required
                />
              )}
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
