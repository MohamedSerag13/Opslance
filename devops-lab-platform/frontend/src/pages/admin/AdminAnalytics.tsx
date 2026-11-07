import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import { Link } from 'react-router-dom';
import { Card, Badge, Button, Skeleton, EmptyState } from '../../components/ui';

interface Overview {
  students_total: number;
  students_active_window: number;
  groups_total: number;
  labs_total: number;
  sessions_running: number;
  submissions_total: number;
  submissions_window: number;
  passed_window: number;
  pass_rate_all_time: number;
  avg_score_passed: number;
  xp_total_awarded: number;
  achievements_awarded: number;
  exam_attempts_total: number;
}

interface DayRow {
  date: string;
  submissions: number;
  passed: number;
  active_students: number;
  signups: number;
}

interface TopLab {
  lab_id: string;
  title: string;
  module_number: number | null;
  difficulty: string | null;
  attempts: number;
  students: number;
  pass_rate: number;
  avg_score: number;
}

interface GroupRow {
  group_id: string;
  name: string;
  students: number;
  active_window: number;
  submissions: number;
  pass_rate: number;
  avg_labs_completed: number;
}

interface RecentRow {
  lab_id: string;
  lab_title: string;
  student_name: string;
  score: number;
  passed: boolean;
  attempt_number: number;
  hints_used: number;
  submitted_at: string | null;
}

interface Analytics {
  days: number;
  overview: Overview;
  daily: DayRow[];
  top_labs: TopLab[];
  groups: GroupRow[];
  recent: RecentRow[];
}

const ADMIN_LINKS = [
  { to: '/admin', label: 'Overview' },
  { to: '/admin/analytics', label: 'Analytics' },
  { to: '/admin/groups', label: 'Groups' },
  { to: '/admin/students', label: 'Students' },
  { to: '/admin/leaderboard', label: 'Leaderboard' },
  { to: '/admin/labs', label: 'Labs' },
  { to: '/admin/environments', label: 'Environments' },
];

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

/** Stacked daily submissions (passed + failed) with signups overlay, pure SVG. */
const DailyChart: React.FC<{ data: DayRow[] }> = ({ data }) => {
  const max = Math.max(1, ...data.map((d) => d.submissions + d.signups));
  const W = 720;
  const H = 220;
  const n = data.length;
  const slot = W / Math.max(1, n);
  const barW = Math.max(2, slot * 0.6);
  const baseline = H - 24;

  return (
    <figure className="mt-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-56 w-full" role="img" aria-label="Daily submissions and signups for the selected window">
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1={0} x2={W} y1={baseline - g * (baseline - 10)} y2={baseline - g * (baseline - 10)}
                className="stroke-border" strokeWidth={1} strokeDasharray="3 5" opacity={0.6} />
        ))}
        {data.map((d, i) => {
          const x = i * slot + (slot - barW) / 2;
          const total = d.submissions;
          const passedH = (d.passed / max) * (baseline - 10);
          const failedH = ((total - d.passed) / max) * (baseline - 10);
          const signupH = (d.signups / max) * (baseline - 10);
          const y = baseline;
          const dateLabel = new Date(d.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          return (
            <g key={d.date}>
              {/* signups marker behind the bar */}
              {d.signups > 0 && (
                <circle
                  cx={x + barW / 2} cy={baseline - signupH - 4} r={Math.min(4, 2 + signupH / 12)}
                  className="fill-accent" opacity={0.85}
                >
                  <title>{`${dateLabel}: ${d.signups} new signups`}</title>
                </circle>
              )}
              <rect x={x} y={y - passedH} width={barW} height={Math.max(0, passedH)} rx={1.5} className="fill-primary">
                <title>{`${dateLabel}: ${d.passed} passed`}</title>
              </rect>
              <rect x={x} y={y - passedH - failedH} width={barW} height={Math.max(0, failedH)} rx={1.5} className="fill-danger/60">
                <title>{`${dateLabel}: ${total - d.passed} failed`}</title>
              </rect>
              {i % Math.ceil(n / 10) === 0 && (
                <text x={x + barW / 2} y={H - 6} textAnchor="middle" className="fill-[rgb(var(--c-muted))] text-[10px]">
                  {dateLabel}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-4 text-xs font-semibold text-muted">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-primary" /> passed</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-danger/60" /> failed</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-accent" /> new signups</span>
      </figcaption>
    </figure>
  );
};

const ADMIN_SPAN =
  'rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-surface-2 hover:text-content';

export default function AdminAnalytics() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [days, setDays] = useState(30);

  const fetchData = async (windowDays = days) => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await api.get(`/admin/analytics?days=${windowDays}`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load analytics', err);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const kpis = useMemo(() => {
    if (!data) return [];
    const o = data.overview;
    return [
      { label: 'Students', value: String(o.students_total), sub: `${o.students_active_window} active last ${data.days}d` },
      { label: 'Live labs', value: String(o.sessions_running), sub: `${o.labs_total} labs in catalog` },
      { label: 'Submissions', value: String(o.submissions_window), sub: `${data.days}-day window · ${o.submissions_total} all-time` },
      { label: 'Pass rate', value: `${o.pass_rate_all_time}%`, sub: `avg score ${o.avg_score_passed} when passed` },
      { label: 'XP awarded', value: String(o.xp_total_awarded), sub: `${o.achievements_awarded} badges earned` },
      { label: 'Exam attempts', value: String(o.exam_attempts_total), sub: 'question-by-question runner' },
    ];
  }, [data]);

  return (
    <div className="min-h-screen bg-bg" id="main">
      <header className="glass sticky top-0 z-40 border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link to="/dashboard" aria-label="Opslance home">
            <span className="font-display text-xl font-black tracking-tight text-content">Opslance</span>
            <span className="ml-2 rounded-md border border-border bg-surface-2 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-muted">Admin</span>
          </Link>
          <nav aria-label="Admin" className="ml-6 hidden items-center gap-1 md:flex">
            {ADMIN_LINKS.map((l) => (
              <Link key={l.to} to={l.to}
                    aria-current={l.to === '/admin/analytics' ? 'page' : undefined}
                    className={`${ADMIN_SPAN} ${l.to === '/admin/analytics' ? 'bg-surface-2 text-content' : 'text-muted'}`}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Link to="/admin" className={ADMIN_SPAN + ' hidden text-muted md:block'}>← Overview</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-content">Analytics</h1>
            <p className="mt-1 font-medium text-muted">
              Platform-wide learning activity — computed live from submissions, sessions and attempts.
            </p>
          </div>
          <label className="text-sm font-semibold text-muted">
            Window
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="ml-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-bold text-content"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </label>
        </div>

        {loading && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
            </div>
            <Skeleton className="h-72 w-full" />
          </div>
        )}

        {!loading && (failed || !data) && (
          <div className="py-16">
            <EmptyState
              icon={<span className="text-2xl">⚠️</span>}
              title="Couldn't load analytics"
              description="The backend didn't respond. Check your connection and try again."
              action={<Button variant="primary" onClick={() => fetchData(days)}>Retry</Button>}
            />
          </div>
        )}

        {!loading && data && (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {kpis.map((k) => (
                <Card key={k.label} className="flex flex-col justify-between p-6">
                  <p className="text-sm font-bold uppercase tracking-wider text-muted">{k.label}</p>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="font-display text-3xl font-bold text-primary">{k.value}</span>
                    <span className="text-sm font-semibold text-muted">{k.sub}</span>
                  </div>
                </Card>
              ))}
            </div>

            {/* daily activity */}
            <Card className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-xl font-bold text-content">Daily activity</h2>
                <Badge variant="primary">{data.overview.submissions_window} submissions in window</Badge>
              </div>
              <DailyChart data={data.daily} />
            </Card>

            {/* lab performance + groups */}
            <section aria-label="Lab performance" className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Card className="overflow-hidden p-0">
                <h2 className="border-b border-border px-6 py-4 font-display text-lg font-bold text-content">
                  Most attempted labs
                </h2>
                {data.top_labs.length === 0 ? (
                  <p className="px-6 py-8 text-sm font-medium text-muted">No submissions yet.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-surface-2/50 text-left">
                        <th scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted">Lab</th>
                        <th scope="col" className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted">Attempts</th>
                        <th scope="col" className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted">Pass rate</th>
                        <th scope="col" className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted">Avg score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.top_labs.map((l) => (
                        <tr key={l.lab_id} className="transition-colors hover:bg-surface-2/40">
                          <td className="max-w-[260px] px-5 py-3">
                            <Link to={`/labs/${l.lab_id}`} className="block truncate font-semibold text-content hover:text-primary hover:underline" title={l.title}>
                              {l.title}
                            </Link>
                            <span className="text-xs font-semibold text-muted">
                              {l.module_number != null ? `Module ${l.module_number}` : ''}{l.difficulty ? ` · ${l.difficulty}` : ''}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right font-bold tabular-nums text-content">{l.attempts}</td>
                          <td className="px-3 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="h-1.5 w-14 overflow-hidden rounded-full bg-surface-2">
                                <div className={`h-full rounded-full ${l.pass_rate >= 66 ? 'bg-success' : l.pass_rate >= 40 ? 'bg-warn' : 'bg-danger'}`}
                                     style={{ width: `${Math.min(100, l.pass_rate)}%` }} />
                              </div>
                              <span className="tabular-nums font-bold text-content">{l.pass_rate}%</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums text-muted">{l.avg_score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>

              <Card className="overflow-hidden p-0">
                <h2 className="border-b border-border px-6 py-4 font-display text-lg font-bold text-content">
                  Groups
                </h2>
                {data.groups.length === 0 ? (
                  <p className="px-6 py-8 text-sm font-medium text-muted">No groups created yet.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-surface-2/50 text-left">
                        <th scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted">Group</th>
                        <th scope="col" className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted">Students</th>
                        <th scope="col" className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted">Active</th>
                        <th scope="col" className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted">Pass rate</th>
                        <th scope="col" className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted">Avg labs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.groups.map((g) => (
                        <tr key={g.group_id} className="transition-colors hover:bg-surface-2/40">
                          <td className="px-5 py-3">
                            <Link to={`/admin/groups/${g.group_id}`} className="font-semibold text-content hover:text-primary hover:underline">
                              {g.name}
                            </Link>
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums text-content">{g.students}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-content">{g.active_window}</td>
                          <td className="px-3 py-3 text-right tabular-nums font-bold text-content">{g.pass_rate}%</td>
                          <td className="px-5 py-3 text-right tabular-nums text-muted">{g.avg_labs_completed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            </section>

            {/* recent feed */}
            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <h2 className="font-display text-lg font-bold text-content">Recent submissions</h2>
                <span className="text-xs font-bold uppercase tracking-wider text-muted">latest 20</span>
              </div>
              {data.recent.length === 0 ? (
                <p className="px-6 py-8 text-sm font-medium text-muted">Nothing submitted yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {data.recent.map((r, i) => (
                    <li key={`${r.lab_id}-${r.submitted_at}-${i}`} className="flex flex-wrap items-center gap-3 px-6 py-3.5">
                      <span className="w-14 shrink-0">
                        {r.passed
                          ? <Badge variant="success" dot>Pass</Badge>
                          : <Badge variant="danger" dot>Fail</Badge>}
                      </span>
                      <span className="min-w-0 flex-1">
                        <Link to={`/labs/${r.lab_id}`} className="block truncate font-semibold text-content hover:text-primary hover:underline" title={r.lab_title}>
                          {r.lab_title}
                        </Link>
                        <span className="text-xs font-semibold text-muted">{r.student_name} · attempt {r.attempt_number}</span>
                      </span>
                      <span className="text-sm font-bold tabular-nums text-content">{r.score} pts</span>
                      <span className="w-16 text-right text-xs font-semibold text-muted" title={r.submitted_at ?? ''}>
                        {r.submitted_at ? relTime(r.submitted_at) : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
