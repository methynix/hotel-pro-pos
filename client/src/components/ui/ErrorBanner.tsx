import { FC } from 'react';
import { MdErrorOutline, MdRefresh } from 'react-icons/md';
import Button from './Button';

const ErrorBanner: FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-danger-50 border border-danger-200 text-danger-700 rounded-lg px-4 py-3">
    <MdErrorOutline className="w-5 h-5 flex-shrink-0" />
    <p className="flex-1 text-sm">{message}</p>
    {onRetry && (
      <Button variant="secondary" size="sm" icon={<MdRefresh className="w-4 h-4" />} onClick={onRetry}>
        Retry
      </Button>
    )}
  </div>
);

export default ErrorBanner;
