import { ButtonHTMLAttributes, FC, ReactNode } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  tone?: 'accent' | 'danger' | 'neutral' | 'success';
  children: ReactNode;
}

const TONES = {
  accent: 'text-accent-600 hover:bg-accent-50',
  danger: 'text-danger-600 hover:bg-danger-50',
  success: 'text-success-600 hover:bg-success-50',
  neutral: 'text-text-secondary hover:bg-background hover:text-text-primary',
};

const IconButton: FC<IconButtonProps> = ({ label, tone = 'neutral', children, className = '', ...rest }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    className={`p-2 rounded-lg transition-colors disabled:opacity-40 ${TONES[tone]} ${className}`}
    {...rest}
  >
    {children}
  </button>
);

export default IconButton;
