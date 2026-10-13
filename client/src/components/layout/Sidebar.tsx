import { FC } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { IconType } from 'react-icons';
import {
  MdOutlineDashboard,
  MdSwapHoriz,
  MdOutlineReceiptLong,
  MdOutlineAccountBalance,
  MdOutlineAssessment,
  MdOutlineCategory,
  MdOutlinePeople,
  MdOutlineSettings,
  MdClose,
  MdOutlinePieChart,
  MdRepeat,
} from 'react-icons/md';
import { useAuth } from '../../hooks/useAuth';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: IconType;
  adminOnly?: boolean;
}

// Every role can open every finance page; what they can do there is
// limited by utils/permissions. Only user management is admin-only.
const NAV_GROUPS: { title?: string; items: NavItem[] }[] = [
  { items: [{ label: 'Overview', path: '/app', icon: MdOutlineDashboard }] },
  {
    title: 'Money',
    items: [
      { label: 'Transactions', path: '/app/transactions', icon: MdSwapHoriz },
      { label: 'Expenses', path: '/app/expenses', icon: MdOutlineReceiptLong },
      { label: 'Accounts', path: '/app/accounts', icon: MdOutlineAccountBalance },
    ],
  },
  {
    title: 'Planning',
    items: [
      { label: 'Budgets', path: '/app/budgets', icon: MdOutlinePieChart },
      { label: 'Recurring', path: '/app/recurring', icon: MdRepeat },
      { label: 'Reports', path: '/app/reports', icon: MdOutlineAssessment },
    ],
  },
  {
    title: 'Setup',
    items: [
      { label: 'Categories', path: '/app/categories', icon: MdOutlineCategory },
      { label: 'Users', path: '/app/users', icon: MdOutlinePeople, adminOnly: true },
      { label: 'Settings', path: '/app/settings', icon: MdOutlineSettings },
    ],
  },
];

const Sidebar: FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const { user } = useAuth();
  const location = useLocation();

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/app' && location.pathname.startsWith(path + '/'));

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-primary-950/30 z-30 md:hidden" onClick={onToggle} />}

      <aside
        className={`${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed md:relative md:translate-x-0 print:hidden left-0 top-0 z-40 w-60 h-screen bg-secondary-50 border-r border-border transition-transform duration-200 ease-out overflow-y-auto flex flex-col`}
      >
        <div className="h-14 px-5 flex items-center justify-between border-b border-border">
          <Link to="/app" className="flex items-baseline gap-0.5 text-text-primary">
            <span className="text-lg font-semibold tracking-tight">ledger</span>
            <span className="text-lg font-semibold tracking-tight text-accent-600">HQ</span>
          </Link>
          <button
            onClick={onToggle}
            className="md:hidden p-1 rounded-md text-text-secondary hover:bg-secondary-100"
            aria-label="Close menu"
          >
            <MdClose className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-5">
          {NAV_GROUPS.map((group, gi) => {
            const items = group.items.filter((item) => !item.adminOnly || user?.role === 'admin');
            if (items.length === 0) return null;
            return (
              <div key={gi}>
                {group.title && (
                  <p className="px-2 mb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-secondary-500">
                    {group.title}
                  </p>
                )}
                <div className="space-y-px">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => window.innerWidth < 768 && onToggle()}
                        aria-current={active ? 'page' : undefined}
                        className={`relative flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors ${
                          active
                            ? 'bg-surface text-text-primary font-medium border border-border'
                            : 'text-secondary-600 hover:text-text-primary hover:bg-secondary-100 border border-transparent'
                        }`}
                      >
                        <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${active ? 'text-accent-600' : ''}`} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-border">
          <p className="text-sm font-medium text-text-primary truncate">{user?.name}</p>
          <p className="text-xs text-text-secondary truncate">{user?.email}</p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
