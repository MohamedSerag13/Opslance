import React from 'react';

type Variant = 'default' | 'primary' | 'success' | 'warn' | 'danger' | 'accent' | 'outline';

const variants: Record<Variant, string> = {
  default: 'bg-surface-2 text-muted border-border',
  primary: 'bg-primary/15 text-primary border-primary/30',
  success: 'bg-success/15 text-success border-success/30',
  warn: 'bg-warn/15 text-warn border-warn/30',
  danger: 'bg-danger/15 text-danger border-danger/30',
  accent: 'bg-accent/15 text-accent-soft border-accent/30',
  outline: 'bg-transparent text-muted border-border hover:text-content',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', dot, className = '', children, ...props }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${variants[variant]} ${className}`}
    {...props}
  >
    {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}
    {children}
  </span>
);

export default Badge;
