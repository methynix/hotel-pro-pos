import { FC } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  MdDashboard,
  MdTrendingUp,
  MdReceipt,
  MdAccountBalance,
  MdBarChart,
  MdCategory,
  MdPeople,
  MdSettings,
  MdChevronLeft,
} from 'react-icons/md';
import { useAuth } from '../../hooks/useAuth';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: FC<{ className?: string }>;
  roles: string[];
}

const navigationItems: NavItem[] = [
  { label: 'Dashboard', path: '/app', icon: MdDashboard, roles: ['admin', 'manager', 'viewer'] },
  { label: 'Transactions', path: '/app/transactions', icon: MdTrendingUp, roles: ['admin', 'manager', 'viewer'] },
  { label: 'Expenses', path: '/app/expenses', icon: MdReceipt, roles: ['admin', 'manager', 'viewer'] },
  { label: 'Accounts', path: '/app/accounts', icon: MdAccountBalance, roles: ['admin', 'manager', 'viewer'] },
  { label: 'Reports', path: '/app/reports', icon: MdBarChart, roles: ['admin', 'manager', 'viewer'] },
  { label: 'Categories', path: '/app/categories', icon: MdCategory, roles: ['admin', 'manager'] },
  { label: 'Users', path: '/app/users', icon: MdPeople, roles: ['admin'] },
  { label: 'Settings', path: '/app/settings', icon: MdSettings, roles: ['admin', 'manager', 'viewer'] },
];

const Sidebar: FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const { user } = useAuth();
  const location = useLocation();

  const filteredItems = navigationItems.filter((item) =>
    user && item.roles.includes(user.role)
  );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={`${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed md:relative md:translate-x-0 left-0 top-0 z-40 w-64 h-full bg-primary text-white transition-transform duration-300 ease-in-out shadow-xl overflow-y-auto`}
      >
        <div className="p-6 border-b border-secondary">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/logoHQ.jpg"
                alt="ledgerHQ"
                className="w-10 h-10 rounded-lg object-cover"
              />
              <div>
                <h1 className="text-xl font-bold text-white">ledgerHQ</h1>
                <p className="text-xs text-gray-400">Financial Dashboard</p>
              </div>
            </div>
            <button
              onClick={onToggle}
              className="md:hidden p-1 hover:bg-secondary rounded-lg transition-colors"
            >
              <MdChevronLeft className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className="p-4 space-y-2">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-accent text-white shadow-lg'
                    : 'text-gray-300 hover:bg-secondary hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-secondary">
          <div className="text-xs text-gray-400">
            <p className="mb-1">User</p>
            <p className="font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs capitalize">{user?.role}</p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
