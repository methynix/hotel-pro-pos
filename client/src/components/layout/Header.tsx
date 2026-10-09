import { FC, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MdMenu, MdLogout, MdPerson, MdSettings } from 'react-icons/md';
import { useAuth } from '../../hooks/useAuth';
import ConfirmDialog from '../ui/ConfirmDialog';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  return (
    <header className="bg-surface border-b border-border shadow-sm sticky top-0 z-20 print:hidden">
      <div className="px-6 py-4 flex items-center justify-between">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 hover:bg-background rounded-lg transition-colors"
          aria-label="Toggle menu"
        >
          <MdMenu className="w-6 h-6 text-primary-900" />
        </button>

        <div className="ml-auto flex items-center gap-4">
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              aria-haspopup="menu"
              aria-expanded={showDropdown}
              className="flex items-center gap-3 px-3 py-2 hover:bg-background rounded-lg transition-colors"
            >
              <div className="text-right">
                <p className="text-sm font-semibold text-text-primary">{user?.name}</p>
                <p className="text-xs text-text-secondary capitalize">{user?.role}</p>
              </div>
              <div className="w-9 h-9 bg-accent-600 rounded-full flex items-center justify-center shadow-sm">
                <MdPerson className="w-5 h-5 text-white" />
              </div>
            </button>

            {showDropdown && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-52 bg-surface border border-border rounded-lg shadow-lg overflow-hidden z-50 animate-scale-in"
              >
                <Link
                  to="/app/settings"
                  role="menuitem"
                  className="flex items-center gap-2 px-4 py-3 hover:bg-background text-text-primary transition-colors"
                  onClick={() => setShowDropdown(false)}
                >
                  <MdSettings className="w-4 h-4" />
                  <span className="text-sm">Account Settings</span>
                </Link>
                <button
                  role="menuitem"
                  onClick={() => {
                    setShowDropdown(false);
                    setConfirmLogout(true);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-3 hover:bg-danger-50 text-danger-600 transition-colors text-left border-t border-border font-medium text-sm"
                >
                  <MdLogout className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
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
    </header>
  );
};

export default Header;
