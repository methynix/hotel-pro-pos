import { ButtonHTMLAttributes, FC, ReactNode } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  tone?: 'accent' | 'danger' | 'neutral' | 'success';
  children: ReactNode;
}

// Row actions stay grey until hovered, so tables don't turn into a wall of colour.
const TONES = {
  accent: 'hover:text-text-primary',
  danger: 'hover:text-danger-600',
  success: 'hover:text-accent-700',
  neutral: 'hover:text-text-primary',
};

const IconButton: FC<IconButtonProps> = ({ label, tone = 'neutral', children, className = '', ...rest }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    className={`p-1.5 rounded-md text-secondary-500 hover:bg-secondary-100 transition-colors disabled:opacity-30 disabled:hover:bg-transparent ${TONES[tone]} ${className}`}
    {...rest}
  >
    {children}
  </button>
);

export default IconButton;
