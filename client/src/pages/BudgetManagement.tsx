import { FC, FormEvent, useMemo, useState } from 'react';
import { MdAdd, MdDelete, MdEdit, MdErrorOutline, MdPieChart, MdWarningAmber } from 'react-icons/md';
import { budgetService } from '../services/budgetService';
import { categoryService } from '../services/categoryService';
import { Budget, Category } from '../types';
import { useAsyncData } from '../hooks/useAsyncData';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../hooks/useToast';
import { useFormatters } from '../hooks/useFormatters';
import { errorMessage } from '../utils/format';
import { getCategoryIcon } from '../utils/categoryIcons';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import IconButton from '../components/ui/IconButton';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import ErrorBanner from '../components/ui/ErrorBanner';
import ReadOnlyNotice from '../components/ui/ReadOnlyNotice';
import { Field, Input, Select } from '../components/ui/FormField';
import { SkeletonCards, SkeletonHeader } from '../components/ui/Skeleton';

type BudgetWithStatus = Omit<Budget, 'categoryId'> & {
  // The API populates the category; older records may still be a bare id.
  categoryId: string | Pick<Category, '_id' | 'name' | 'icon' | 'color'>;
  percentageUsed: number;
  isAlertTriggered: boolean;
};

type Period = Budget['period'];

const EMPTY_FORM = { categoryId: '', amount: '', period: 'monthly' as Period, alertThreshold: '80' };

const categoryIdOf = (b: BudgetWithStatus) => (typeof b.categoryId === 'string' ? b.categoryId : b.categoryId?._id);

const progressColor = (pct: number) => (pct >= 100 ? 'bg-danger-500' : pct >= 80 ? 'bg-warning-500' : 'bg-success-500');

const BudgetManagement: FC = () => {
  const perms = usePermissions();
  const toast = useToast();
  const fmt = useFormatters();

  const { data, loading, error, reload } = useAsyncData(
    async () => {
      const [budgets, alerts, categories] = await Promise.all([
        budgetService.getAllBudgets() as unknown as Promise<BudgetWithStatus[]>,
        budgetService.getAlerts().catch(() => []),
        categoryService.getAllCategories(),
      ]);
      return { budgets, alerts, categories };
    },
    {
      budgets: [] as BudgetWithStatus[],
      alerts: [] as Awaited<ReturnType<typeof budgetService.getAlerts>>,
      categories: [] as Category[],
    }
  );
  const { budgets, alerts, categories } = data;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetWithStatus | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<BudgetWithStatus | null>(null);
  const [deleting, setDeleting] = useState(false);

  const expenseCategories = useMemo(() => categories.filter((c) => c.type === 'expense'), [categories]);
  const categoryFor = (b: BudgetWithStatus) =>
    typeof b.categoryId === 'object' && b.categoryId ? b.categoryId : categories.find((c) => c._id === b.categoryId);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, categoryId: expenseCategories[0]?._id || '' });
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (b: BudgetWithStatus) => {
    setEditing(b);
    setForm({
      categoryId: categoryIdOf(b) || '',
      amount: String(b.amount),
      period: b.period,
      alertThreshold: String(b.alertThreshold),
    });
    setFormError(null);
    setFormOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const amount = Number(form.amount);
    const alertThreshold = Number(form.alertThreshold);
    if (!form.categoryId) return setFormError('Choose a category');
    if (!amount || amount <= 0) return setFormError('Enter a budget amount greater than zero');
    if (alertThreshold < 1 || alertThreshold > 100) return setFormError('Alert threshold must be between 1 and 100');

    setSaving(true);
    setFormError(null);
    try {
      const payload = { categoryId: form.categoryId, amount, period: form.period, alertThreshold };
      if (editing) {
        await budgetService.updateBudget(editing._id, payload);
        toast.success('Budget updated');
      } else {
        await budgetService.createBudget(payload);
        toast.success('Budget created');
      }
      setFormOpen(false);
      reload();
    } catch (err) {
      setFormError(errorMessage(err, 'Failed to save budget'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await budgetService.deleteBudget(toDelete._id);
      toast.success('Budget deleted');
      setToDelete(null);
      reload();
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to delete budget'));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonHeader withAction={perms.canCreate} />
        <SkeletonCards count={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budgets"
        description="Set spending limits by category and get alerted before you overspend"
        actions={
          perms.canCreate && (
            <Button icon={<MdAdd className="w-5 h-5" />} onClick={openCreate}>
              New Budget
            </Button>
          )
        }
      />

      {perms.isReadOnly && <ReadOnlyNotice />}
      {error && <ErrorBanner message={error} onRetry={reload} />}

      {alerts.length > 0 && (
        <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <MdWarningAmber className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-warning-900 mb-2">Budget alerts</h3>
              <ul className="space-y-1">
                {alerts.map((alert) => (
                  <li
                    key={alert.budgetId}
                    className={`text-sm ${alert.severity === 'critical' ? 'text-danger-700' : 'text-warning-800'}`}
                  >
                    <strong>{alert.category}:</strong> {alert.message}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {budgets.length === 0 ? (
        <EmptyState
          icon={<MdPieChart className="w-7 h-7" />}
          title="No budgets yet"
          description={
            expenseCategories.length === 0
              ? 'Create an expense category first, then set a budget for it.'
              : 'Create a budget to keep spending in a category under control.'
          }
          action={
            perms.canCreate &&
            expenseCategories.length > 0 && (
              <Button icon={<MdAdd className="w-5 h-5" />} onClick={openCreate}>
                New Budget
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets.map((budget) => {
            const category = categoryFor(budget);
            const Icon = getCategoryIcon(category?.icon);
            const pct = budget.percentageUsed || 0;
            const spent = budget.currentSpending || 0;
            return (
              <div key={budget._id} className="bg-surface rounded-xl border border-border shadow-sm p-6">
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${category?.color || '#7E54FF'}1A`, color: category?.color || '#7E54FF' }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-text-primary truncate">{category?.name || 'Unknown category'}</h3>
                      <p className="text-xs text-text-secondary capitalize">{budget.period}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {perms.canUpdate && (
                      <IconButton label="Edit budget" tone="accent" onClick={() => openEdit(budget)}>
                        <MdEdit className="w-4 h-4" />
                      </IconButton>
                    )}
                    {perms.canDelete && (
                      <IconButton label="Delete budget" tone="danger" onClick={() => setToDelete(budget)}>
                        <MdDelete className="w-4 h-4" />
                      </IconButton>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-sm text-text-secondary">
                    <span className="font-semibold text-text-primary">{fmt.money(spent)}</span> of {fmt.money(budget.amount)}
                  </span>
                  <span className={`text-sm font-bold ${budget.isAlertTriggered ? 'text-danger-600' : 'text-success-600'}`}>
                    {pct.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-background rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all ${progressColor(pct)}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>

                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs">
                  <span className="text-text-secondary">
                    Remaining {fmt.money(Math.max(0, budget.amount - spent))}
                  </span>
                  {budget.isAlertTriggered ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-warning-700">
                      <MdErrorOutline className="w-4 h-4" />
                      Alert at {budget.alertThreshold}%
                    </span>
                  ) : (
                    <span className="text-text-secondary">Alert at {budget.alertThreshold}%</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        dismissible={!saving}
        title={editing ? 'Edit Budget' : 'New Budget'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="budget-form" loading={saving}>
              {editing ? 'Save Changes' : 'Create Budget'}
            </Button>
          </>
        }
      >
        <form id="budget-form" onSubmit={handleSubmit} className="space-y-4">
          {formError && <ErrorBanner message={formError} />}
          <Field label="Category" htmlFor="budget-category" required>
            <Select
              id="budget-category"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={`Amount (${fmt.currency})`} htmlFor="budget-amount" required>
              <Input
                id="budget-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </Field>
            <Field label="Period" htmlFor="budget-period">
              <Select
                id="budget-period"
                value={form.period}
                onChange={(e) => setForm({ ...form, period: e.target.value as Period })}
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </Select>
            </Field>
          </div>
          <Field label="Alert threshold (%)" htmlFor="budget-threshold" hint="Show an alert once this share of the budget is spent">
            <Input
              id="budget-threshold"
              type="number"
              min="1"
              max="100"
              value={form.alertThreshold}
              onChange={(e) => setForm({ ...form, alertThreshold: e.target.value })}
            />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete budget"
        message={
          <>
            Delete the {toDelete?.period} budget for{' '}
            <strong className="text-text-primary">{toDelete ? categoryFor(toDelete)?.name || 'this category' : ''}</strong>?
          </>
        }
        confirmLabel="Delete Budget"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};

export default BudgetManagement;
