import React from 'react';

export interface TabItem {
  id: string;
  label: React.ReactNode;
}

export const Tabs: React.FC<{
  items: TabItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
  ariaLabel?: string;
}> = ({ items, active, onChange, className = '', ariaLabel }) => (
  <div
    role="tablist"
    aria-label={ariaLabel}
    className={`inline-flex items-center gap-1 rounded-xl border border-border bg-surface p-1 ${className}`}
  >
    {items.map((t) => {
      const selected = t.id === active;
      return (
        <button
          key={t.id}
          role="tab"
          aria-selected={selected}
          onClick={() => onChange(t.id)}
          className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors
            ${selected ? 'bg-primary text-white shadow-[0_4px_16px_-6px_rgb(var(--c-primary)/0.7)]' : 'text-muted hover:text-content'}`}
        >
          {t.label}
        </button>
      );
    })}
  </div>
);

export default Tabs;
