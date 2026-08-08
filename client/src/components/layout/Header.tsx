import { FC, useState } from 'react';
import { MdMenu, MdLogout, MdPerson } from 'react-icons/md';
import { useAuth } from '../../hooks/useAuth';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className="bg-surface border-b border-border shadow-sm sticky top-0 z-20">
      <div className="px-6 py-4 flex items-center justify-between">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 hover:bg-background rounded-lg transition-colors"
          aria-label="Toggle menu"
        >
          <MdMenu className="w-6 h-6 text-primary" />
        </button>

        <div className="ml-auto flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 px-3 py-2 hover:bg-background rounded-lg transition-colors"
            >
              <div className="text-right">
                <p className="text-sm font-medium text-text-primary">{user?.name}</p>
                <p className="text-xs text-text-secondary capitalize">{user?.role}</p>
              </div>
              <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                <MdPerson className="w-4 h-4 text-white" />
              </div>
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-lg shadow-xl overflow-hidden z-50">
                <a
                  href="/app/settings"
                  className="flex items-center gap-2 px-4 py-3 hover:bg-background text-text-primary transition-colors"
                  onClick={() => setShowDropdown(false)}
                >
                  <MdPerson className="w-4 h-4" />
                  <span>Account Settings</span>
                </a>
                <button
                  onClick={async () => {
                    await logout();
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-3 hover:bg-background text-danger transition-colors text-left border-t border-border"
                >
                  <MdLogout className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
