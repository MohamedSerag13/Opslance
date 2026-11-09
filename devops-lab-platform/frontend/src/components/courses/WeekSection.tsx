import React from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Badge, Button, ProgressBar } from '../ui';
import { cn } from '../fx';
import DayRow from './DayRow';
import { ticksFor, type CourseTickItem, type CourseWeek, type WeekLab } from '../../pages/courses-types';

const WEEK_PCT = (w: CourseWeek) => (w.items_total ? Math.round((w.items_done / w.items_total) * 100) : 0);

/** One launchable lab of the week — links straight into the question runner. */
const WeekLabCard: React.FC<{ lab: WeekLab }> = ({ lab }) => {
  const passed = lab.best_score != null;
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-xl border p-3 transition-colors',
        passed ? 'border-success/40 bg-success/5' : 'border-border bg-surface hover:border-warn/40',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-content" title={lab.title}>{lab.title}</p>
          <p className="mt-0.5 text-xs font-semibold text-muted">
            ⏱ {lab.estimated_minutes} min · ⭐ {lab.points} pts{passed && ` · best ${lab.best_score}/${lab.points}`}
          </p>
        </div>
        <Badge variant={passed ? 'success' : 'default'}>{passed ? 'passed' : 'lab'}</Badge>
      </div>
      <Link to={`/labs/${lab.id}/run`} className="mt-auto">
        <Button variant={passed ? 'ghost' : 'accent'} size="sm" className="w-full">
          {passed ? 'Practice again →' : 'Launch lab →'}
        </Button>
      </Link>
    </div>
  );
};

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

      {/* hands-on labs of this week — launchable in place */}
      {week.labs.length > 0 && (
        <div className="mt-4 rounded-xl border border-warn/30 bg-warn/5 p-4">
          <p className="text-sm font-bold text-content">
            <span aria-hidden>🧪</span> Hands-on labs — week {week.week_number}
            <span className="ml-2 text-xs font-semibold text-muted">graded, hints available, runs in the browser terminal</span>
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {week.labs.map((lab) => <WeekLabCard key={lab.id} lab={lab} />)}
          </div>
        </div>
      )}

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
