import { FC, FormEvent, useMemo, useState } from 'react';
import {
  MdAdd,
  MdAdminPanelSettings,
  MdBlock,
  MdCheckCircle,
  MdDelete,
  MdEdit,
  MdPeople,
  MdPersonAdd,
  MdPersonOff,
} from 'react-icons/md';
import { userService, UserInput } from '../services/userService';
import { User, UserRole } from '../types';
import { useAsyncData } from '../hooks/useAsyncData';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useFormatters } from '../hooks/useFormatters';
import { ROLE_DESCRIPTIONS } from '../utils/permissions';
import { errorMessage } from '../utils/format';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import IconButton from '../components/ui/IconButton';
import Badge, { BadgeTone } from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import ErrorBanner from '../components/ui/ErrorBanner';
import SearchInput from '../components/ui/SearchInput';
import StatCard from '../components/ui/StatCard';
import { Field, Input, Select, Toggle } from '../components/ui/FormField';
import { SkeletonHeader, SkeletonStatCards, SkeletonTable } from '../components/ui/Skeleton';

const ROLES: UserRole[] = ['admin', 'manager', 'operator', 'viewer'];

const ROLE_TONES: Record<UserRole, BadgeTone> = {
  admin: 'accent',
  manager: 'info',
  operator: 'warning',
  viewer: 'neutral',
};

const EMPTY_FORM: UserInput & { password: string } = {
  name: '',
  email: '',
  role: 'viewer',
  isActive: true,
  password: '',
};

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

const UsersManagement: FC = () => {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const fmt = useFormatters();

  const { data: users, setData: setUsers, loading, error, reload } = useAsyncData(
    () => userService.getAllUsers({ limit: 100 }).then((res) => res.items),
    [] as User[]
  );

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'' | UserRole>('');
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'inactive'>('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [toDelete, setToDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter(
      (u) =>
        (!term || u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)) &&
        (!roleFilter || u.role === roleFilter) &&
        (!statusFilter || (statusFilter === 'active') === u.isActive)
    );
  }, [users, search, roleFilter, statusFilter]);

  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((u) => u.isActive).length,
      admins: users.filter((u) => u.role === 'admin').length,
      inactive: users.filter((u) => !u.isActive).length,
    }),
    [users]
  );

  const isSelf = (u: User) => u._id === currentUser?.id;

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, role: u.role, isActive: u.isActive, password: '' });
    setFormError(null);
    setFormOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing && form.password.length < 8) {
      setFormError('Password must be at least 8 characters');
      return;
    }
    if (editing && form.password && form.password.length < 8) {
      setFormError('New password must be at least 8 characters');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        const { password, ...rest } = form;
        const updated = await userService.updateUser(editing._id, password ? form : rest);
        setUsers((list) => list.map((u) => (u._id === updated._id ? updated : u)));
        toast.success(`${updated.name} updated`);
      } else {
        const created = await userService.createUser(form);
        setUsers((list) => [created, ...list]);
        toast.success(`${created.name} added`);
      }
      setFormOpen(false);
    } catch (err) {
      setFormError(errorMessage(err, 'Failed to save user'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u: User) => {
    try {
      const updated = await userService.updateUser(u._id, { isActive: !u.isActive });
      setUsers((list) => list.map((x) => (x._id === updated._id ? updated : x)));
      toast.success(`${updated.name} ${updated.isActive ? 'activated' : 'deactivated'}`);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to update user'));
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await userService.deleteUser(toDelete._id);
      setUsers((list) => list.filter((u) => u._id !== toDelete._id));
      toast.success(`${toDelete.name} deleted`);
      setToDelete(null);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to delete user'));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonHeader />
        <SkeletonStatCards />
        <SkeletonTable rows={6} columns={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Invite team members, assign roles and control access"
        actions={
          <Button icon={<MdPersonAdd className="w-5 h-5" />} onClick={openCreate}>
            Add User
          </Button>
        }
      />

      {error && <ErrorBanner message={error} onRetry={reload} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Users" value={stats.total} icon={<MdPeople className="w-5 h-5" />} />
        <StatCard
          label="Active"
          value={stats.active}
          tone="success"
          icon={<MdCheckCircle className="w-5 h-5" />}
        />
        <StatCard
          label="Administrators"
          value={stats.admins}
          tone="info"
          icon={<MdAdminPanelSettings className="w-5 h-5" />}
        />
        <StatCard
          label="Deactivated"
          value={stats.inactive}
          tone="danger"
          icon={<MdPersonOff className="w-5 h-5" />}
        />
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name or email"
          className="flex-1"
        />
        <Select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as UserRole | '')}
          className="md:w-44"
          aria-label="Filter by role"
        >
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </option>
          ))}
        </Select>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as '' | 'active' | 'inactive')}
          className="md:w-44"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Deactivated</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<MdPeople className="w-7 h-7" />}
          title={users.length === 0 ? 'No users yet' : 'No users match your filters'}
          description={
            users.length === 0
              ? 'Add your first team member to get started.'
              : 'Try a different search term or clear the filters.'
          }
          action={
            users.length === 0 && (
              <Button icon={<MdAdd className="w-5 h-5" />} onClick={openCreate}>
                Add User
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
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">User</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">Joined</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((u) => (
                  <tr key={u._id} className="hover:bg-background/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                            u.isActive ? 'bg-accent-100 text-accent-700' : 'bg-secondary-100 text-secondary-500'
                          }`}
                        >
                          {initials(u.name) || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-text-primary truncate">
                            {u.name}
                            {isSelf(u) && <span className="ml-2 text-xs font-medium text-accent-600">(You)</span>}
                          </p>
                          <p className="text-xs text-text-secondary truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge tone={ROLE_TONES[u.role]}>{u.role}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge tone={u.isActive ? 'success' : 'danger'}>{u.isActive ? 'Active' : 'Deactivated'}</Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">{fmt.date(u.createdAt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <IconButton label="Edit user" tone="accent" onClick={() => openEdit(u)}>
                          <MdEdit className="w-4 h-4" />
                        </IconButton>
                        <IconButton
                          label={u.isActive ? 'Deactivate user' : 'Activate user'}
                          tone={u.isActive ? 'neutral' : 'success'}
                          disabled={isSelf(u)}
                          onClick={() => toggleActive(u)}
                        >
                          {u.isActive ? <MdBlock className="w-4 h-4" /> : <MdCheckCircle className="w-4 h-4" />}
                        </IconButton>
                        <IconButton
                          label="Delete user"
                          tone="danger"
                          disabled={isSelf(u)}
                          onClick={() => setToDelete(u)}
                        >
                          <MdDelete className="w-4 h-4" />
                        </IconButton>
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
        title={editing ? 'Edit User' : 'Add User'}
        description={editing ? `Update details for ${editing.email}` : 'Create an account for a team member'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="user-form" loading={saving}>
              {editing ? 'Save Changes' : 'Create User'}
            </Button>
          </>
        }
      >
        <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
          {formError && <ErrorBanner message={formError} />}
          <Field label="Full name" htmlFor="user-name" required>
            <Input
              id="user-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              minLength={2}
            />
          </Field>
          <Field label="Email" htmlFor="user-email" required>
            <Input
              id="user-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </Field>
          <Field label="Role" htmlFor="user-role" hint={ROLE_DESCRIPTIONS[form.role]}>
            <Select
              id="user-role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
              disabled={!!editing && isSelf(editing)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label={editing ? 'Reset password' : 'Temporary password'}
            htmlFor="user-password"
            required={!editing}
            hint={editing ? 'Leave blank to keep the current password' : 'At least 8 characters'}
          >
            <Input
              id="user-password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required={!editing}
            />
          </Field>
          <Toggle
            id="user-active"
            label="Active account"
            description="Deactivated users cannot sign in"
            checked={form.isActive}
            disabled={!!editing && isSelf(editing)}
            onChange={(checked) => setForm({ ...form, isActive: checked })}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete user"
        message={
          <>
            Permanently delete <strong className="text-text-primary">{toDelete?.name}</strong>? They will lose access
            immediately. This cannot be undone.
          </>
        }
        confirmLabel="Delete User"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};

export default UsersManagement;
