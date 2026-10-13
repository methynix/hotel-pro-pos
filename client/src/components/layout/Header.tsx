import { FC, FormEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MdMenu, MdLogout, MdSettings, MdCheck, MdAdd } from 'react-icons/md';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { organizationService } from '../../services/organizationService';
import { errorMessage } from '../../utils/format';
import ConfirmDialog from '../ui/ConfirmDialog';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import ErrorBanner from '../ui/ErrorBanner';
import { Field, Input } from '../ui/FormField';
import NotificationBell from './NotificationBell';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout, switchOrganization } = useAuth();
  const toast = useToast();
  const [showDropdown, setShowDropdown] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgSaving, setOrgSaving] = useState(false);
  const [orgError, setOrgError] = useState<string | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const initials = (user?.name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  useEffect(() => {
    if (!showDropdown) return;
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setShowDropdown(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setShowDropdown(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [showDropdown]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  const handleSwitch = async (organizationId: string) => {
    if (organizationId === user?.organization?.id) return setShowDropdown(false);
    setSwitching(organizationId);
    try {
      await switchOrganization(organizationId);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not switch business'));
      setSwitching(null);
    }
  };

  const handleCreateOrg = async (e: FormEvent) => {
    e.preventDefault();
    setOrgSaving(true);
    setOrgError(null);
    try {
      await organizationService.create(orgName.trim());
      // The new business is now active; reload into it.
      window.location.assign('/app');
    } catch (err) {
      setOrgError(errorMessage(err, 'Could not create the business'));
      setOrgSaving(false);
    }
  };

  return (
    <header className="bg-background/90 backdrop-blur border-b border-border sticky top-0 z-20 print:hidden">
      <div className="h-14 px-6 md:px-10 flex items-center justify-between">
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 -ml-1.5 hover:bg-secondary-100 rounded-md transition-colors"
          aria-label="Toggle menu"
        >
          <MdMenu className="w-5 h-5 text-text-primary" />
        </button>
        <p className="hidden md:block text-sm text-text-secondary tabular truncate">
          <span className="text-text-primary font-medium">{user?.organization?.name}</span>
          <span className="mx-2 text-secondary-300">/</span>
          {today}
        </p>

        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              aria-haspopup="menu"
              aria-expanded={showDropdown}
              className="flex items-center gap-2.5 pl-3 pr-1 py-1 hover:bg-secondary-100 rounded-md transition-colors"
            >
              <span className="text-sm text-text-secondary capitalize hidden sm:inline">{user?.role}</span>
              <span className="w-7 h-7 bg-primary-900 text-white rounded-full flex items-center justify-center text-xs font-medium">
                {initials}
              </span>
            </button>

            {showDropdown && (
              <div
                role="menu"
                className="absolute right-0 mt-1.5 w-64 bg-surface border border-border rounded-xl shadow-lg overflow-hidden z-50 animate-scale-in"
              >
                <div className="px-3 py-2.5 border-b border-border">
                  <p className="text-sm font-medium text-text-primary truncate">{user?.name}</p>
                  <p className="text-xs text-text-secondary truncate">{user?.email}</p>
                </div>
                <div className="py-1 border-b border-border">
                  <p className="px-3 pt-1.5 pb-1 text-[11px] font-medium uppercase tracking-wide text-text-secondary">
                    Business
                  </p>
                  {user?.organizations.map((org) => (
                    <button
                      key={org.id}
                      role="menuitemradio"
                      aria-checked={org.id === user.organization?.id}
                      disabled={!!switching}
                      onClick={() => handleSwitch(org.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-secondary-50 text-sm text-left transition-colors disabled:opacity-60"
                    >
                      <span className="w-4 shrink-0">
                        {org.id === user.organization?.id && <MdCheck className="w-4 h-4 text-accent-600" />}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block truncate text-text-primary">{org.name}</span>
                        <span className="block text-xs text-text-secondary capitalize">
                          {switching === org.id ? 'Switching' : org.role}
                        </span>
                      </span>
                    </button>
                  ))}
                  <button
                    role="menuitem"
                    onClick={() => {
                      setShowDropdown(false);
                      setOrgName('');
                      setOrgError(null);
                      setCreatingOrg(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-secondary-50 text-sm text-text-secondary transition-colors text-left"
                  >
                    <MdAdd className="w-4 h-4" />
                    New business
                  </button>
                </div>
                <Link
                  to="/app/settings"
                  role="menuitem"
                  className="flex items-center gap-2 px-3 py-2 hover:bg-secondary-50 text-sm text-text-primary transition-colors"
                  onClick={() => setShowDropdown(false)}
                >
                  <MdSettings className="w-4 h-4 text-text-secondary" />
                  Settings
                </Link>
                <button
                  role="menuitem"
                  onClick={() => {
                    setShowDropdown(false);
                    setConfirmLogout(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-secondary-50 text-sm text-text-primary transition-colors text-left border-t border-border"
                >
                  <MdLogout className="w-4 h-4 text-text-secondary" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={creatingOrg}
        onClose={() => setCreatingOrg(false)}
        dismissible={!orgSaving}
        title="New business"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreatingOrg(false)} disabled={orgSaving}>
              Cancel
            </Button>
            <Button type="submit" form="org-form" loading={orgSaving}>
              Create Business
            </Button>
          </>
        }
      >
        <form id="org-form" onSubmit={handleCreateOrg} className="space-y-4">
          {orgError && <ErrorBanner message={orgError} />}
          <p className="text-sm text-text-secondary">
            Each business keeps its own accounts, transactions and team. You'll be its administrator.
          </p>
          <Field label="Business name" htmlFor="new-org-name" required>
            <Input id="new-org-name" value={orgName} onChange={(e) => setOrgName(e.target.value)} minLength={2} required />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmLogout}
        title="Sign out"
        message="You will need to sign in again to access ledgerHQ."
        confirmLabel="Sign Out"
        loading={loggingOut}
        onConfirm={handleLogout}
        onCancel={() => setConfirmLogout(false)}
      />
    </header>
  );
};

export default Header;
