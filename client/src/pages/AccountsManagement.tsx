import { FC, FormEvent, useMemo, useState } from 'react';
import { MdAccountBalanceWallet, MdAdd, MdCreditCard, MdDelete, MdEdit, MdSavings } from 'react-icons/md';
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
import StatCard, { StatStrip } from '../components/ui/StatCard';
import ReadOnlyNotice from '../components/ui/ReadOnlyNotice';
import { Field, Input, Select, Toggle } from '../components/ui/FormField';
import { SkeletonHeader, SkeletonStatCards, SkeletonTable } from '../components/ui/Skeleton';

type AccountType = Account['type'];

const TYPE_META: Record<AccountType, { label: string; icon: IconType }> = {
  checking: { label: 'Checking', icon: MdAccountBalanceWallet },
  savings: { label: 'Savings', icon: MdSavings },
  credit: { label: 'Credit', icon: MdCreditCard },
};

const CURRENCIES = ['TZS', 'USD', 'EUR', 'GBP', 'KES', 'UGX', 'NGN', 'ZAR', 'CAD', 'AUD', 'JPY', 'INR'];

const EMPTY_FORM = {
  name: '',
  accountNumber: '',
  type: 'checking' as AccountType,
  currency: 'TZS',
  openingBalance: '',
  active: true,
};

const maskNumber = (value: string) => (value.length > 4 ? `**** ${value.slice(-4)}` : value);

const AccountsManagement: FC = () => {
  const perms = usePermissions();
  const toast = useToast();
  const fmt = useFormatters();

  const {
    data: accounts,
    setData: setAccounts,
    loading,
    error,
    reload,
  } = useAsyncData(() => accountService.getAllAccounts(), [] as Account[]);

  const [typeFilter, setTypeFilter] = useState<'' | AccountType>('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Account | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Matches the server's balance sheet: checking + savings are assets, and a
  // credit account's balance is the amount owed.
  const totals = useMemo(() => {
    const assets = accounts
      .filter((a) => a.type !== 'credit' && a.status === 'active')
      .reduce((sum, a) => sum + a.currentBalance, 0);
    const liabilities = accounts
      .filter((a) => a.type === 'credit' && a.status === 'active')
      .reduce((sum, a) => sum + a.currentBalance, 0);
    return {
      assets,
      liabilities,
      net: assets - liabilities,
      active: accounts.filter((a) => a.status === 'active').length,
    };
  }, [accounts]);

  const visible = useMemo(() => accounts.filter((a) => !typeFilter || a.type === typeFilter), [accounts, typeFilter]);

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
      openingBalance: String(a.openingBalance),
      active: a.status === 'active',
    });
    setFormError(null);
    setFormOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const openingBalance = Number(form.openingBalance || 0);
    if (Number.isNaN(openingBalance)) {
      setFormError('Opening balance must be a number');
      return;
    }

    setSaving(true);
    setFormError(null);
    const payload: Partial<Account> = {
      name: form.name.trim(),
      accountNumber: form.accountNumber.trim(),
      type: form.type,
      currency: form.currency,
      openingBalance,
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
        <SkeletonTable rows={4} columns={5} />
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
            <Button icon={<MdAdd className="w-4 h-4" />} onClick={openCreate}>
              Add Account
            </Button>
          )
        }
      />

      {perms.isReadOnly && <ReadOnlyNotice />}
      {error && <ErrorBanner message={error} onRetry={reload} />}

      <StatStrip>
        <StatCard label="Total Assets" value={fmt.money(totals.assets)} tone="success" />
        <StatCard label="Liabilities" value={fmt.money(totals.liabilities)} tone="danger" />
        <StatCard label="Net Worth" value={fmt.money(totals.net)} tone="accent" />
        <StatCard
          label="Active Accounts"
          value={totals.active}
          tone="info"
          hint={`${accounts.length - totals.active} inactive`}
        />
      </StatStrip>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div
          className="inline-flex p-0.5 bg-secondary-100 rounded-md self-start"
          role="tablist"
          aria-label="Account type"
        >
          {(['', 'checking', 'savings', 'credit'] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={typeFilter === t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 h-8 rounded text-sm transition-colors ${
                typeFilter === t
                  ? 'bg-surface text-text-primary font-medium border border-border'
                  : 'text-text-secondary hover:text-text-primary border border-transparent'
              }`}
            >
              {t ? TYPE_META[t].label : 'All'}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={accounts.length === 0 ? 'No accounts yet' : 'No accounts of this type'}
          description={
            accounts.length === 0
              ? 'Add your bank, savings and credit accounts to track balances in one place.'
              : 'Pick a different filter to see other accounts.'
          }
          action={
            perms.canCreate &&
            accounts.length === 0 && (
              <Button icon={<MdAdd className="w-4 h-4" />} onClick={openCreate}>
                Add Account
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
                  <th>Account</th>
                  <th>Type</th>
                  <th>Number</th>
                  <th>Status</th>
                  <th className="text-right">Balance</th>
                  {(perms.canUpdate || perms.canDelete) && <th className="w-20" />}
                </tr>
              </thead>
              <tbody>
                {visible.map((a) => {
                  const meta = TYPE_META[a.type];
                  const Icon = meta.icon;
                  return (
                    <tr key={a._id} className={a.status === 'inactive' ? 'text-text-secondary' : ''}>
                      <td>
                        <span className="font-medium text-text-primary">{a.name}</span>
                        {a.currency !== fmt.currency && (
                          <span className="ml-2 text-xs text-text-secondary font-mono">{a.currency}</span>
                        )}
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-1.5 text-text-secondary">
                          <Icon className="w-4 h-4" />
                          {meta.label}
                        </span>
                      </td>
                      <td className="font-mono text-text-secondary">{maskNumber(a.accountNumber)}</td>
                      <td>
                        <Badge tone={a.status === 'active' ? 'success' : 'neutral'}>{a.status}</Badge>
                      </td>
                      <td
                        className={`num ${
                          (a.type === 'credit' && a.currentBalance > 0) || (a.type !== 'credit' && a.currentBalance < 0)
                            ? 'text-danger-600'
                            : 'text-text-primary'
                        }`}
                      >
                        {a.type === 'credit' && a.currentBalance > 0 ? '-' : ''}
                        {formatCurrency(a.currentBalance, a.currency)}
                      </td>
                      {(perms.canUpdate || perms.canDelete) && (
                        <td>
                          <div className="flex justify-end gap-0.5">
                            {perms.canUpdate && (
                              <IconButton label="Edit account" onClick={() => openEdit(a)}>
                                <MdEdit className="w-4 h-4" />
                              </IconButton>
                            )}
                            {perms.canDelete && (
                              <IconButton label="Delete account" tone="danger" onClick={() => setToDelete(a)}>
                                <MdDelete className="w-4 h-4" />
                              </IconButton>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-secondary-50">
                  <td colSpan={4} className="px-4 py-3 text-sm font-medium border-t border-border">
                    Net position
                  </td>
                  <td className="num px-4 py-3 border-t border-border font-medium">{fmt.money(totals.net)}</td>
                  {(perms.canUpdate || perms.canDelete) && <td className="border-t border-border" />}
                </tr>
              </tfoot>
            </table>
          </div>
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
          <Field label="Account number" htmlFor="acc-number" required hint="Must be unique within your business">
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
            label={form.type === 'credit' ? 'Amount owed when you started' : 'Opening balance'}
            htmlFor="acc-balance"
            hint="The balance before the first transaction you record here. Transactions keep it up to date from then on."
          >
            <Input
              id="acc-balance"
              type="number"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              value={form.openingBalance}
              onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
            />
          </Field>
          {editing && (
            <div className="flex items-center justify-between rounded-md bg-secondary-50 border border-border px-3 py-2 text-sm">
              <span className="text-text-secondary">Current balance</span>
              <span className="font-mono tabular text-text-primary">
                {formatCurrency(editing.currentBalance, editing.currency)}
              </span>
            </div>
          )}
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
            Delete <strong className="text-text-primary">{toDelete?.name}</strong>? Accounts that already have
            transactions can't be deleted; mark them inactive instead so their history stays intact.
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
