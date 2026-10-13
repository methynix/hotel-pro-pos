import { FC, FormEvent, useMemo, useState } from 'react';
import { MdContentCopy, MdDelete, MdEdit, MdMailOutline, MdPeople, MdPersonAdd, MdPersonRemove } from 'react-icons/md';
import { userService } from '../services/userService';
import { invitationService } from '../services/invitationService';
import { Invitation, User, UserRole } from '../types';
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
import StatCard, { StatStrip } from '../components/ui/StatCard';
import { Field, Input, Select } from '../components/ui/FormField';
import { SkeletonHeader, SkeletonStatCards, SkeletonTable } from '../components/ui/Skeleton';

const ROLES: UserRole[] = ['admin', 'manager', 'operator', 'viewer'];

const ROLE_TONES: Record<UserRole, BadgeTone> = {
  admin: 'accent',
  manager: 'info',
  operator: 'warning',
  viewer: 'neutral',
};

const roleLabel = (role: UserRole) => role.charAt(0).toUpperCase() + role.slice(1);

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

const RoleSelect: FC<{ id: string; value: UserRole; onChange: (role: UserRole) => void }> = ({ id, value, onChange }) => (
  <Select id={id} value={value} onChange={(e) => onChange(e.target.value as UserRole)}>
    {ROLES.map((r) => (
      <option key={r} value={r}>
        {roleLabel(r)}
      </option>
    ))}
  </Select>
);

const UsersManagement: FC = () => {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const fmt = useFormatters();
  const orgName = currentUser?.organization?.name ?? 'your business';

  const { data, setData, loading, error, reload } = useAsyncData(
    async () => {
      const [members, invitations] = await Promise.all([
        userService.getAllUsers({ limit: 100 }).then((res) => res.items),
        invitationService.getPending(),
      ]);
      return { members, invitations };
    },
    { members: [] as User[], invitations: [] as Invitation[] },
  );
  const { members, invitations } = data;

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'' | UserRole>('');

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('viewer');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<{ url: string; email: string; emailed: boolean } | null>(null);

  const [editing, setEditing] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('viewer');
  const [savingRole, setSavingRole] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  const [toRemove, setToRemove] = useState<User | null>(null);
  const [removing, setRemoving] = useState(false);
  const [toRevoke, setToRevoke] = useState<Invitation | null>(null);
  const [revoking, setRevoking] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return members.filter(
      (u) =>
        (!term || u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)) &&
        (!roleFilter || u.role === roleFilter),
    );
  }, [members, search, roleFilter]);

  const stats = useMemo(
    () => ({
      total: members.length,
      admins: members.filter((u) => u.role === 'admin').length,
      editors: members.filter((u) => u.role === 'manager' || u.role === 'operator').length,
      pending: invitations.length,
    }),
    [members, invitations],
  );

  const isSelf = (u: User) => u._id === currentUser?.id;

  const openInvite = () => {
    setInviteEmail('');
    setInviteRole('viewer');
    setInviteError(null);
    setInviteLink(null);
    setInviteOpen(true);
  };

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setInviteError(null);
    try {
      const result = await invitationService.create(inviteEmail.trim(), inviteRole);
      setData((d) => ({
        ...d,
        invitations: [result.invitation, ...d.invitations.filter((i) => i.email !== result.invitation.email)],
      }));
      setInviteLink({ url: result.inviteUrl, email: result.invitation.email, emailed: result.emailed });
    } catch (err) {
      setInviteError(errorMessage(err, 'Failed to send invitation'));
    } finally {
      setInviting(false);
    }
  };

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Invitation link copied');
    } catch {
      toast.error('Could not copy; select the link and copy it manually');
    }
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setEditRole(u.role);
    setRoleError(null);
  };

  const handleRoleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSavingRole(true);
    setRoleError(null);
    try {
      const updated = await userService.updateRole(editing._id, editRole);
      setData((d) => ({ ...d, members: d.members.map((u) => (u._id === updated._id ? updated : u)) }));
      toast.success(`${updated.name} is now ${roleLabel(updated.role).toLowerCase()}`);
      setEditing(null);
    } catch (err) {
      setRoleError(errorMessage(err, 'Failed to change role'));
    } finally {
      setSavingRole(false);
    }
  };

  const handleRemove = async () => {
    if (!toRemove) return;
    setRemoving(true);
    try {
      await userService.removeMember(toRemove._id);
      setData((d) => ({ ...d, members: d.members.filter((u) => u._id !== toRemove._id) }));
      toast.success(`${toRemove.name} removed from ${orgName}`);
      setToRemove(null);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to remove member'));
    } finally {
      setRemoving(false);
    }
  };

  const handleRevoke = async () => {
    if (!toRevoke) return;
    setRevoking(true);
    try {
      await invitationService.revoke(toRevoke._id);
      setData((d) => ({ ...d, invitations: d.invitations.filter((i) => i._id !== toRevoke._id) }));
      toast.success(`Invitation for ${toRevoke.email} revoked`);
      setToRevoke(null);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to revoke invitation'));
    } finally {
      setRevoking(false);
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
        title="Team"
        description={`Who can access ${orgName}, and what they can do`}
        actions={
          <Button icon={<MdPersonAdd className="w-4 h-4" />} onClick={openInvite}>
            Invite Member
          </Button>
        }
      />

      {error && <ErrorBanner message={error} onRetry={reload} />}

      <StatStrip>
        <StatCard label="Members" value={stats.total} />
        <StatCard label="Administrators" value={stats.admins} tone="info" />
        <StatCard label="Managers and Operators" value={stats.editors} tone="success" />
        <StatCard label="Pending Invitations" value={stats.pending} tone="warning" />
      </StatStrip>

      {invitations.length > 0 && (
        <div className="panel overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-text-primary">Pending invitations</h2>
          </div>
          <ul className="divide-y divide-border">
            {invitations.map((inv) => (
              <li key={inv._id} className="flex items-center gap-3 px-5 py-3">
                <MdMailOutline className="w-4 h-4 text-text-secondary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate">{inv.email}</p>
                  <p className="text-xs text-text-secondary">Expires {fmt.date(inv.expiresAt)}</p>
                </div>
                <Badge tone={ROLE_TONES[inv.role]}>{inv.role}</Badge>
                <IconButton label="Revoke invitation" tone="danger" onClick={() => setToRevoke(inv)}>
                  <MdDelete className="w-4 h-4" />
                </IconButton>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name or email" className="flex-1" />
        <Select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as UserRole | '')}
          className="md:w-44"
          aria-label="Filter by role"
        >
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {roleLabel(r)}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<MdPeople className="w-7 h-7" />}
          title="No members match your filters"
          description="Try a different search term or clear the filters."
        />
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium bg-primary-900 text-white">
                          {initials(u.name) || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-text-primary truncate">
                            {u.name}
                            {isSelf(u) && <span className="ml-2 text-xs font-normal text-text-secondary">you</span>}
                          </p>
                          <p className="text-xs text-text-secondary truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge tone={ROLE_TONES[u.role]}>{u.role}</Badge>
                    </td>
                    <td className="text-text-secondary whitespace-nowrap">{fmt.date(u.joinedAt)}</td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <IconButton
                          label={isSelf(u) ? "You can't change your own role" : 'Change role'}
                          tone="accent"
                          disabled={isSelf(u)}
                          onClick={() => openEdit(u)}
                        >
                          <MdEdit className="w-4 h-4" />
                        </IconButton>
                        <IconButton
                          label={isSelf(u) ? "You can't remove yourself" : 'Remove from business'}
                          tone="danger"
                          disabled={isSelf(u)}
                          onClick={() => setToRemove(u)}
                        >
                          <MdPersonRemove className="w-4 h-4" />
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
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        dismissible={!inviting}
        title={inviteLink ? 'Invitation ready' : 'Invite Member'}
        description={inviteLink ? undefined : `They'll join ${orgName} with the role you choose`}
        footer={
          inviteLink ? (
            <>
              <Button variant="secondary" onClick={openInvite}>
                Invite Another
              </Button>
              <Button onClick={() => setInviteOpen(false)}>Done</Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setInviteOpen(false)} disabled={inviting}>
                Cancel
              </Button>
              <Button type="submit" form="invite-form" loading={inviting}>
                Send Invitation
              </Button>
            </>
          )
        }
      >
        {inviteLink ? (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              {inviteLink.emailed
                ? `We emailed an invitation to ${inviteLink.email}. You can also share this link with them directly.`
                : `Email isn't set up, so share this link with ${inviteLink.email} yourself. It works once, for 7 days.`}
            </p>
            <div className="flex gap-2">
              <Input value={inviteLink.url} readOnly onFocus={(e) => e.currentTarget.select()} aria-label="Invitation link" />
              <Button variant="secondary" icon={<MdContentCopy className="w-4 h-4" />} onClick={() => copyLink(inviteLink.url)}>
                Copy
              </Button>
            </div>
          </div>
        ) : (
          <form id="invite-form" onSubmit={handleInvite} className="space-y-4">
            {inviteError && <ErrorBanner message={inviteError} />}
            <Field label="Email" htmlFor="invite-email" required>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </Field>
            <Field label="Role" htmlFor="invite-role" hint={ROLE_DESCRIPTIONS[inviteRole]}>
              <RoleSelect id="invite-role" value={inviteRole} onChange={setInviteRole} />
            </Field>
          </form>
        )}
      </Modal>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        dismissible={!savingRole}
        title="Change Role"
        description={editing ? `${editing.name} (${editing.email})` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={savingRole}>
              Cancel
            </Button>
            <Button type="submit" form="role-form" loading={savingRole}>
              Save Role
            </Button>
          </>
        }
      >
        <form id="role-form" onSubmit={handleRoleSave} className="space-y-4">
          {roleError && <ErrorBanner message={roleError} />}
          <Field label="Role" htmlFor="member-role" hint={ROLE_DESCRIPTIONS[editRole]}>
            <RoleSelect id="member-role" value={editRole} onChange={setEditRole} />
          </Field>
          <p className="text-xs text-text-secondary">The change applies immediately, without them signing in again.</p>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toRemove}
        title="Remove member"
        message={
          <>
            Remove <strong className="text-text-primary">{toRemove?.name}</strong> from {orgName}? They lose access to
            its data immediately. Their ledgerHQ account and any other businesses they belong to are not affected.
          </>
        }
        confirmLabel="Remove Member"
        loading={removing}
        onConfirm={handleRemove}
        onCancel={() => setToRemove(null)}
      />

      <ConfirmDialog
        open={!!toRevoke}
        title="Revoke invitation"
        message={
          <>
            Revoke the invitation for <strong className="text-text-primary">{toRevoke?.email}</strong>? The link will
            stop working.
          </>
        }
        confirmLabel="Revoke"
        loading={revoking}
        onConfirm={handleRevoke}
        onCancel={() => setToRevoke(null)}
      />
    </div>
  );
};

export default UsersManagement;
