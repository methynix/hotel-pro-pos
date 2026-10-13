import { FC } from 'react';
import Button from './Button';

const ErrorBanner: FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-3 border-l-2 border-danger-500 bg-danger-50 px-4 py-2.5">
    <p className="flex-1 text-sm text-danger-800">{message}</p>
    {onRetry && (
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Try again
      </Button>
    )}
  </div>
);

export default ErrorBanner;
