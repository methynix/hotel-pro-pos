import { FC, FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
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
  { id: 'access', label: 'Access & Role', icon: MdVerifiedUser },
];

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'KES', name: 'Kenyan Shilling' },
  { code: 'TZS', name: 'Tanzanian Shilling' },
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
  <div className="bg-surface rounded-xl border border-border shadow-sm">
    <div className="px-6 pt-6">
      <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
      {description && <p className="text-sm text-text-secondary mt-1">{description}</p>}
    </div>
    <div className="p-6">{children}</div>
    {footer && (
      <div className="px-6 py-4 border-t border-border bg-background/60 rounded-b-xl flex justify-end gap-3">{footer}</div>
    )}
  </div>
);

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
  const [section, setSection] = useState<SectionId>('profile');

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
    [draft, prefs]
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
      <Button
        variant="secondary"
        disabled={!prefsDirty || savingPrefs}
        onClick={() => setDraft(prefs)}
      >
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
      <PageHeader title="Settings" description="Manage your profile, security and display preferences" />

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 items-start">
        <nav className="bg-surface rounded-xl border border-border shadow-sm p-2 flex lg:flex-col gap-1 overflow-x-auto">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              aria-current={section === id ? 'page' : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                section === id ? 'bg-accent-50 text-accent-700' : 'text-text-secondary hover:bg-background hover:text-text-primary'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
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
                  <div className="w-16 h-16 rounded-full bg-accent-600 text-white flex items-center justify-center text-xl font-semibold">
                    {initials}
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary">{user?.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge tone="accent">{user?.role}</Badge>
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
                    <p className="text-text-secondary mt-0.5">Your session ends when you sign out or the token expires.</p>
                  </div>
                  <Button variant="danger" icon={<MdLogout className="w-4 h-4" />} onClick={() => setConfirmLogout(true)}>
                    Sign Out
                  </Button>
                </div>
              </Card>
            </>
          )}

          {section === 'preferences' && (
            <Card title="Display preferences" description="Applied to amounts and dates throughout the app" footer={prefsFooter}>
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
                    onChange={(e) => setDraft({ ...draft, dateFormat: e.target.value as UserPreferences['dateFormat'] })}
                  >
                    {DATE_FORMATS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="mt-6 p-4 bg-background rounded-lg">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-3">Preview</p>
                <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
                  <span>
                    <span className="text-text-secondary">Amount: </span>
                    <span className="font-semibold text-text-primary">{formatCurrency(12450.5, draft.currency)}</span>
                  </span>
                  <span>
                    <span className="text-text-secondary">Date: </span>
                    <span className="font-semibold text-text-primary">{formatDate(new Date(), draft.dateFormat)}</span>
                  </span>
                </div>
              </div>
            </Card>
          )}

          {section === 'notifications' && (
            <Card title="Notifications" description="Choose what ledgerHQ should keep you informed about" footer={prefsFooter}>
              <div className="divide-y divide-border">
                <Toggle
                  id="notif-email"
                  label="Email notifications"
                  description="Account activity such as approvals and new users"
                  checked={draft.emailNotifications}
                  onChange={(v) => setDraft({ ...draft, emailNotifications: v })}
                />
                <Toggle
                  id="notif-budget"
                  label="Budget alerts"
                  description="When spending crosses a budget's alert threshold"
                  checked={draft.budgetAlerts}
                  onChange={(v) => setDraft({ ...draft, budgetAlerts: v })}
                />
                <Toggle
                  id="notif-weekly"
                  label="Weekly summary"
                  description="A digest of inflows, outflows and pending items every Monday"
                  checked={draft.weeklySummary}
                  onChange={(v) => setDraft({ ...draft, weeklySummary: v })}
                />
              </div>
            </Card>
          )}

          {section === 'access' && user && (
            <Card title="Access & role" description="What your account is allowed to do">
              <div className="flex items-center gap-3 mb-6">
                <Badge tone="accent">{user.role}</Badge>
                <span className="text-sm text-text-secondary">{ROLE_DESCRIPTIONS[user.role]}</span>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: 'View financial data', ok: true },
                  { label: 'Create records', ok: perms.canCreate },
                  { label: 'Edit records', ok: perms.canUpdate },
                  { label: 'Delete records', ok: perms.canDelete },
                  { label: 'Approve expenses', ok: perms.canApprove },
                  { label: 'Manage users', ok: perms.isAdmin },
                ].map((item) => (
                  <li
                    key={item.label}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm ${
                      item.ok ? 'border-success-200 bg-success-50 text-success-800' : 'border-border text-text-secondary'
                    }`}
                  >
                    {item.ok ? <MdCheck className="w-5 h-5" /> : <MdClose className="w-5 h-5" />}
                    {item.label}
                  </li>
                ))}
              </ul>
              {!perms.isAdmin && (
                <p className="mt-6 text-xs text-text-secondary">Need more access? Ask an administrator to change your role.</p>
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
