import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '../fx';
import type { CourseTickItem } from '../../pages/courses-types';

const TICK_META: Record<CourseTickItem['tick'], { icon: string; label: string; cls: string }> = {
  read: { icon: '📖', label: 'read', cls: 'text-primary' },
  course: { icon: '🎬', label: 'course', cls: 'text-accent' },
  lab: { icon: '🧪', label: 'lab', cls: 'text-warn' },
};

/** One tickable item row. Optimistic POST + spring check animation. */
const TickCheckbox: React.FC<{
  item: CourseTickItem;
  checked: boolean;
  disabled?: boolean;
  onToggle: (tick: CourseTickItem['tick'], value: boolean) => void;
}> = ({ item, checked, disabled, onToggle }) => {
  const reduce = useReducedMotion();
  const meta = TICK_META[item.tick];

  return (
    <label
      className={cn(
        'group flex cursor-pointer items-start gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-2/70',
        disabled && 'cursor-not-allowed opacity-70',
      )}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onToggle(item.tick, e.target.checked)}
        aria-label={`${meta.label}: ${item.text}`}
      />
      <motion.span
        aria-hidden="true"
        initial={false}
        animate={checked && !reduce ? { scale: [1, 1.35, 1] } : { scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
        className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[11px] font-black transition-colors',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-primary/60',
          checked ? 'border-success bg-success text-white' : 'border-border bg-surface text-transparent',
        )}
      >
        ✓
      </motion.span>
      <span className="min-w-0">
        <span className={cn('mr-1.5 text-xs font-black uppercase tracking-wider', meta.cls)}>
          {meta.icon} {meta.label}
        </span>
        <span className={cn('text-sm font-medium transition-all', checked ? 'text-muted line-through' : 'text-content')}>
          {item.text}
        </span>
      </span>
    </label>
  );
};

export default TickCheckbox;
