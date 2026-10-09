import { FC, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

const CONTROL =
  'w-full px-3.5 py-2.5 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-secondary/70 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent disabled:bg-background disabled:text-text-secondary';

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export const Field: FC<FieldProps> = ({ label, htmlFor, hint, error, required, children, className = '' }) => (
  <div className={className}>
    <label htmlFor={htmlFor} className="block text-sm font-medium text-text-primary mb-1.5">
      {label}
      {required && <span className="text-danger-600 ml-0.5">*</span>}
    </label>
    {children}
    {error ? (
      <p className="mt-1.5 text-xs text-danger-600">{error}</p>
    ) : hint ? (
      <p className="mt-1.5 text-xs text-text-secondary">{hint}</p>
    ) : null}
  </div>
);

export const Input: FC<InputHTMLAttributes<HTMLInputElement>> = ({ className = '', ...props }) => (
  <input className={`${CONTROL} ${className}`} {...props} />
);

export const Select: FC<SelectHTMLAttributes<HTMLSelectElement>> = ({ className = '', children, ...props }) => (
  <select className={`${CONTROL} ${className}`} {...props}>
    {children}
  </select>
);

export const Textarea: FC<TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ className = '', ...props }) => (
  <textarea className={`${CONTROL} resize-none ${className}`} {...props} />
);

interface ToggleProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export const Toggle: FC<ToggleProps> = ({ id, checked, onChange, label, description, disabled }) => (
  <div className="flex items-start justify-between gap-4 py-3">
    <div>
      <label htmlFor={id} className="text-sm font-medium text-text-primary cursor-pointer">
        {label}
      </label>
      {description && <p className="text-xs text-text-secondary mt-0.5">{description}</p>}
    </div>
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-50 ${
        checked ? 'bg-accent-600' : 'bg-secondary-300'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);
