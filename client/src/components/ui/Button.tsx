import { ButtonHTMLAttributes, FC, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  icon?: ReactNode;
  size?: 'sm' | 'md';
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary-900 text-white hover:bg-primary-700 border border-primary-900',
  secondary: 'bg-surface text-text-primary border border-border hover:border-secondary-400',
  danger: 'bg-danger-600 text-white hover:bg-danger-700 border border-danger-600',
  success: 'bg-accent-600 text-white hover:bg-accent-700 border border-accent-600',
  ghost: 'text-text-secondary hover:text-text-primary hover:bg-secondary-100 border border-transparent',
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
    className={`inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
      size === 'sm' ? 'h-8 px-3 text-sm' : 'h-9 px-3.5 text-sm'
    } ${VARIANTS[variant]} ${className}`}
    {...rest}
  >
    {loading ? (
      <span className="w-3.5 h-3.5 border-[1.5px] border-current border-t-transparent rounded-full animate-spin" />
    ) : (
      icon
    )}
    {children}
  </button>
);

export default Button;
