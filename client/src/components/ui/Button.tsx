import { ButtonHTMLAttributes, FC, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  icon?: ReactNode;
  size?: 'sm' | 'md';
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent-600 hover:bg-accent-700 text-white shadow-sm',
  secondary: 'bg-surface border border-border text-text-primary hover:bg-background',
  danger: 'bg-danger-600 hover:bg-danger-700 text-white shadow-sm',
  success: 'bg-success-600 hover:bg-success-700 text-white shadow-sm',
  ghost: 'text-text-secondary hover:bg-background hover:text-text-primary',
};

const Button: FC<ButtonProps> = ({
  variant = 'primary',
  loading = false,
  icon,
  size = 'md',
  className = '',
  disabled,
  children,
  type = 'button',
  ...rest
}) => (
  <button
    type={type}
    disabled={disabled || loading}
    className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
      size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-sm'
    } ${VARIANTS[variant]} ${className}`}
    {...rest}
  >
    {loading ? (
      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
    ) : (
      icon
    )}
    {children}
  </button>
);

export default Button;
