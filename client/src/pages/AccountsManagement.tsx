import { FC, FormEvent, useMemo, useState } from 'react';
import {
  MdAccountBalance,
  MdAccountBalanceWallet,
  MdAdd,
  MdCreditCard,
  MdDelete,
  MdEdit,
  MdSavings,
  MdTrendingDown,
  MdTrendingUp,
} from 'react-icons/md';
import { IconType } from 'react-icons';
import { accountService } from '../services/accountService';
import { Account } from '../types';
import { useAsyncData } from '../hooks/useAsyncData';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../hooks/useToast';
import { useFormatters } from '../hooks/useFormatters';
import { errorMessage, formatCurrency } from '../utils/format';
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
import { Field, Input, Select, Toggle } from '../components/ui/FormField';
import { SkeletonCards, SkeletonHeader, SkeletonStatCards } from '../components/ui/Skeleton';

type AccountType = Account['type'];

const TYPE_META: Record<AccountType, { label: string; icon: IconType; className: string }> = {
  checking: { label: 'Checking', icon: MdAccountBalanceWallet, className: 'bg-accent-50 text-accent-600' },
  savings: { label: 'Savings', icon: MdSavings, className: 'bg-success-50 text-success-600' },
  credit: { label: 'Credit', icon: MdCreditCard, className: 'bg-warning-50 text-warning-600' },
};

const CURRENCIES = ['USD', 'EUR', 'GBP', 'KES', 'TZS', 'UGX', 'NGN', 'ZAR', 'CAD', 'AUD', 'JPY', 'INR'];

const EMPTY_FORM = {
  name: '',
  accountNumber: '',
  type: 'checking' as AccountType,
  currency: 'USD',
  balance: '',
  active: true,
};

const maskNumber = (value: string) => (value.length > 4 ? `•••• ${value.slice(-4)}` : value);

const AccountsManagement: FC = () => {
  const perms = usePermissions();
  const toast = useToast();
  const fmt = useFormatters();

  const { data: accounts, setData: setAccounts, loading, error, reload } = useAsyncData(
    () => accountService.getAllAccounts(),
    [] as Account[]
  );

  const [typeFilter, setTypeFilter] = useState<'' | AccountType>('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Account | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Matches the server's balance sheet: checking + savings are assets,
  // credit balances are liabilities.
  const totals = useMemo(() => {
    const assets = accounts
      .filter((a) => a.type !== 'credit' && a.status === 'active')
      .reduce((sum, a) => sum + a.balance, 0);
    const liabilities = accounts
      .filter((a) => a.type === 'credit' && a.status === 'active')
      .reduce((sum, a) => sum + Math.abs(a.balance), 0);
    return {
      assets,
      liabilities,
      net: assets - liabilities,
      active: accounts.filter((a) => a.status === 'active').length,
    };
  }, [accounts]);

  const visible = useMemo(
    () => accounts.filter((a) => !typeFilter || a.type === typeFilter),
    [accounts, typeFilter]
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, currency: fmt.currency });
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (a: Account) => {
    setEditing(a);
    setForm({
      name: a.name,
      accountNumber: a.accountNumber,
      type: a.type,
      currency: a.currency,
      balance: String(a.balance),
      active: a.status === 'active',
    });
    setFormError(null);
    setFormOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const balance = Number(form.balance || 0);
    if (Number.isNaN(balance)) {
      setFormError('Balance must be a number');
      return;
    }

    setSaving(true);
    setFormError(null);
    const payload: Partial<Account> = {
      name: form.name.trim(),
      accountNumber: form.accountNumber.trim(),
      type: form.type,
      currency: form.currency,
      balance,
      status: form.active ? 'active' : 'inactive',
    };
    try {
      if (editing) {
        const updated = await accountService.updateAccount(editing._id, payload);
        setAccounts((list) => list.map((a) => (a._id === updated._id ? updated : a)));
        toast.success('Account updated');
      } else {
        const created = await accountService.createAccount(payload);
        setAccounts((list) => [...list, created]);
        toast.success('Account added');
      }
      setFormOpen(false);
    } catch (err) {
      setFormError(errorMessage(err, 'Failed to save account'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await accountService.deleteAccount(toDelete._id);
      setAccounts((list) => list.filter((a) => a._id !== toDelete._id));
      toast.success('Account deleted');
      setToDelete(null);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to delete account'));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonHeader withAction={perms.canCreate} />
        <SkeletonStatCards />
        <SkeletonCards count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts"
        description="Bank, savings and credit accounts that make up your balance sheet"
        actions={
          perms.canCreate && (
            <Button icon={<MdAdd className="w-5 h-5" />} onClick={openCreate}>
              Add Account
            </Button>
          )
        }
      />

      {perms.isReadOnly && <ReadOnlyNotice />}
      {error && <ErrorBanner message={error} onRetry={reload} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Assets" value={fmt.money(totals.assets)} tone="success" icon={<MdTrendingUp className="w-5 h-5" />} />
        <StatCard label="Liabilities" value={fmt.money(totals.liabilities)} tone="danger" icon={<MdTrendingDown className="w-5 h-5" />} />
        <StatCard
          label="Net Worth"
          value={fmt.money(totals.net)}
          tone="accent"
          icon={<MdAccountBalance className="w-5 h-5" />}
        />
        <StatCard
          label="Active Accounts"
          value={totals.active}
          tone="info"
          icon={<MdAccountBalanceWallet className="w-5 h-5" />}
          hint={`${accounts.length - totals.active} inactive`}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {(['', 'checking', 'savings', 'credit'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              typeFilter === t
                ? 'bg-accent-600 border-accent-600 text-white'
                : 'bg-surface border-border text-text-secondary hover:text-text-primary'
            }`}
          >
            {t ? TYPE_META[t].label : 'All accounts'}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<MdAccountBalance className="w-7 h-7" />}
          title={accounts.length === 0 ? 'No accounts yet' : 'No accounts of this type'}
          description={
            accounts.length === 0
              ? 'Add your bank, savings and credit accounts to track balances in one place.'
              : 'Pick a different filter to see other accounts.'
          }
          action={
            perms.canCreate &&
            accounts.length === 0 && (
              <Button icon={<MdAdd className="w-5 h-5" />} onClick={openCreate}>
                Add Account
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visible.map((a) => {
            const meta = TYPE_META[a.type];
            const Icon = meta.icon;
            return (
              <div
                key={a._id}
                className={`bg-surface rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow p-6 ${
                  a.status === 'inactive' ? 'opacity-70' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.className}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-text-primary truncate">{a.name}</h3>
                      <p className="text-xs text-text-secondary font-mono">{maskNumber(a.accountNumber)}</p>
                    </div>
                  </div>
                  <Badge tone={a.status === 'active' ? 'success' : 'neutral'}>{a.status}</Badge>
                </div>

                <div className="mt-6">
                  <p className="text-xs text-text-secondary mb-1">
                    {a.type === 'credit' ? 'Outstanding balance' : 'Current balance'}
                  </p>
                  <p
                    className={`text-2xl font-bold ${
                      a.type === 'credit' ? 'text-danger-600' : a.balance < 0 ? 'text-danger-600' : 'text-text-primary'
                    }`}
                  >
                    {formatCurrency(a.balance, a.currency)}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-text-secondary">
                    {meta.label} · {a.currency}
                  </span>
                  <div className="flex gap-1">
                    {perms.canUpdate && (
                      <IconButton label="Edit account" tone="accent" onClick={() => openEdit(a)}>
                        <MdEdit className="w-4 h-4" />
                      </IconButton>
                    )}
                    {perms.canDelete && (
                      <IconButton label="Delete account" tone="danger" onClick={() => setToDelete(a)}>
                        <MdDelete className="w-4 h-4" />
                      </IconButton>
                    )}
                  </div>
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
        title={editing ? 'Edit Account' : 'Add Account'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="account-form" loading={saving}>
              {editing ? 'Save Changes' : 'Add Account'}
            </Button>
          </>
        }
      >
        <form id="account-form" onSubmit={handleSubmit} className="space-y-4">
          {formError && <ErrorBanner message={formError} />}
          <Field label="Account name" htmlFor="acc-name" required>
            <Input
              id="acc-name"
              placeholder="Main operating account"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>
          <Field label="Account number" htmlFor="acc-number" required hint="Must be unique">
            <Input
              id="acc-number"
              value={form.accountNumber}
              onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
              required
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Type" htmlFor="acc-type">
              <Select
                id="acc-type"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as AccountType })}
              >
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
                <option value="credit">Credit</option>
              </Select>
            </Field>
            <Field label="Currency" htmlFor="acc-currency">
              <Select
                id="acc-currency"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              >
                {Array.from(new Set([form.currency, ...CURRENCIES])).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field
            label={form.type === 'credit' ? 'Outstanding balance' : 'Opening balance'}
            htmlFor="acc-balance"
          >
            <Input
              id="acc-balance"
              type="number"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              value={form.balance}
              onChange={(e) => setForm({ ...form, balance: e.target.value })}
            />
          </Field>
          <Toggle
            id="acc-active"
            label="Active"
            description="Inactive accounts are excluded from totals"
            checked={form.active}
            onChange={(active) => setForm({ ...form, active })}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete account"
        message={
          <>
            Delete <strong className="text-text-primary">{toDelete?.name}</strong>? Its balance will be removed from
            your balance sheet. This cannot be undone.
          </>
        }
        confirmLabel="Delete Account"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};

export default AccountsManagement;
