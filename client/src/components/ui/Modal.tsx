import { FC, ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { MdClose } from 'react-icons/md';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Block closing via backdrop/Escape, e.g. while a request is in flight. */
  dismissible?: boolean;
}

const SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };

const Modal: FC<ModalProps> = ({
  open,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  size = 'md',
  dismissible = true,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  // Callers usually pass inline handlers; keep the latest in refs so the
  // effect below only runs when the modal opens or closes.
  const onCloseRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);
  onCloseRef.current = onClose;
  dismissibleRef.current = dismissible;

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissibleRef.current) onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus the first field so keyboard users can start typing straight away.
    const timer = window.setTimeout(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        'input:not([type=hidden]):not([disabled]), select, textarea, button[data-autofocus]'
      );
      (focusable ?? panelRef.current)?.focus();
    }, 50);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(timer);
    };
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-primary-950/50 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => dismissible && onClose()}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            tabIndex={-1}
            className={`relative w-full ${SIZES[size]} bg-surface rounded-xl shadow-2xl border border-border flex flex-col max-h-[90vh] outline-none`}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <div className="flex items-start gap-3 px-6 pt-6 pb-4">
              {icon && <div className="flex-shrink-0">{icon}</div>}
              <div className="flex-1 min-w-0">
                <h2 id="modal-title" className="text-lg font-semibold text-text-primary">
                  {title}
                </h2>
                {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={!dismissible}
                className="p-1.5 -mr-1.5 rounded-lg text-text-secondary hover:bg-background hover:text-text-primary disabled:opacity-40"
                aria-label="Close"
              >
                <MdClose className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 pb-6 overflow-y-auto">{children}</div>
            {footer && (
              <div className="px-6 py-4 border-t border-border bg-background/60 rounded-b-xl flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default Modal;
