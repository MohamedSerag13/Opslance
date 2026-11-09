/** Shared types for the Courses feature — mirrors backend/routers/courses.py. */

export interface CourseSummary {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  author: string | null;
  difficulty: string;
  exam_domain: string | null;
  duration_weeks: number | null;
  hours_per_week: number | null;
  pass_mark: number | null;
  cover_color: string | null;
  tags: string[];
  weeks_count: number;
  enrollment_pct: number;
}

export interface CourseTickItem {
  tick: 'read' | 'course' | 'lab';
  text: string;
}

export interface CourseDay {
  day_index: number;
  label: string;
  type?: 'study' | 'lab_day' | 'review';
  items: CourseTickItem[];
}

export interface CourseWeek {
  week_number: number;
  title: string;
  dates: string | null;
  focus: string | null;
  exam_domain: string | null;
  gate: string | null;
  days: CourseDay[];
  items_total: number;
  items_done: number;
  /** Hands-on labs belonging to this week (matched server-side by lab id). */
  labs: WeekLab[];
}

export interface WeekLab {
  id: string;
  title: string;
  difficulty: string;
  estimated_minutes: number;
  points: number;
  module_title: string;
  /** Best passed score for the current student (null = not passed yet). */
  best_score: number | null;
}

export interface CourseDetail {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  author: string | null;
  published_at: string | null;
  difficulty: string;
  exam_domain: string | null;
  duration_weeks: number | null;
  hours_per_week: number | null;
  pass_mark: number | null;
  cover_color: string | null;
  tags: string[];
  weeks: CourseWeek[];
  ticks_total: number;
  ticks_done: number;
  enrollment_pct: number;
}

export interface DayTicks {
  read: boolean;
  course: boolean;
  lab: boolean;
}

/** "week:day_index" -> ticks, as returned by GET /api/courses/{slug}/progress. */
export type ProgressMap = Record<string, DayTicks>;

/** Resolve a day's ticks against the optimistic local map. */
export const ticksFor = (map: ProgressMap, week: number, dayIndex: number): DayTicks =>
  map[`${week}:${dayIndex}`] ?? { read: false, course: false, lab: false };

/** Token variable backing a cover_color name (falls back to primary). */
export const coverRgbVar = (coverColor: string | null): string => {
  switch (coverColor) {
    case 'success':
      return 'var(--c-success)';
    case 'warn':
      return 'var(--c-warn)';
    case 'accent':
      return 'var(--c-accent)';
    default:
      return 'var(--c-primary)';
  }
};
