import { FC, ReactNode } from 'react';
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
