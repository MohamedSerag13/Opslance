import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useMotionValue, useReducedMotion, useSpring, AnimatePresence } from 'framer-motion';
import AppNav from '../components/layout/AppNav';
import { Card, Badge, Button, Skeleton, EmptyState, ProgressBar, ProgressRing, Modal } from '../components/ui';
import { BlurFade, FloatingParticles, CountUp, PulseBadge, Typewriter, ShineBorder, cn } from '../components/fx';
import Heatmap from '../components/dashboard/Heatmap';
import CourseProgressPill from '../components/courses/CourseProgressPill';
import type { continueItem, dashboardData } from './dashboard-types';
import type { CourseSummary } from './courses-types';

/* ---------------------------------- types ---------------------------------- */

type Track = dashboardData['tracks'][number];

const RANK_STYLES = ['bg-warn/20 text-warn', 'bg-muted/25 text-muted', 'bg-accent/15 text-accent'];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Burning the midnight oil';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Flavor titles per level band — the Typewriter fades to this after the greeting. */
function levelTitle(level: number): string {
  if (level >= 15) return 'Infrastructure Wizard';
  if (level >= 10) return 'Cluster Commander';
  if (level >= 5) return 'SRE Apprentice';
  return 'Shell Cadet';
}

function fmtCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}

/** Live countdown chip for an exam attempt; null when untimed or expired. */
function useExamCountdown(expiresAt: string | null | undefined): { text: string | null; critical: boolean } {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  if (!expiresAt) return { text: null, critical: false };
  const remaining = (new Date(expiresAt).getTime() - now) / 1000;
  return { text: fmtCountdown(remaining), critical: remaining < 300 };
}

/* ------------------------------- sub-components ------------------------------ */

const ContinueCard: React.FC<{ item: continueItem }> = ({ item }) => {
  const navigate = useNavigate();
  const countdown = useExamCountdown(item.kind === 'attempt' ? item.expires_at : null);

  const kindMeta = {
    attempt: { icon: '🏁', label: item.mode === 'exam' ? 'Exam in progress' : 'Practice in progress' },
    session: { icon: '⚙️', label: 'Session running' },
    retry: { icon: '🔁', label: `Failed — scored ${item.last_score}/${item.points}` },
    next: { icon: '➡️', label: 'Next up in your path' },
  }[item.kind];

  const target = `/labs/${item.lab_id}/run`;
  const cta = item.kind === 'attempt' ? 'Resume' : item.kind === 'session' ? 'Open' : item.kind === 'retry' ? 'Retry' : 'Start';

  return (
    <Card interactive className="flex min-w-[260px] flex-col justify-between gap-3 p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xl" aria-hidden>{kindMeta.icon}</span>
        <span className="flex flex-wrap items-center justify-end gap-1.5">
          {countdown.text && (
            <span className={`tabular-nums rounded-lg px-2 py-1 text-xs font-bold border ${countdown.critical ? 'text-danger border-danger/50 bg-danger/10' : 'text-content border-border bg-surface-2'}`}>
              ⏱ {countdown.text}
            </span>
          )}
          <Badge variant={item.kind === 'attempt' && item.mode === 'exam' ? 'accent' : 'default'}>{kindMeta.label}</Badge>
        </span>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Module {String(item.module_number).padStart(2, '0')}</p>
        <p className="mt-0.5 line-clamp-2 text-sm font-bold text-content">{item.lab_title}</p>
        {item.kind === 'attempt' && (
          <p className="mt-1 text-xs font-medium text-muted">
            Question {Math.min((item.current_index ?? 0) + 1, item.question_count || 1)} of {item.question_count || '?'}
          </p>
        )}
        {item.kind === 'next' && (
          <p className="mt-1 text-xs font-medium text-muted capitalize">
            {item.difficulty} · {item.estimated_minutes} min · ⭐ {item.points} pts
          </p>
        )}
      </div>
      <Button variant="primary" size="sm" className="w-full" onClick={() => navigate(target)}>{cta} →</Button>
    </Card>
  );
};

/** Week-by-week stepper for certification tracks (one big lab per week). */
const WeekStepper: React.FC<{ track: Track }> = ({ track }) => {
  const navigate = useNavigate();
  const weeks = track.modules;
  const currentWeek = weeks.find((w) => w.labs?.some((l) => l.status !== 'completed')) ?? null;
  const currentLab = currentWeek?.labs?.find((l) => l.status !== 'completed') ?? currentWeek?.labs?.[0];

  return (
    <Card glow className="p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <ProgressRing value={track.completion} size={72} label={`${track.title} completion`}>
            <span className="text-sm font-black text-content">{track.completion}%</span>
          </ProgressRing>
          <div>
            <h3 className="font-display text-lg font-bold text-content">{track.title}</h3>
            <p className="mt-1 max-w-md text-sm font-medium text-muted">{track.tagline}</p>
            <p className="mt-2 text-xs font-bold uppercase tracking-wider text-muted">
              {track.completed_labs} / {track.total_labs} weeks complete
            </p>
          </div>
        </div>
        {currentLab && (
          <Button variant="accent" size="sm" onClick={() => navigate(`/labs/${currentLab.lab_id}/run`)} className="shrink-0">
            {currentWeek && track.completed_labs > 0 ? `Continue Week ${currentWeek.module_number - 20}` : 'Start Week 1'} →
          </Button>
        )}
      </div>

      <ol className="mt-6 flex items-center gap-1.5 overflow-x-auto pb-1 sm:gap-2" aria-label="Weeks">
        {weeks.map((w, i) => {
          const lab = w.labs?.[0];
          const done = lab?.status === 'completed';
          const active = lab?.status === 'in_progress';
          return (
            <li key={w.module_number} className="flex flex-1 items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => lab && navigate(`/labs/${lab.lab_id}/run`)}
                disabled={!lab}
                title={`Week ${i + 1}: ${lab?.title ?? w.module_title}${done ? ` — passed (${lab?.best_score}/${w.points})` : ''}`}
                aria-label={`Week ${i + 1}: ${lab?.title ?? w.module_title}${done ? ', completed' : ''}`}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-xs font-black transition-all sm:h-11 sm:w-11 sm:text-sm
                  ${done ? 'border-success bg-success text-white hover:scale-105'
                    : active ? 'border-primary bg-primary/15 text-primary animate-pulse hover:scale-105'
                    : 'border-border bg-surface-2 text-muted hover:border-primary/50 hover:text-content'}`}
              >
                {done ? '✓' : i + 1}
              </button>
              {i < weeks.length - 1 && (
                <span aria-hidden className={`h-0.5 min-w-2 flex-1 rounded ${done ? 'bg-success' : 'bg-border'}`} />
              )}
            </li>
          );
        })}
      </ol>
      <div className="mt-3 flex justify-between text-xs font-semibold text-muted">
        <span>W1 Foundations</span>
        <span>W8 Mock Exam</span>
      </div>
    </Card>
  );
};

/** 3D tilt wrapper (±8° max), flat under reduced motion. */
const TiltCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  const reduce = useReducedMotion();
  const rx = useSpring(useMotionValue(0), { stiffness: 300, damping: 24 });
  const ry = useSpring(useMotionValue(0), { stiffness: 300, damping: 24 });

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduce) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    ry.set(px * 16);   // ±8°
    rx.set(-py * 16);
  };
  const reset = () => { rx.set(0); ry.set(0); };

  return (
    <motion.div
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 800 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/** Compact module cards for path tracks, with next-lab deep links. */
const ModuleGrid: React.FC<{ track: Track; locked: (m: Track['modules'][number]) => boolean; onLocked: (m: Track['modules'][number]) => void }> = ({ track, locked, onLocked }) => {
  const navigate = useNavigate();
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {track.modules.map((m) => {
        const done = m.completed_labs === m.total_labs;
        const isLocked = locked(m);
        return (
          <TiltCard key={m.module_number}>
            <Card className="relative flex h-full flex-col justify-between gap-3 overflow-hidden p-4">
              {done && <ShineBorder shineColor="rgb(var(--c-success))" />}
              {done && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  className="absolute right-3 top-3 text-lg"
                  aria-hidden
                >
                  ✅
                </motion.span>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-primary">
                  Module {String(m.module_number).padStart(2, '0')}
                </span>
                {done && <Badge variant="success" dot>Complete</Badge>}
              </div>
              <div>
                <h4 className="text-sm font-bold leading-snug text-content">{m.module_title}</h4>
                <div className="mt-2.5 flex items-center gap-2">
                  <ProgressBar value={m.completed_labs} max={m.total_labs} className="flex-1" label={`${m.module_title} progress`} />
                  <span className="text-xs font-bold tabular-nums text-muted">{m.completed_labs}/{m.total_labs}</span>
                </div>
              </div>
              {m.next_lab ? (
                <button
                  onClick={() => navigate(`/labs/${m.next_lab!.lab_id}/run`)}
                  className="truncate text-left text-xs font-black text-primary hover:underline"
                  title={`Next: ${m.next_lab.title}`}
                >
                  Next: {m.next_lab.title} →
                </button>
              ) : (
                <span className="text-xs font-bold text-success">All labs passed 🎉</span>
              )}

              {isLocked && (
                <button
                  onClick={() => onLocked(m)}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-bg/70 backdrop-blur-sm"
                  aria-label={`${m.module_title} is locked — upgrade to Pro`}
                >
                  <span className="text-2xl" aria-hidden>🔒</span>
                  <Badge variant="accent">Pro</Badge>
                </button>
              )}
            </Card>
          </TiltCard>
        );
      })}
    </div>
  );
};

/* ------------------------------ leaderboard widget --------------------------- */

const LeaderboardWidget: React.FC<{ board: dashboardData['leaderboard'] }> = ({ board }) => (
  <Card className="p-6">
    <div className="flex items-baseline justify-between">
      <h3 className="font-display text-lg font-bold text-content">Leaderboard</h3>
      <Badge variant={board.scope === 'group' ? 'primary' : 'default'}>
        {board.scope === 'group' ? 'Your group' : 'Global'} · #{board.my_rank ?? '—'} of {board.total_students}
      </Badge>
    </div>
    {board.entries.length === 0 ? (
      <p className="mt-4 text-sm font-medium text-muted">No ranked students yet — pass a lab to appear here.</p>
    ) : (
      <ol className="mt-4 space-y-1.5">
        {board.entries.map((e) => (
          <li
            key={e.student_id}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${e.is_me ? 'bg-primary/10 ring-1 ring-primary/40' : 'bg-surface-2/50'}`}
          >
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${RANK_STYLES[e.rank - 1] ?? 'bg-surface-2 text-muted'}`}>
              {e.rank}
            </span>
            <span className={`min-w-0 flex-1 truncate font-semibold ${e.is_me ? 'text-primary' : 'text-content'}`}>
              {e.name}{e.is_me ? ' (you)' : ''}
            </span>
            <span className="shrink-0 text-xs font-bold tabular-nums text-muted">{e.labs_completed} labs · {e.total_score} pts</span>
          </li>
        ))}
        {board.my_rank !== null && board.my_rank > 5 && (
          <li className="flex items-center gap-3 rounded-xl bg-primary/10 px-3 py-2 text-sm ring-1 ring-primary/40">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-black text-muted">{board.my_rank}</span>
            <span className="min-w-0 flex-1 truncate font-semibold text-primary">You</span>
            <span className="text-xs font-bold text-muted">keep climbing ↑</span>
          </li>
        )}
      </ol>
    )}
    <Link to="/leaderboard" className="mt-4 inline-block text-xs font-black text-primary hover:underline">
      View full leaderboard →
    </Link>
  </Card>
);

/* --------------------------------- main page -------------------------------- */

export default function StudentDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [data, setData] = useState<dashboardData | null>(null);
  const [profile, setProfile] = useState<{ xp: number; level: number; current_streak: number; longest_streak: number } | null>(null);
  const [courses, setCourses] = useState<CourseSummary[] | null>(null);
  const [optOutCompletion, setOptOutCompletion] = useState(false);
  const [updatingPrefs, setUpdatingPrefs] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const prevXp = useRef<number | null>(null);
  const [xpFlash, setXpFlash] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setFailed(false);
    try {
      const [dashRes, profRes, meRes] = await Promise.all([
        api.get('/progress/dashboard'),
        api.get('/gamification/profile'),
        api.get('/auth/me'),
      ]);
      setData(dashRes.data);
      setProfile(profRes.data);
      setOptOutCompletion(meRes.data.opt_out_completion || false);
      // courses strip is auxiliary — a failure here never blanks the dashboard
      api.get('/courses').then((r) => setCourses(r.data)).catch(() => setCourses([]));
      api.get('/settings/public').then((r) => setAnnouncement(r.data.announcement ?? '')).catch(() => {});
    } catch (err) {
      console.error('Failed to load dashboard data', err);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // XP-gain flash when returning from a lab with points
  const xpNow = profile?.xp ?? null;
  useEffect(() => {
    if (xpNow === null) return;
    if (prevXp.current !== null && xpNow > prevXp.current) {
      setXpFlash(true);
      const t = setTimeout(() => setXpFlash(false), 1400);
      prevXp.current = xpNow;
      return () => clearTimeout(t);
    }
    prevXp.current = xpNow;
  }, [xpNow]);

  const handlePreferenceToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.checked;
    setOptOutCompletion(newVal);
    setUpdatingPrefs(true);
    try {
      await api.put('/auth/preferences', { opt_out_completion: newVal });
    } catch (err) {
      console.error('Failed to update preferences', err);
      setOptOutCompletion(!newVal);
    } finally {
      setUpdatingPrefs(false);
    }
  };

  const firstName = user?.full_name?.split(' ')[0] ?? 'there';
  const tier = summary0(data)?.subscription_tier;
  const isFree = tier === undefined ? true : tier === 'free';
  const lockedFor = (m: Track['modules'][number]) => isFree && m.module_number !== 1;

  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        <AppNav />
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
          <Skeleton className="h-36 w-full" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (failed || !data) {
    return (
      <div className="min-h-screen bg-bg">
        <AppNav />
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <EmptyState
            icon={<span className="text-2xl">⚠️</span>}
            title="Couldn't load your dashboard"
            description="The backend didn't respond. Check your connection and try again."
            action={<Button variant="primary" onClick={fetchData}>Retry</Button>}
          />
        </div>
      </div>
    );
  }

  const { summary, continue: continueItems, tracks, activity, leaderboard } = data;
  const ckaTrack = tracks.find((t) => t.kind === 'certification');
  const pathTrack = tracks.find((t) => t.kind === 'path');
  const tierBadge = summary.subscription_tier === 'pro'
    ? <Badge variant="accent" dot>Pro</Badge>
    : summary.subscription_tier === 'enterprise'
      ? <Badge variant="primary" dot>Enterprise</Badge>
      : <Badge>Free</Badge>;

  const totalCatalog = tracks.reduce((s, t) => s + t.total_labs, 0);
  const statCards = [
    { label: 'XP · Level', value: profile ? `${profile.xp}` : String(summary.total_points), sub: profile ? `Level ${profile.level}` : 'points', accent: 'text-primary' },
    { label: 'Day Streak', value: `🔥 ${profile?.current_streak ?? summary.current_streak}`, sub: profile ? `best ${profile.longest_streak}` : '', accent: 'text-accent' },
    { label: 'Labs Completed', value: String(summary.total_labs_completed), sub: `of ${totalCatalog}`, accent: 'text-content' },
    { label: 'Total Points', value: String(summary.total_points), sub: 'best scores', accent: 'text-success' },
  ];

  return (
    <div className="min-h-screen bg-bg" id="main">
      <AppNav />
      <div className="mesh-bg min-h-screen">
        <div className="relative">
          <FloatingParticles count={28} className="fixed" />
        </div>
        <main className="relative mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
          {/* platform announcement */}
          {announcement && (
            <BlurFade className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 px-5 py-3.5">
              <span aria-hidden className="text-lg">📢</span>
              <p className="text-sm font-bold text-content">{announcement}</p>
            </BlurFade>
          )}

          {/* hero strip: greeting typewriter + live XP ring */}
          <BlurFade className="relative overflow-hidden rounded-2xl border border-border mesh-bg">
            <div className="relative flex min-h-[160px] flex-col justify-between gap-6 bg-gradient-to-r from-primary/15 via-transparent to-accent/10 p-8 lg:flex-row lg:items-center">
              <div>
                <h1 className="font-display text-3xl font-bold tracking-tight text-content">
                  {greeting()}, {firstName} 👋
                </h1>
                <p className="mt-1.5 font-medium text-muted">
                  <Typewriter text={`Level ${profile?.level ?? 1} · ${levelTitle(profile?.level ?? 1)}`} />
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {(profile?.current_streak ?? summary.current_streak) > 0 ? (
                    <PulseBadge tone="warn">
                      <motion.span
                        aria-hidden
                        className="inline-block"
                        whileHover={{ scale: 1.3 }}
                        animate={{ scale: [1, 1.12, 1] }}
                        transition={{ repeat: Infinity, duration: 1.6 }}
                      >
                        🔥
                      </motion.span>
                      Streak: {profile?.current_streak ?? summary.current_streak} days
                    </PulseBadge>
                  ) : (
                    <Badge>Start your streak today →</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex flex-wrap items-center gap-3">
                  {continueItems[0] ? (
                    <Button variant="accent" onClick={() => navigate(continueItems[0].kind === 'attempt' ? `/labs/${continueItems[0].lab_id}/run` : `/labs/${continueItems[0].lab_id}`)}>
                      {continueItems[0].kind === 'attempt' ? '🏁 Resume exam' : continueItems[0].kind === 'session' ? 'Resume session' : continueItems[0].kind === 'retry' ? 'Retry last lab' : 'Start next lab'}
                    </Button>
                  ) : (
                    <Button variant="accent" onClick={() => document.getElementById('tracks')?.scrollIntoView({ behavior: 'smooth' })}>
                      Browse learning tracks
                    </Button>
                  )}
                  <Link to="/billing"><Button variant="secondary" size="sm">{tierBadge} tier</Button></Link>
                  <Button variant="ghost" size="sm" onClick={logout} className="hover:text-danger">Log out</Button>
                </div>
                <div className={cn('shrink-0', xpFlash && 'xp-gain')}>
                  <ProgressRing
                    value={nextLevelPct(profile?.xp ?? 0)}
                    size={104}
                    label={`XP progress to level ${(profile?.level ?? 1) + 1}`}
                  >
                    <div className="text-center">
                      <CountUp value={profile?.xp ?? summary.total_points} className="block text-lg font-black tabular-nums text-content" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted">XP · L{profile?.level ?? 1}</span>
                    </div>
                  </ProgressRing>
                </div>
              </div>
            </div>
          </BlurFade>

          {/* stat cards */}
          <BlurFade className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((c) => (
              <Card key={c.label} className="flex flex-col justify-between p-6">
                <p className="text-sm font-bold uppercase tracking-wider text-muted">{c.label}</p>
                <div className="mt-4 flex items-baseline justify-between">
                  <span className={`font-display text-3xl font-bold ${c.accent}`}>{c.value}</span>
                  <span className="text-sm font-semibold text-muted">{c.sub}</span>
                </div>
              </Card>
            ))}
          </BlurFade>

          {/* continue where you left off */}
          {continueItems.length > 0 && (
            <section aria-label="Continue where you left off">
              <h2 className="mb-4 font-display text-2xl font-bold text-content">Pick up where you left off</h2>
              <BlurFade delay={0.08} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {continueItems.map((item, i) => <ContinueCard key={`${item.kind}-${item.lab_id}-${i}`} item={item} />)}
              </BlurFade>
            </section>
          )}

          {/* course progress strip */}
          <section aria-label="Course progress" className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-2xl font-bold text-content">Courses</h2>
              <Link to="/courses" className="text-xs font-black text-primary hover:underline">Browse all courses →</Link>
            </div>
            {courses === null ? (
              <Skeleton className="h-20 w-full rounded-xl" />
            ) : courses.length === 0 ? (
              <Card className="flex items-center justify-between gap-4 p-5">
                <p className="text-sm font-medium text-muted">No structured paths yet — a guided study plan beats random labs.</p>
                <Link to="/courses"><Button variant="primary" size="sm">Browse learning paths →</Button></Link>
              </Card>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
                {courses.map((course) => <CourseProgressPill key={course.id} course={course} />)}
              </div>
            )}
          </section>

          {/* certification tracks */}
          <section id="tracks" aria-label="Learning tracks" className="space-y-6">
            <h2 className="font-display text-2xl font-bold text-content">Learning tracks</h2>
            {ckaTrack && <WeekStepper track={ckaTrack} />}

            {pathTrack && (
              <Card className="p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <ProgressRing value={pathTrack.completion} size={72} label={`${pathTrack.title} completion`}>
                      <span className="text-sm font-black text-content">{pathTrack.completion}%</span>
                    </ProgressRing>
                    <div>
                      <h3 className="font-display text-lg font-bold text-content">{pathTrack.title}</h3>
                      <p className="mt-1 max-w-md text-sm font-medium text-muted">{pathTrack.tagline}</p>
                      <p className="mt-2 text-xs font-bold uppercase tracking-wider text-muted">
                        {pathTrack.completed_labs} / {pathTrack.total_labs} labs complete
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {pathTrack && (
              <ModuleGrid
                track={pathTrack}
                locked={lockedFor}
                onLocked={() => setShowUpgrade(true)}
              />
            )}
          </section>

          {/* sidebar row: heatmap + leaderboard + settings */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="space-y-8">
              <Heatmap activity={activity} />
              <Card className="space-y-4 p-6">
                <h3 className="text-lg font-bold text-content">Email notifications</h3>
                <p className="text-sm font-medium text-muted">
                  Customize which transactional onboarding or grading messages you receive in your inbox.
                </p>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm font-semibold text-content">Opt out of lab completion emails</span>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input type="checkbox" checked={optOutCompletion} onChange={handlePreferenceToggle} disabled={updatingPrefs} className="peer sr-only" />
                    <div className="h-6 w-11 rounded-full bg-surface-2 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-muted after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-checked:after:bg-surface"></div>
                  </label>
                </div>
                {updatingPrefs && <p className="animate-pulse text-xs font-bold text-primary">Saving settings…</p>}
              </Card>
            </div>
            <LeaderboardWidget board={leaderboard} />
          </div>
        </main>
      </div>

      {/* free-tier upgrade modal */}
      <Modal open={showUpgrade} onClose={() => setShowUpgrade(false)} title="This module is part of Pro" className="max-w-md text-center">
        <p className="text-sm font-medium text-muted">
          Free tier covers Module 01 only. Upgrade to Pro to unlock every lab, all CKA weeks and unlimited sessions.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="accent" onClick={() => navigate('/billing')}>See plans →</Button>
          <Button variant="ghost" onClick={() => setShowUpgrade(false)}>Not now</Button>
        </div>
      </Modal>
    </div>
  );
}

/* ------------------------------- page helpers -------------------------------- */

function summary0(data: dashboardData | null): { subscription_tier: string } | undefined {
  return data ? { subscription_tier: data.summary.subscription_tier } : undefined;
}

/** % into the current level (100 XP per level). */
function nextLevelPct(xp: number): number {
  return Math.round(((xp % 100) / 100) * 100);
}
