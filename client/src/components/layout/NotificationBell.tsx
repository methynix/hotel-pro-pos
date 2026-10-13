import { FC, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { IconType } from 'react-icons';
import {
  MdNotificationsNone,
  MdOutlinePieChart,
  MdOutlineShield,
  MdOutlinePerson,
  MdOutlineInsights,
  MdOutlineMail,
} from 'react-icons/md';
import { notificationService } from '../../services/notificationService';
import { AppNotification } from '../../types';
import { Skeleton } from '../ui/Skeleton';

const ICONS: Record<AppNotification['category'], IconType> = {
  account: MdOutlinePerson,
  security: MdOutlineShield,
  budget: MdOutlinePieChart,
  summary: MdOutlineInsights,
};

const timeAgo = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const NotificationBell: FC = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.list(),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
  const items = data?.items ?? [];
  const unread = data?.unread ?? 0;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });

  const openItem = async (n: AppNotification) => {
    setOpen(false);
    if (!n.read) {
      // Optimistically mark read so the badge updates immediately.
      queryClient.setQueryData(['notifications'], {
        items: items.map((i) => (i._id === n._id ? { ...i, read: true } : i)),
        unread: Math.max(0, unread - 1),
      });
      notificationService.markRead(n._id).finally(refresh);
    }
    if (n.link) navigate(n.link);
  };

  const markAll = async () => {
    queryClient.setQueryData(['notifications'], { items: items.map((i) => ({ ...i, read: true })), unread: 0 });
    await notificationService.markAllRead().finally(refresh);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        className="relative p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-secondary-100 transition-colors"
      >
        <MdNotificationsNone className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-danger-600 text-white text-[10px] font-medium leading-4 text-center font-mono">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-[22rem] max-w-[calc(100vw-2rem)] bg-surface border border-border rounded-xl shadow-lg overflow-hidden z-50 animate-scale-in">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
            <p className="text-sm font-semibold text-text-primary">Notifications</p>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs text-text-secondary hover:text-text-primary">
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-[26rem] overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="px-4 py-10 text-sm text-text-secondary">
                Nothing yet. Budget alerts, account changes and weekly summaries will show up here.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((n) => {
                  const Icon = ICONS[n.category] ?? MdNotificationsNone;
                  return (
                    <li key={n._id}>
                      <button
                        onClick={() => openItem(n)}
                        className={`w-full text-left flex gap-3 px-4 py-3 hover:bg-secondary-50 transition-colors ${
                          n.read ? '' : 'bg-accent-50/40'
                        }`}
                      >
                        <Icon
                          className={`w-[18px] h-[18px] mt-0.5 flex-shrink-0 ${
                            n.category === 'security' ? 'text-danger-600' : n.read ? 'text-secondary-400' : 'text-accent-600'
                          }`}
                        />
                        <span className="flex-1 min-w-0">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className={`text-sm truncate ${n.read ? 'text-text-primary' : 'font-medium text-text-primary'}`}>
                              {n.title}
                            </span>
                            <span className="text-[11px] text-text-secondary whitespace-nowrap">{timeAgo(n.createdAt)}</span>
                          </span>
                          <span className="block mt-0.5 text-xs text-text-secondary line-clamp-2">{n.message}</span>
                          {n.emailed && (
                            <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-text-secondary">
                              <MdOutlineMail className="w-3 h-3" />
                              Also sent by email
                            </span>
                          )}
                        </span>
                        {!n.read && <span className="w-1.5 h-1.5 mt-2 rounded-full bg-accent-600 flex-shrink-0" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <button
            onClick={() => {
              setOpen(false);
              navigate('/app/settings?section=notifications');
            }}
            className="w-full px-4 py-2.5 border-t border-border text-xs text-text-secondary hover:text-text-primary hover:bg-secondary-50 text-left"
          >
            Email preferences
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
