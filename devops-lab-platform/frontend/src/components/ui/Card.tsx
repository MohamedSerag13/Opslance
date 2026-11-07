import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** adds hover lift + border highlight (for clickable cards) */
  interactive?: boolean;
  /** subtle inner top-edge gradient highlight */
  glow?: boolean;
}

export const Card: React.FC<CardProps> = ({ interactive, glow, className = '', children, ...props }) => (
  <div
    className={`relative rounded-2xl border border-border bg-surface shadow-card
      ${interactive ? 'cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-glow-primary' : ''}
      ${className}`}
    {...props}
  >
    {glow && (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 -top-px h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent"
      />
    )}
    {children}
  </div>
);

export const CardHeader: React.FC<{ title: React.ReactNode; sub?: React.ReactNode; action?: React.ReactNode }> = ({ title, sub, action }) => (
  <div className="flex items-start justify-between gap-4 p-6 pb-0">
    <div>
      <h3 className="font-display text-lg font-semibold text-content">{title}</h3>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
    </div>
    {action}
  </div>
);

export default Card;
