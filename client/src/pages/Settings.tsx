import { FC, FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IconType } from 'react-icons';
import {
  MdCheck,
  MdClose,
  MdLock,
  MdLogout,
  MdNotifications,
  MdPerson,
  MdSecurity,
  MdTune,
  MdVerifiedUser,
} from 'react-icons/md';
import { authService } from '../services/authService';
import { organizationService } from '../services/organizationService';
import { UserPreferences } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { usePermissions } from '../hooks/usePermissions';
import { DEFAULT_PREFERENCES, errorMessage, formatCurrency, formatDate } from '../utils/format';
import { ROLE_DESCRIPTIONS } from '../utils/permissions';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ErrorBanner from '../components/ui/ErrorBanner';
import { Field, Input, Select, Toggle } from '../components/ui/FormField';

type SectionId = 'profile' | 'security' | 'preferences' | 'notifications' | 'access';

const SECTIONS: { id: SectionId; label: string; icon: IconType }[] = [
  { id: 'profile', label: 'Profile', icon: MdPerson },
  { id: 'security', label: 'Security', icon: MdSecurity },
  { id: 'preferences', label: 'Preferences', icon: MdTune },
  { id: 'notifications', label: 'Notifications', icon: MdNotifications },
  { id: 'access', label: 'Business & Role', icon: MdVerifiedUser },
];

const CURRENCIES = [
  { code: 'TZS', name: 'Tanzanian Shilling' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'KES', name: 'Kenyan Shilling' },
  { code: 'UGX', name: 'Ugandan Shilling' },
  { code: 'NGN', name: 'Nigerian Naira' },
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'INR', name: 'Indian Rupee' },
];

const DATE_FORMATS: UserPreferences['dateFormat'][] = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'];

const Card: FC<{ title: string; description?: string; children: ReactNode; footer?: ReactNode }> = ({
  title,
  description,
  children,
  footer,
}) => (
  <div className="panel">
    <div className="px-6 pt-5">
      <h2 className="text-base font-semibold text-text-primary">{title}</h2>
      {description && <p className="text-sm text-text-secondary mt-1">{description}</p>}
    </div>
    <div className="p-6">{children}</div>
    {footer && (
      <div className="px-6 py-3 border-t border-border bg-secondary-50 rounded-b-xl flex justify-end gap-2">
        {footer}
      </div>
    )}
  </div>
);

/** Lets an admin rename the active business. */
const BusinessName: FC = () => {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const current = user?.organization?.name ?? '';
  const [name, setName] = useState(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const org = await organizationService.updateCurrent({ name: name.trim() });
      if (user?.organization) {
        setUser({
          ...user,
          organization: { ...user.organization, name: org.name },
          organizations: user.organizations.map((o) => (o.id === user.organization?.id ? { ...o, name: org.name } : o)),
        });
      }
      toast.success('Business name updated');
    } catch (err) {
      setError(errorMessage(err, 'Failed to rename business'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 space-y-3">
      {error && <ErrorBanner message={error} />}
      <Field label="Business name" htmlFor="settings-org-name">
        <div className="flex gap-2">
          <Input id="settings-org-name" value={name} onChange={(e) => setName(e.target.value)} minLength={2} required />
          <Button type="submit" variant="secondary" loading={saving} disabled={name.trim() === current}>
            Rename
          </Button>
        </div>
      </Field>
    </form>
  );
};

const passwordChecks = (pw: string) => [
  { label: 'At least 8 characters', ok: pw.length >= 8 },
  { label: 'An uppercase letter', ok: /[A-Z]/.test(pw) },
  { label: 'A number', ok: /[0-9]/.test(pw) },
  { label: 'A special character', ok: /[^A-Za-z0-9]/.test(pw) },
];

const Settings: FC = () => {
  const { user, setUser, logout } = useAuth();
  const toast = useToast();
  const perms = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('section') as SectionId | null;
  const section: SectionId = SECTIONS.some((s) => s.id === requested) ? (requested as SectionId) : 'profile';
  const setSection = (id: SectionId) => setSearchParams(id === 'profile' ? {} : { section: id }, { replace: true });

  const prefs: UserPreferences = { ...DEFAULT_PREFERENCES, ...user?.preferences };

  // Profile
  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  useEffect(() => {
    setProfile({ name: user?.name || '', email: user?.email || '' });
  }, [user?.name, user?.email]);
  const profileDirty = profile.name.trim() !== user?.name || profile.email.trim().toLowerCase() !== user?.email;

  // Preferences + notifications share one draft
  const [draft, setDraft] = useState<UserPreferences>(prefs);
  const [savingPrefs, setSavingPrefs] = useState(false);
  useEffect(() => {
    setDraft({ ...DEFAULT_PREFERENCES, ...user?.preferences });
  }, [user?.preferences]);
  const prefsDirty = useMemo(
    () => (Object.keys(draft) as (keyof UserPreferences)[]).some((k) => draft[k] !== prefs[k]),
    [draft, prefs],
  );

  // Password
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const checks = passwordChecks(pw.next);
  const strength = checks.filter((c) => c.ok).length;

  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError(null);
    try {
      const updated = await authService.updateProfile({ name: profile.name.trim(), email: profile.email.trim() });
      setUser(updated);
      toast.success('Profile updated');
    } catch (err) {
      setProfileError(errorMessage(err, 'Failed to update profile'));
    } finally {
      setSavingProfile(false);
    }
  };

  const savePreferences = async () => {
    setSavingPrefs(true);
    try {
      const updated = await authService.updateProfile({ preferences: draft });
      setUser(updated);
      toast.success('Preferences saved');
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to save preferences'));
    } finally {
      setSavingPrefs(false);
    }
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.next.length < 8) {
      setPwError('New password must be at least 8 characters');
      return;
    }
    if (pw.next !== pw.confirm) {
      setPwError('New passwords do not match');
      return;
    }
    setSavingPw(true);
    setPwError(null);
    try {
      await authService.changePassword(pw.current, pw.next);
      setPw({ current: '', next: '', confirm: '' });
      toast.success('Password changed');
    } catch (err) {
      setPwError(errorMessage(err, 'Failed to change password'));
    } finally {
      setSavingPw(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to sign out'));
      setLoggingOut(false);
    }
  };

  const prefsFooter = (
    <>
      <Button variant="secondary" disabled={!prefsDirty || savingPrefs} onClick={() => setDraft(prefs)}>
        Reset
      </Button>
      <Button onClick={savePreferences} loading={savingPrefs} disabled={!prefsDirty}>
        Save Changes
      </Button>
    </>
  );

  const initials = (user?.name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" />

      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-8 items-start">
        <nav className="flex lg:flex-col gap-px overflow-x-auto lg:sticky lg:top-20">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              aria-current={section === id ? 'page' : undefined}
              className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm whitespace-nowrap border transition-colors ${
                section === id
                  ? 'bg-surface border-border text-text-primary font-medium'
                  : 'border-transparent text-text-secondary hover:bg-secondary-100 hover:text-text-primary'
              }`}
            >
              <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${section === id ? 'text-accent-600' : ''}`} />
              {label}
            </button>
          ))}
        </nav>

        <div className="space-y-6 min-w-0">
          {section === 'profile' && (
            <form onSubmit={saveProfile}>
              <Card
                title="Profile"
                description="This is how you appear across ledgerHQ"
                footer={
                  <>
                    <Button
                      variant="secondary"
                      disabled={!profileDirty || savingProfile}
                      onClick={() => setProfile({ name: user?.name || '', email: user?.email || '' })}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" loading={savingProfile} disabled={!profileDirty}>
                      Save Profile
                    </Button>
                  </>
                }
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-primary-900 text-white flex items-center justify-center text-base font-medium">
                    {initials}
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary">{user?.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge tone="accent">{user?.role}</Badge>
                      <span className="text-xs text-text-secondary">{user?.organization?.name}</span>
                      {user?.createdAt && (
                        <span className="text-xs text-text-secondary">
                          Member since {formatDate(user.createdAt, prefs.dateFormat)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {profileError && (
                  <div className="mb-4">
                    <ErrorBanner message={profileError} />
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Full name" htmlFor="settings-name" required>
                    <Input
                      id="settings-name"
                      value={profile.name}
                      minLength={2}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      required
                    />
                  </Field>
                  <Field label="Email address" htmlFor="settings-email" required>
                    <Input
                      id="settings-email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      required
                    />
                  </Field>
                </div>
              </Card>
            </form>
          )}

          {section === 'security' && (
            <>
              <form onSubmit={changePassword}>
                <Card
                  title="Change password"
                  description="Use a strong password you don't use anywhere else"
                  footer={
                    <Button
                      type="submit"
                      icon={<MdLock className="w-4 h-4" />}
                      loading={savingPw}
                      disabled={!pw.current || !pw.next || !pw.confirm}
                    >
                      Update Password
                    </Button>
                  }
                >
                  <div className="space-y-4 max-w-lg">
                    {pwError && <ErrorBanner message={pwError} />}
                    <Field label="Current password" htmlFor="pw-current" required>
                      <Input
                        id="pw-current"
                        type="password"
                        autoComplete="current-password"
                        value={pw.current}
                        onChange={(e) => setPw({ ...pw, current: e.target.value })}
                        required
                      />
                    </Field>
                    <Field label="New password" htmlFor="pw-new" required>
                      <Input
                        id="pw-new"
                        type="password"
                        autoComplete="new-password"
                        value={pw.next}
                        onChange={(e) => setPw({ ...pw, next: e.target.value })}
                        required
                      />
                    </Field>
                    {pw.next && (
                      <div>
                        <div className="flex gap-1 mb-2">
                          {[0, 1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className={`h-1.5 flex-1 rounded-full ${
                                i < strength
                                  ? strength <= 1
                                    ? 'bg-danger-500'
                                    : strength <= 3
                                      ? 'bg-warning-500'
                                      : 'bg-success-500'
                                  : 'bg-secondary-200'
                              }`}
                            />
                          ))}
                        </div>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {checks.map((c) => (
                            <li
                              key={c.label}
                              className={`flex items-center gap-1.5 text-xs ${c.ok ? 'text-success-700' : 'text-text-secondary'}`}
                            >
                              {c.ok ? <MdCheck className="w-3.5 h-3.5" /> : <MdClose className="w-3.5 h-3.5" />}
                              {c.label}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <Field
                      label="Confirm new password"
                      htmlFor="pw-confirm"
                      required
                      error={pw.confirm && pw.confirm !== pw.next ? 'Passwords do not match' : undefined}
                    >
                      <Input
                        id="pw-confirm"
                        type="password"
                        autoComplete="new-password"
                        value={pw.confirm}
                        onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                        required
                      />
                    </Field>
                  </div>
                </Card>
              </form>

              <Card title="Session" description="Sign out of ledgerHQ on this device">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="text-sm">
                    <p className="font-medium text-text-primary">Signed in as {user?.email}</p>
                    <p className="text-text-secondary mt-0.5">
                      Your session ends when you sign out or the token expires.
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    icon={<MdLogout className="w-4 h-4" />}
                    onClick={() => setConfirmLogout(true)}
                  >
                    Sign Out
                  </Button>
                </div>
              </Card>
            </>
          )}

          {section === 'preferences' && (
            <Card
              title="Display preferences"
              description="Applied to amounts and dates throughout the app"
              footer={prefsFooter}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Currency" htmlFor="pref-currency">
                  <Select
                    id="pref-currency"
                    value={draft.currency}
                    onChange={(e) => setDraft({ ...draft, currency: e.target.value })}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.name})
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Date format" htmlFor="pref-date">
                  <Select
                    id="pref-date"
                    value={draft.dateFormat}
                    onChange={(e) =>
                      setDraft({ ...draft, dateFormat: e.target.value as UserPreferences['dateFormat'] })
                    }
                  >
                    {DATE_FORMATS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="mt-6 px-4 py-3 border border-dashed border-border rounded-md">
                <p className="eyebrow mb-2">Preview</p>
                <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
                  <span>
                    <span className="text-text-secondary">Amount: </span>
                    <span className="font-mono text-text-primary">{formatCurrency(1245050, draft.currency)}</span>
                  </span>
                  <span>
                    <span className="text-text-secondary">Date: </span>
                    <span className="font-mono text-text-primary">{formatDate(new Date(), draft.dateFormat)}</span>
                  </span>
                </div>
              </div>
            </Card>
          )}

          {section === 'notifications' && (
            <Card
              title="Email notifications"
              description={`Every notification appears under the bell at the top of the app. These switches choose which ones are also emailed to ${user?.email} from info@methynix.com.`}
              footer={prefsFooter}
            >
              <div className="divide-y divide-border">
                <Toggle
                  id="notif-email"
                  label="Account activity"
                  description="Role changes, account reactivation and, for admins, new sign-ups"
                  checked={draft.emailNotifications}
                  onChange={(v) => setDraft({ ...draft, emailNotifications: v })}
                />
                <Toggle
                  id="notif-budget"
                  label="Budget alerts"
                  description="Once when spending crosses a budget's alert threshold"
                  checked={draft.budgetAlerts}
                  onChange={(v) => setDraft({ ...draft, budgetAlerts: v })}
                />
                <Toggle
                  id="notif-weekly"
                  label="Weekly summary"
                  description="Money in, money out and pending items, every Monday at 08:00 EAT"
                  checked={draft.weeklySummary}
                  onChange={(v) => setDraft({ ...draft, weeklySummary: v })}
                />
              </div>
              <p className="mt-4 text-xs text-text-secondary">
                Security emails (password changes, email address changes and account deactivation) are always sent.
              </p>
            </Card>
          )}

          {section === 'access' && user?.role && (
            <Card
              title="Business & role"
              description={`What you can do in ${user.organization?.name ?? 'this business'}. Your role can differ in each business you belong to.`}
            >
              {perms.isAdmin ? (
                <BusinessName />
              ) : (
                <p className="mb-6 text-sm">
                  <span className="text-text-secondary">Business: </span>
                  <span className="text-text-primary font-medium">{user.organization?.name}</span>
                </p>
              )}
              <div className="flex items-center gap-3 mb-6">
                <Badge tone="accent">{user.role}</Badge>
                <span className="text-sm text-text-secondary">{ROLE_DESCRIPTIONS[user.role]}</span>
              </div>
              <ul className="divide-y divide-border border-y border-border">
                {[
                  { label: 'View financial data', ok: true },
                  { label: 'Create records', ok: perms.canCreate },
                  { label: 'Edit records', ok: perms.canUpdate },
                  { label: 'Delete records', ok: perms.canDelete },
                  { label: 'Approve expenses', ok: perms.canApprove },
                  { label: 'Manage the team and invitations', ok: perms.isAdmin },
                ].map((item) => (
                  <li
                    key={item.label}
                    className={`flex items-center justify-between py-2.5 text-sm ${
                      item.ok ? 'text-text-primary' : 'text-text-secondary'
                    }`}
                  >
                    {item.label}
                    {item.ok ? (
                      <MdCheck className="w-4 h-4 text-accent-600" aria-label="Allowed" />
                    ) : (
                      <MdClose className="w-4 h-4 text-secondary-400" aria-label="Not allowed" />
                    )}
                  </li>
                ))}
              </ul>
              {!perms.isAdmin && (
                <p className="mt-6 text-xs text-text-secondary">
                  Need more access? Ask an administrator to change your role.
                </p>
              )}
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmLogout}
        title="Sign out"
        message="You will need to sign in again to access ledgerHQ."
        confirmLabel="Sign Out"
        loading={loggingOut}
        onConfirm={handleLogout}
        onCancel={() => setConfirmLogout(false)}
      />
    </div>
  );
};

export default Settings;
