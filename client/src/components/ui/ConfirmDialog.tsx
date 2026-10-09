import { FC, ReactNode } from 'react';
import { MdWarningAmber } from 'react-icons/md';
import Modal from './Modal';
import Button from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  tone = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) => (
  <Modal
    open={open}
    onClose={onCancel}
    title={title}
    size="sm"
    dismissible={!loading}
    icon={
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center ${
          tone === 'danger' ? 'bg-danger-100 text-danger-600' : 'bg-accent-100 text-accent-600'
        }`}
      >
        <MdWarningAmber className="w-5 h-5" />
      </div>
    }
    footer={
      <>
        <Button variant="secondary" onClick={onCancel} disabled={loading} data-autofocus>
          Cancel
        </Button>
        <Button variant={tone} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </>
    }
  >
    <div className="text-sm text-text-secondary">{message}</div>
  </Modal>
);

export default ConfirmDialog;
