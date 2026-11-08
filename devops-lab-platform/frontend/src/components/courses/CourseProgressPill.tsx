import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ProgressBar } from '../ui';
import { coverRgbVar, type CourseSummary } from '../../pages/courses-types';

const COURSE_ICON: Record<string, string> = {
  'cka-8-weeks': '🎓',
  'linux-fundamentals': '🐧',
};

/** Dashboard strip pill: one per enrolled/available course. */
const CourseProgressPill: React.FC<{ course: CourseSummary }> = ({ course }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/courses/${course.slug}`)}
      style={{ ['--c-cover' as string]: coverRgbVar(course.cover_color) }}
      className="group flex w-56 shrink-0 items-center gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-glow-primary"
      aria-label={`${course.title}: ${course.enrollment_pct}% complete`}
    >
      <span className="text-2xl" aria-hidden>{COURSE_ICON[course.slug] ?? '📚'}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-content">{course.title}</span>
        <span className="mt-1.5 flex items-center gap-2">
          <ProgressBar value={course.enrollment_pct} className="flex-1" label={`${course.title} progress`} />
          <span className="text-xs font-bold tabular-nums text-muted">{course.enrollment_pct}%</span>
        </span>
      </span>
    </button>
  );
};

export default CourseProgressPill;
