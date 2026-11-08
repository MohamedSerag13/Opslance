import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Badge, ProgressBar } from '../ui';
import { cn } from '../fx';
import DayRow from './DayRow';
import { ticksFor, type CourseTickItem, type CourseWeek } from '../../pages/courses-types';

const WEEK_PCT = (w: CourseWeek) => (w.items_total ? Math.round((w.items_done / w.items_total) * 100) : 0);

/** One week: header (title/dates/progress), day rows, gate callout. */
const WeekSection: React.FC<{
  week: CourseWeek;
  progressMap: Record<string, { read: boolean; course: boolean; lab: boolean }>;
  todayKey: string | null;
  pendingDays: Set<string>;
  celebrating: boolean;
  onToggle: (weekNumber: number, dayIndex: number, tick: CourseTickItem['tick'], value: boolean) => void;
}> = ({ week, progressMap, todayKey, pendingDays, celebrating, onToggle }) => {
  const reduce = useReducedMotion();
  const pct = WEEK_PCT(week);

  return (
    <motion.section
      id={`week-${week.week_number}`}
      initial={reduce ? { opacity: 1 } : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="scroll-mt-24 rounded-2xl border border-border bg-surface p-6 shadow-card"
      aria-label={`Week ${week.week_number}: ${week.title}`}
    >
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-bold tracking-tight text-content">
            Week {week.week_number} · <span className="text-primary">{week.title}</span>
          </h2>
          {week.focus && <p className="mt-1 max-w-3xl text-sm font-medium text-muted">{week.focus}</p>}
        </div>
        <div className="flex items-center gap-2">
          {week.dates && <Badge>{week.dates}</Badge>}
          <Badge variant={pct === 100 ? 'success' : 'primary'}>{pct}%</Badge>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <ProgressBar value={week.items_done} max={week.items_total} className="flex-1"
                     label={`Week ${week.week_number} progress`} />
        <span className="text-xs font-bold tabular-nums text-muted">{week.items_done}/{week.items_total}</span>
        {week.exam_domain && <Badge variant="default">{week.exam_domain}</Badge>}
      </div>

      {/* days */}
      <div className="mt-4 space-y-3">
        {week.days.map((day) => {
          const key = `${week.week_number}:${day.day_index}`;
          return (
            <DayRow
              key={key}
              weekNumber={week.week_number}
              day={day}
              ticks={ticksFor(progressMap, week.week_number, day.day_index)}
              isToday={todayKey === key}
              pending={pendingDays.has(key)}
              onToggle={(d, tick, value) => onToggle(week.week_number, d, tick, value)}
            />
          );
        })}
      </div>

      {/* gate */}
      {week.gate && (
        <div className="mt-4 rounded-r-xl border-l-4 border-success bg-success/10 p-4">
          <p className="text-sm font-bold text-content">
            <span aria-hidden>✅</span> Gate — week {week.week_number} is done when:
          </p>
          <p className="mt-1 text-sm font-medium text-muted">{week.gate}</p>
        </div>
      )}

      {/* completion burst */}
      <AnimatePresence>
        {celebrating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className={cn('pointer-events-none absolute right-6 top-6 rounded-xl border border-success/40 bg-success/15 px-4 py-2 text-sm font-bold text-success')}
          >
            🎉 Week {week.week_number} complete!
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
};

export default WeekSection;
