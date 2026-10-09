import { FC, ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { MdCheckCircle, MdClose, MdErrorOutline, MdInfoOutline } from 'react-icons/md';
import { ToastContext, ToastContextType, ToastTone } from '../contexts/ToastContext';

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

const STYLES: Record<ToastTone, { icon: typeof MdCheckCircle; className: string }> = {
  success: { icon: MdCheckCircle, className: 'text-success-600' },
  error: { icon: MdErrorOutline, className: 'text-danger-600' },
  info: { icon: MdInfoOutline, className: 'text-info-600' },
};

export const ToastProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      const id = ++nextId.current;
      setToasts((current) => [...current.slice(-3), { id, message, tone }]);
      window.setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 4000);
    },
    [dismiss]
  );

  const value = useMemo<ToastContextType>(
    () => ({
      show,
      success: (message) => show(message, 'success'),
      error: (message) => show(message, 'error'),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-[60] flex flex-col gap-3 sm:w-96" aria-live="polite">
          <AnimatePresence initial={false}>
            {toasts.map((toast) => {
              const { icon: Icon, className } = STYLES[toast.tone];
              return (
                <motion.div
                  key={toast.id}
                  layout
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 40 }}
                  transition={{ duration: 0.18 }}
                  role={toast.tone === 'error' ? 'alert' : 'status'}
                  className="flex items-start gap-3 bg-surface border border-border rounded-lg shadow-lg px-4 py-3"
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${className}`} />
                  <p className="flex-1 text-sm text-text-primary">{toast.message}</p>
                  <button
                    onClick={() => dismiss(toast.id)}
                    className="p-0.5 rounded text-text-secondary hover:text-text-primary"
                    aria-label="Dismiss"
                  >
                    <MdClose className="w-4 h-4" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};
