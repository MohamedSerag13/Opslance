import React from 'react';
import { Badge } from '../ui';
import { cn } from '../fx';
import TickCheckbox from './TickCheckbox';
import { ticksFor, type CourseDay, type CourseTickItem } from '../../pages/courses-types';

/** One day card. Lab days and review days get distinct tints; today glows. */
const DayRow: React.FC<{
  weekNumber: number;
  day: CourseDay;
  ticks: ReturnType<typeof ticksFor>;
  isToday: boolean;
  pending?: boolean;
  onToggle: (dayIndex: number, tick: CourseTickItem['tick'], value: boolean) => void;
}> = ({ weekNumber, day, ticks, isToday, pending, onToggle }) => {
  const kind = day.type ?? 'study';
  const label = day.label ?? `Day ${day.day_index + 1}`;
  const doneCount = day.items.filter((i) => ticks[i.tick]).length;

  return (
    <div
      className={cn(
        'relative rounded-xl border p-4 transition-colors',
        kind === 'lab_day' && 'border-warn/30 bg-warn/5',
        kind === 'review' && 'border-accent/30 bg-accent/5',
        kind === 'study' && 'border-border bg-surface',
        isToday && 'border-primary/40 bg-primary/10 shadow-glow-primary',
      )}
      aria-label={`${label}${isToday ? ' (today)' : ''}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-content">
          Day {day.day_index + 1} — {label}
          {kind === 'lab_day' && <span className="ml-2 text-xs font-black uppercase text-warn">3–4h lab</span>}
          {kind === 'review' && <span className="ml-2 text-xs font-black uppercase text-accent">1h review</span>}
        </p>
        <span className="flex items-center gap-1.5">
          {isToday && <Badge variant="primary" dot>Today</Badge>}
          <Badge variant={doneCount === day.items.length ? 'success' : 'default'}>
            {doneCount}/{day.items.length}
          </Badge>
        </span>
      </div>
      <div className={cn('space-y-1', pending && 'opacity-60')}>
        {day.items.map((item, i) => (
          <TickCheckbox
            key={`${item.tick}-${i}`}
            item={item}
            checked={ticks[item.tick]}
            disabled={pending}
            onToggle={(tick, value) => onToggle(day.day_index, tick, value)}
          />
        ))}
      </div>
      <span className="sr-only">Week {weekNumber}, day {day.day_index + 1}</span>
    </div>
  );
};

export default DayRow;
