import React from 'react';

export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/50 px-6 py-14 text-center">
    {icon && (
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-muted" aria-hidden="true">
        {icon}
      </div>
    )}
    <h3 className="font-display text-lg font-semibold text-content">{title}</h3>
    {description && <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p>}
    {action && <div className="mt-6">{action}</div>}
  </div>
);

export default EmptyState;
