import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Badge, Button, ProgressBar } from '../ui';
import { ShineBorder, cn } from '../fx';
import { coverRgbVar, type CourseSummary } from '../../pages/courses-types';

const DIFFICULTY_VARIANT: Record<string, 'success' | 'warn' | 'accent'> = {
  beginner: 'success',
  intermediate: 'warn',
  advanced: 'accent',
};

/** Catalog card: animated cover band, badge row, stats strip, progress, CTA. */
const CourseCard: React.FC<{ course: CourseSummary; index?: number }> = ({ course, index = 0 }) => {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const cover = coverRgbVar(course.cover_color);

  return (
    <motion.article
      whileHover={reduce ? undefined : { y: -6, rotateX: 2, rotateY: -2 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      style={{ perspective: 900, ['--c-cover' as string]: cover }}
      className="glow-on-hover relative h-full rounded-2xl border border-border bg-surface shadow-card"
    >
      <ShineBorder className="rounded-2xl" />
      {/* cover band */}
      <div className="cover-band h-[120px] w-full rounded-t-2xl" aria-hidden="true">
        <div className="absolute bottom-3 left-5 z-10 flex gap-1.5">
          {course.tags.slice(0, 3).map((t) => (
            <span key={t} className="rounded-full bg-bg/60 px-2 py-0.5 text-[11px] font-bold text-content backdrop-blur">
              #{t}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={DIFFICULTY_VARIANT[course.difficulty] ?? 'default'} dot>
            {course.difficulty}
          </Badge>
          {course.exam_domain && <Badge variant="primary">{course.exam_domain}</Badge>}
          <Badge>{course.weeks_count} weeks</Badge>
        </div>

        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-content">{course.title}</h2>
          {course.subtitle && <p className="mt-1 text-sm font-medium text-muted">{course.subtitle}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold text-muted" aria-label={`${course.title} stats`}>
          <span>📅 {course.duration_weeks ?? '—'} weeks</span>
          <span>⏱ {course.hours_per_week ?? '—'} h/week</span>
          {course.pass_mark != null && <span>🎯 Pass mark {course.pass_mark}%</span>}
        </div>

        <div className="mt-auto">
          <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
            <span className="uppercase tracking-wider text-muted">Your progress</span>
            <span className="tabular-nums text-content">{course.enrollment_pct}%</span>
          </div>
          <ProgressBar value={course.enrollment_pct} label={`${course.title} progress`} />
        </div>

        <Button variant="accent" className="w-full" onClick={() => navigate(`/courses/${course.slug}`)}>
          Open course plan →
        </Button>
      </div>
    </motion.article>
  );
};

export default CourseCard;
