import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { Link } from 'react-router-dom';
import AppNav from '../components/layout/AppNav';
import { Card, Badge, Button, Tabs, Skeleton, EmptyState, ProgressRing } from '../components/ui';
import Heatmap from '../components/dashboard/Heatmap';
import type { dashboardData } from './dashboard-types';

interface historyRow {
  lab_id: string;
  title: string;
  score: number;
  passed: boolean;
  hints_used: number;
  time_taken: number | null;
  submitted_at: string;
}

interface progressPayload {
  history: historyRow[];
  total_score: number;
}

type Filter = 'all' | 'passed' | 'failed';

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function Progress() {
  const [progress, setProgress] = useState<progressPayload | null>(null);
  const [dash, setDash] = useState<dashboardData | null>(null);
  const [profile, setProfile] = useState<{ xp: number; level: number; current_streak: number; longest_streak: number } | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setFailed(false);
    try {
      const [pRes, dRes, profRes] = await Promise.all([
        api.get('/progress'),
        api.get('/progress/dashboard'),
        api.get('/gamification/profile'),
      ]);
      setProgress(pRes.data);
      setDash(dRes.data);
      setProfile(profRes.data);
    } catch (err) {
      console.error('Failed to load progress data', err);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const history = useMemo(() => {
    const rows = [...(progress?.history ?? [])];
    rows.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
    if (filter === 'passed') return rows.filter((r) => r.passed);
    if (filter === 'failed') return rows.filter((r) => !r.passed);
    return rows;
  }, [progress, filter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        <AppNav />
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (failed || !progress || !dash) {
    return (
      <div className="min-h-screen bg-bg">
        <AppNav />
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <EmptyState
            icon={<span className="text-2xl">⚠️</span>}
            title="Couldn't load your progress"
            description="The backend didn't respond. Check your connection and try again."
            action={<Button variant="primary" onClick={fetchData}>Retry</Button>}
          />
        </div>
      </div>
    );
  }

  const { summary, tracks, activity } = dash;
  const allRows = progress.history;
  const passedCount = allRows.filter((r) => r.passed).length;
  const attemptCount = allRows.length;
  const passRate = attemptCount > 0 ? Math.round((passedCount / attemptCount) * 100) : 0;
  const practicedMins = allRows.reduce((s, r) => s + (r.time_taken ?? 0), 0);
  const practiced = practicedMins >= 60
    ? `${Math.floor(practicedMins / 60)}h ${practicedMins % 60}m`
    : `${practicedMins}m`;
  const totalCatalog = tracks.reduce((s, t) => s + t.total_labs, 0);

  const statCards = [
    { label: 'Points earned', value: String(summary.total_points), sub: `${summary.total_labs_completed} labs passed`, accent: 'text-primary' },
    { label: 'XP · Level', value: profile ? String(profile.xp) : '—', sub: profile ? `Level ${profile.level}` : '', accent: 'text-accent' },
    { label: 'Pass rate', value: `${passRate}%`, sub: `${passedCount} of ${attemptCount} attempts`, accent: 'text-success' },
    { label: 'Time in labs', value: practiced, sub: 'across all attempts', accent: 'text-content' },
  ];

  return (
    <div className="min-h-screen bg-bg" id="main">
      <AppNav />
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* page head */}
        <div>
          <Link to="/dashboard" className="text-sm font-bold text-primary hover:underline">← Dashboard</Link>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-content">Your progress</h1>
          <p className="mt-1 font-medium text-muted">
            Every attempt you've made, graded against the live state of your lab.
          </p>
        </div>

        {/* stat cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((c) => (
            <Card key={c.label} className="flex flex-col justify-between p-6">
              <p className="text-sm font-bold uppercase tracking-wider text-muted">{c.label}</p>
              <div className="mt-4 flex items-baseline justify-between">
                <span className={`font-display text-3xl font-bold ${c.accent}`}>{c.value}</span>
                <span className="text-sm font-semibold text-muted">{c.sub}</span>
              </div>
            </Card>
          ))}
        </div>

        {/* learning tracks summary */}
        <section aria-label="Learning track progress" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {tracks.map((t) => (
            <Card key={t.title} interactive className="flex items-center gap-5 p-6">
              <ProgressRing value={t.completion} size={72} label={`${t.title} completion`}>
                <span className="text-sm font-black text-content">{t.completion}%</span>
              </ProgressRing>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-display text-lg font-bold text-content">{t.title}</h3>
                  <Badge variant={t.kind === 'certification' ? 'accent' : 'primary'}>
                    {t.kind === 'certification' ? 'Certification' : 'Path'}
                  </Badge>
                </div>
                <p className="mt-1 truncate text-sm font-medium text-muted">{t.tagline}</p>
                <p className="mt-2 text-xs font-bold uppercase tracking-wider text-muted">
                  {t.completed_labs} / {t.total_labs} labs complete
                </p>
              </div>
              <Link to="/dashboard#tracks" className="shrink-0 text-xs font-black text-primary hover:underline">
                Open →
              </Link>
            </Card>
          ))}
          {tracks.length === 0 && (
            <Card className="p-6"><p className="text-sm font-medium text-muted">No tracks assigned yet.</p></Card>
          )}
        </section>

        {/* activity */}
        <Heatmap activity={activity} title="Lab activity" />

        {/* submission history */}
        <section aria-label="Submission history">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-display text-2xl font-bold text-content">Submission history</h2>
            <Tabs
              ariaLabel="Filter submissions"
              active={filter}
              onChange={(id) => setFilter(id as Filter)}
              items={[
                { id: 'all', label: `All (${attemptCount})` },
                { id: 'passed', label: `Passed (${passedCount})` },
                { id: 'failed', label: `Failed (${attemptCount - passedCount})` },
              ]}
            />
          </div>

          <Card className="mt-4 overflow-hidden p-0">
            {history.length === 0 ? (
              <EmptyState
                icon={<span className="text-2xl">🗂️</span>}
                title={allRows.length === 0 ? 'No submissions yet' : 'Nothing matches this filter'}
                description={allRows.length === 0
                  ? 'Pass your first lab and it will show up here with score, hints and time spent.'
                  : 'Try a different filter to see the rest of your attempts.'}
                action={allRows.length === 0
                  ? <Link to="/dashboard#tracks"><Button variant="primary">Browse learning tracks</Button></Link>
                  : <Button variant="secondary" onClick={() => setFilter('all')}>Show all attempts</Button>}
              />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-2/50 text-left">
                    <th scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted">Status</th>
                    <th scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted">Lab</th>
                    <th scope="col" className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted">Score</th>
                    <th scope="col" className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted">Hints</th>
                    <th scope="col" className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted">Time</th>
                    <th scope="col" className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {history.map((h, i) => (
                    <tr key={`${h.lab_id}-${h.submitted_at}-${i}`} className="transition-colors hover:bg-surface-2/40">
                      <td className="px-5 py-3.5">
                        {h.passed
                          ? <Badge variant="success" dot>Passed</Badge>
                          : <Badge variant="danger" dot>Failed</Badge>}
                      </td>
                      <td className="max-w-[280px] px-5 py-3.5">
                        <Link to={`/labs/${h.lab_id}`} className="block truncate font-semibold text-content hover:text-primary hover:underline" title={h.title}>
                          {h.title}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold tabular-nums text-content">{h.score}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-muted">{h.hints_used || '—'}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-muted">
                        {h.time_taken != null ? `${h.time_taken}m` : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap text-muted" title={new Date(h.submitted_at).toLocaleString()}>
                        {relTime(h.submitted_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
          <p className="mt-3 text-xs font-semibold text-muted">
            Scores count toward your total only when the lab passes · {totalCatalog} labs in the catalog
          </p>
        </section>
      </div>
    </div>
  );
}
