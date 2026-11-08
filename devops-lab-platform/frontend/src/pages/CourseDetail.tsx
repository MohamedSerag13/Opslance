import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { marked } from 'marked';
import confetti from 'canvas-confetti';
import { api } from '../api/client';
import AppNav from '../components/layout/AppNav';
import { Badge, Button, Card, Modal, ProgressBar, ProgressRing, Skeleton } from '../components/ui';
import { AnimatedGradientText, PulseBadge, cn } from '../components/fx';
import WeekSection from '../components/courses/WeekSection';
import { ticksFor, type CourseDetail as CourseDetailT, type CourseTickItem, type ProgressMap } from './courses-types';

/** Exam dates per course slug (used for the countdown chip). */
const EXAM_DATES: Record<string, Date> = {
  'cka-8-weeks': new Date(2026, 11, 25),
};

/** "Fri Oct 30" → {month: 9, day: 30} (0-based month) or null. */
function parseDayLabel(label: string): { m: number; d: number } | null {
  const m = label.match(/([A-Z][a-z]{2})\s+(\d{1,2})/);
  if (!m) return null;
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const idx = months.indexOf(m[1].toLowerCase());
  if (idx < 0) return null;
  return { m: idx, d: Number(m[2]) };
}

/** The "week:day" key matching today's calendar date, if any. */
function todayKeyFor(weeks: CourseDetailT['weeks']): string | null {
  const now = new Date();
  for (const w of weeks) {
    for (const day of w.days) {
      const parsed = parseDayLabel(day.label ?? '');
      if (parsed && parsed.m === now.getMonth() && parsed.d === now.getDate()) {
        return `${w.week_number}:${day.day_index}`;
      }
    }
  }
  return null;
}

export default function CourseDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [course, setCourse] = useState<CourseDetailT | null>(null);
  const [progressMap, setProgressMap] = useState<ProgressMap>({});
  const [failed, setFailed] = useState(false);
  const [descOpen, setDescOpen] = useState(true);
  const [pendingDays, setPendingDays] = useState<Set<string>>(new Set());
  const [celebration, setCelebration] = useState<{ week: number; next: number | null } | null>(null);
  const celebratedWeeks = useRef<Set<number>>(new Set());

  useEffect(() => {
    let alive = true;
    if (!slug) return;
    Promise.all([
      api.get(`/courses/${slug}`),
      api.get(`/courses/${slug}/progress`),
    ])
      .then(([detailRes, progRes]) => {
        if (!alive) return;
        setCourse(detailRes.data);
        setProgressMap(progRes.data.days ?? {});
      })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [slug]);

  const todayKey = useMemo(() => (course ? todayKeyFor(course.weeks) : null), [course]);
  const renderedDescription = useMemo(
    () => (course?.description ? marked.parse(course.description, { async: false }) as string : ''),
    [course?.description],
  );
  const examCountdown = useMemo(() => {
    const exam = slug ? EXAM_DATES[slug] : undefined;
    if (!exam) return null;
    const days = Math.ceil((exam.getTime() - Date.now()) / 86_400_000);
    return days;
  }, [slug]);

  /** Resolve design-token colors for canvas-confetti (it needs real CSS colors). */
  const confettiColors = useMemo(() => {
    const css = getComputedStyle(document.documentElement);
    const tok = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
    return [
      `rgb(${tok('--c-primary', '99,102,241')})`,
      `rgb(${tok('--c-accent', '16,185,129')})`,
      `rgb(${tok('--c-success', '34,197,94')})`,
    ];
  }, []);

  /** Optimistic tick write, reconciled with the authoritative response. */
  const handleToggle = async (weekNumber: number, dayIndex: number, tick: CourseTickItem['tick'], value: boolean) => {
    if (!slug || !course) return;
    const key = `${weekNumber}:${dayIndex}`;
    const prevMap = progressMap;
    const day = course.weeks.find((w) => w.week_number === weekNumber)?.days.find((d) => d.day_index === dayIndex);
    const wasComplete = day ? day.items.every((i) => ticksFor(prevMap, weekNumber, dayIndex)[i.tick]) : false;

    const optimistic = { ...prevMap, [key]: { ...ticksFor(prevMap, weekNumber, dayIndex), [tick]: value } };
    setProgressMap(optimistic);
    setPendingDays((s) => new Set(s).add(key));

    try {
      const res = await api.post(`/courses/${slug}/progress`, {
        week: weekNumber, day_index: dayIndex, tick, value,
      });
      const merged: ProgressMap = { ...optimistic, [key]: res.data.ticks };
      setProgressMap(merged);

      // recompute week + overall counts from the merged map
      const weeks = course.weeks.map((w) => {
        let done = 0;
        for (const d of w.days) {
          const t = ticksFor(merged, w.week_number, d.day_index);
          done += d.items.filter((i) => t[i.tick]).length;
        }
        return { ...w, items_done: done };
      });
      const ticksDone = weeks.reduce((s, w) => s + w.items_done, 0);
      const nowComplete = day ? day.items.every((i) => res.data.ticks[i.tick]) : false;

      if (!wasComplete && nowComplete && !celebratedWeeks.current.has(weekNumber)) {
        celebratedWeeks.current.add(weekNumber);
        setCelebration({ week: weekNumber, next: weekNumber < course.weeks.length ? weekNumber + 1 : null });
        confetti({ particleCount: 160, spread: 100, origin: { y: 0.7 }, colors: confettiColors });
      }
      setCourse({
        ...course,
        weeks,
        ticks_done: ticksDone,
        enrollment_pct: course.ticks_total ? Math.round((ticksDone / course.ticks_total) * 100) : 0,
      });
    } catch {
      setProgressMap(prevMap); // roll back the optimistic write
    } finally {
      setPendingDays((s) => {
        const n = new Set(s);
        n.delete(key);
        return n;
      });
    }
  };

  if (failed || !slug) {
    return (
      <div className="min-h-screen bg-bg">
        <AppNav />
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <Card className="p-6">
            <p className="font-display text-xl font-bold text-content">Course not found</p>
            <p className="mt-1 text-sm text-muted">This course may have been unpublished.</p>
            <Link to="/courses" className="mt-4 inline-block"><Button variant="primary">← All courses</Button></Link>
          </Card>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-bg">
        <AppNav />
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
            <Skeleton className="h-96 w-full rounded-2xl" />
            <Skeleton className="h-96 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  const overallPct = course.ticks_total ? Math.round((course.ticks_done / course.ticks_total) * 100) : 0;

  return (
    <div className="min-h-screen bg-bg" id="main">
      <AppNav />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link to="/courses" className="text-sm font-bold text-primary hover:underline">← All courses</Link>

        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          {/* ------------------------------ sidebar ------------------------------ */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Card className="space-y-5 p-5">
              <div>
                <h2 className="font-display text-lg font-bold leading-tight text-content">{course.title}</h2>
                {course.author && (
                  <span className="mt-2 inline-block rounded-full border border-border bg-surface-2 px-2.5 py-0.5 text-xs font-bold text-muted">
                    by {course.author}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4">
                <ProgressRing value={overallPct} size={84} label={`${course.title} completion`}>
                  <span className="text-sm font-black text-content">{overallPct}%</span>
                </ProgressRing>
                <div className="text-xs font-semibold text-muted">
                  <p className="tabular-nums text-content">{course.ticks_done} / {course.ticks_total}</p>
                  <p>ticks checked</p>
                </div>
              </div>

              {examCountdown !== null && examCountdown >= 0 && (
                <PulseBadge tone={examCountdown < 7 ? 'warn' : 'primary'}>
                  ⏳ Exam in {examCountdown} day{examCountdown === 1 ? '' : 's'}
                </PulseBadge>
              )}

              <nav aria-label="Week navigator" className="space-y-1.5">
                {course.weeks.map((w) => {
                  const pct = w.items_total ? Math.round((w.items_done / w.items_total) * 100) : 0;
                  return (
                    <a
                      key={w.week_number}
                      href={`#week-${w.week_number}`}
                      className="block rounded-lg px-3 py-2 transition-colors hover:bg-surface-2"
                    >
                      <span className="flex items-center justify-between text-xs font-bold">
                        <span className="truncate text-content">W{w.week_number} · {w.title}</span>
                        <span className="tabular-nums text-muted">{pct}%</span>
                      </span>
                      <ProgressBar value={pct} className="mt-1" label={`Week ${w.week_number} progress`} />
                    </a>
                  );
                })}
              </nav>

              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => {
                  const el = todayKey ? document.getElementById(`week-${todayKey.split(':')[0]}`) : null;
                  (el ?? document.getElementById('week-1'))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                {todayKey ? 'Jump to today ↓' : 'Jump to Week 1 ↓'}
              </Button>
            </Card>
          </aside>

          {/* --------------------------- main content --------------------------- */}
          <div className="space-y-6">
            {/* hero band */}
            <div className="mesh-bg relative overflow-hidden rounded-2xl border border-border p-8">
              <span className="glow-orb right-[-80px] top-[-120px] h-72 w-96 bg-accent/20" aria-hidden="true" />
              <div className="relative">
                <AnimatedGradientText duration={7}>{course.exam_domain ?? course.difficulty} path</AnimatedGradientText>
                <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-content sm:text-4xl">
                  {course.title}
                </h1>
                {course.subtitle && <p className="mt-2 max-w-2xl font-medium text-muted">{course.subtitle}</p>}
                <div className="mt-5 flex flex-wrap gap-2">
                  <Badge variant="primary" dot>📅 {course.duration_weeks} weeks</Badge>
                  <Badge variant="accent" dot>⏱ {course.hours_per_week} h/week</Badge>
                  {course.pass_mark != null && <Badge variant="success" dot>🎯 Pass mark {course.pass_mark}%</Badge>}
                  {course.tags.slice(0, 4).map((t) => <Badge key={t}>#{t}</Badge>)}
                </div>
              </div>
            </div>

            {/* description (collapsible, markdown) */}
            {course.description && (
              <Card className="overflow-hidden p-0">
                <button
                  onClick={() => setDescOpen((o) => !o)}
                  aria-expanded={descOpen}
                  className="flex w-full items-center justify-between px-6 py-4 text-left"
                >
                  <span className="font-display text-lg font-bold text-content">The plan</span>
                  <span aria-hidden className={cn('text-muted transition-transform', descOpen && 'rotate-180')}>▾</span>
                </button>
                {descOpen && (
                  <div
                    className="prose-courses px-6 pb-6"
                    /* seed-authored content (trusted) — rendered with marked */
                    dangerouslySetInnerHTML={{ __html: renderedDescription }}
                  />
                )}
              </Card>
            )}

            {/* weeks */}
            {course.weeks.map((week) => (
              <WeekSection
                key={week.week_number}
                week={week}
                progressMap={progressMap}
                todayKey={todayKey}
                pendingDays={pendingDays}
                celebrating={celebration?.week === week.week_number}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </div>
      </div>

      {/* week-complete celebration */}
      <Modal
        open={celebration !== null}
        onClose={() => setCelebration(null)}
        title={`🎉 Week ${celebration?.week ?? ''} complete!`}
        className="max-w-md text-center"
      >
        <p className="text-sm font-medium text-muted">
          {celebration?.next
            ? `Every tick in week ${celebration.week} is checked and the gate passed. On to week ${celebration.next}.`
            : `Every tick in week ${celebration?.week} is checked. That's a wrap — keep the momentum going.`}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="accent" onClick={() => {
            setCelebration(null);
            if (celebration?.next) document.getElementById(`week-${celebration.next}`)?.scrollIntoView({ behavior: 'smooth' });
          }}>
            {celebration?.next ? `Go to week ${celebration.next} →` : 'Keep going'}
          </Button>
          <Button variant="ghost" onClick={() => setCelebration(null)}>Close</Button>
        </div>
      </Modal>
    </div>
  );
}
