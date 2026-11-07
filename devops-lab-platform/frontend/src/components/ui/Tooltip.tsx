import React from 'react';

/** Lightweight positioned tooltip via CSS group-hover — no JS, keyboard-accessible on focus. */
export const Tooltip: React.FC<{ label: string; side?: 'top' | 'bottom'; children: React.ReactNode }> = ({
  label,
  side = 'top',
  children,
}) => (
  <span className="group/tooltip relative inline-flex">
    {children}
    <span
      role="tooltip"
      className={`pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border
        bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-content opacity-0 shadow-card transition-opacity duration-150
        group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100
        ${side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}
    >
      {label}
    </span>
  </span>
);

export default Tooltip;
