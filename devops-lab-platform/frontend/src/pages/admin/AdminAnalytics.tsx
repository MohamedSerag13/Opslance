import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Badge, Button, Skeleton, EmptyState, ProgressBar } from '../../components/ui';
import { CountUp } from '../../components/fx';
import ActivityChart from '../../components/admin/ActivityChart';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';

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
  group_name?: string;
  name?: string;
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
  group_name?: string | null;
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

const PAGE_SIZE = 10;
const NUMERIC_COLS = ['attempts', 'pass_rate', 'avg_score'] as const;
type NumericCol = (typeof NUMERIC_COLS)[number];
type SortCol = NumericCol | 'title';

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

/** 10-bucket score histogram for the expanded lab row. */
const ScoreHistogram: React.FC<{ scores: number[] }> = ({ scores }) => {
  const buckets = useMemo(() => {
    const b = new Array(10).fill(0);
    for (const s of scores) b[Math.min(9, Math.floor(s / 10))] += 1;
    return b;
  }, [scores]);
  const max = Math.max(1, ...buckets);
  if (scores.length === 0) return <p className="px-6 py-4 text-sm text-muted">No scores in window.</p>;
  return (
    <div className="flex h-24 items-end gap-1.5 px-6 py-4" role="img" aria-label="Score distribution, 10 buckets from 0 to 100">
      {buckets.map((n, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${(n / max) * 100}%` }}
            transition={{ duration: 0.4, delay: i * 0.03 }}
            className={`w-full rounded-t ${i >= 6 ? 'bg-success/70' : i >= 4 ? 'bg-warn/70' : 'bg-danger/60'}`}
            style={{ minHeight: n > 0 ? 4 : 1 }}
          />
          <span className="text-[9px] font-bold text-muted">{i * 10}</span>
        </div>
      ))}
    </div>
  );
};

export default function AdminAnalytics() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [days, setDays] = useState(30);
  const [sortCol, setSortCol] = useState<SortCol>('attempts');
  const [sortAsc, setSortAsc] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(0);

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
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const kpis = useMemo(() => {
    if (!data) return [];
    const o = data.overview;
    return [
      { label: 'Submissions', value: o.submissions_window, sub: `${data.days}-day window · ${o.submissions_total} all-time` },
      { label: 'Students', value: o.students_total, sub: `${o.students_active_window} active last ${data.days}d` },
      { label: 'Avg Score', value: o.avg_score_passed, sub: 'when passed' },
      { label: 'Pass rate', value: o.pass_rate_all_time, sub: 'all-time, best attempts', suffix: '%' },
      { label: 'XP awarded', value: o.xp_total_awarded, sub: `${o.achievements_awarded} badges earned` },
      { label: 'Avg labs / student', value: o.students_total ? Number((o.submissions_total / o.students_total).toFixed(1)) : 0, sub: `${o.exam_attempts_total} runner attempts` },
    ];
  }, [data]);

  const sortedLabs = useMemo(() => {
    if (!data) return [];
    const rows = [...data.top_labs];
    rows.sort((a, b) => {
      if (sortCol === 'title') return a.title.localeCompare(b.title) * (sortAsc ? 1 : -1);
      const col = sortCol as NumericCol;
      return (a[col] - b[col]) * (sortAsc ? 1 : -1);
    });
    return rows;
  }, [data, sortCol, sortAsc]);

  const groupBars = useMemo(() => {
    if (!data) return [];
    return [...data.groups]
      .map((g) => ({ ...g, name: g.name ?? g.group_name ?? 'Group' }))
      .sort((a, b) => b.pass_rate - a.pass_rate);
  }, [data]);

  const exportXlsx = () => {
    if (!data) return;
    const rows = data.recent.map((r) => ({
      Student: r.student_name,
      Group: r.group_name ?? '',
      Lab: r.lab_title,
      Score: r.score,
      Passed: r.passed ? 'yes' : 'no',
      Attempt: r.attempt_number,
      Hints: r.hints_used,
      Time: r.submitted_at ?? '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'submissions');
    XLSX.writeFile(wb, `opslance-submissions-${data.days}d.xlsx`);
  };

  const pageRows = data?.recent.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE) ?? [];
  const pageCount = data ? Math.ceil(data.recent.length / PAGE_SIZE) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
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
                  <span className="font-display text-3xl font-bold text-primary">
                    <CountUp value={k.value} />
                    {'suffix' in k && k.suffix ? k.suffix : ''}
                  </span>
                  <span className="text-right text-sm font-semibold text-muted">{k.sub}</span>
                </div>
              </Card>
            ))}
          </div>

          {/* daily activity — submissions (filled) + unique students (stroke) + signups markers */}
          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl font-bold text-content">Daily activity</h2>
              <Badge variant="primary">{data.overview.submissions_window} submissions in window</Badge>
            </div>
            <ActivityChart
              data={data.daily.map((d) => ({ label: d.date, value: d.submissions, secondary: d.active_students }))}
              kind="area"
              ariaLabel="Daily submissions and unique active students for the selected window"
              secondaryLabel="active students"
              caption={
                <>
                  <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-primary" /> passed</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-danger/60" /> failed</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-accent" /> new signups</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border-2 border-accent bg-transparent" /> unique students</span>
                </>
              }
            />
          </Card>

          {/* lab performance (sortable, expandable) + group comparison */}
          <section aria-label="Lab performance" className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card className="overflow-hidden p-0">
              <h2 className="border-b border-border px-6 py-4 font-display text-lg font-bold text-content">
                Most attempted labs
              </h2>
              {sortedLabs.length === 0 ? (
                <p className="px-6 py-8 text-sm font-medium text-muted">No submissions yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-2/50 text-left">
                      <th scope="col" className="cursor-pointer px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted hover:text-content"
                          onClick={() => { setSortCol('title'); setSortAsc(sortCol === 'title' ? !sortAsc : true); }}>
                        Lab {sortCol === 'title' && (sortAsc ? '↑' : '↓')}
                      </th>
                      {NUMERIC_COLS.map((col) => (
                        <th key={col} scope="col"
                            className={`cursor-pointer px-3 py-3 text-right text-xs font-bold uppercase tracking-wider hover:text-content ${col === 'avg_score' ? 'px-5' : ''} ${sortCol === col ? 'text-content' : 'text-muted'}`}
                            onClick={() => { setSortCol(col); setSortAsc(sortCol === col ? !sortAsc : false); }}>
                          {col === 'attempts' ? 'Attempts' : col === 'pass_rate' ? 'Pass rate' : 'Avg score'} {sortCol === col && (sortAsc ? '↑' : '↓')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sortedLabs.map((l) => (
                      <>
                        <tr key={l.lab_id} className="cursor-pointer transition-colors hover:bg-surface-2/40"
                            onClick={() => setExpanded(expanded === l.lab_id ? null : l.lab_id)}>
                          <td className="max-w-[260px] px-5 py-3">
                            <span className="block truncate font-semibold text-content" title={l.title}>{l.title}</span>
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
                        <AnimatePresence key={`${l.lab_id}-expand`}>
                          {expanded === l.lab_id && (
                            <motion.tr
                              key={`${l.lab_id}-row`}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                            >
                              <td colSpan={4} className="border-t border-border bg-surface-2/30 p-0">
                                <ScoreHistogram scores={data.recent.filter((r) => r.lab_id === l.lab_id).map((r) => r.score)} />
                              </td>
                            </motion.tr>
                          )}
                        </AnimatePresence>
                      </>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            <Card className="overflow-hidden p-0">
              <h2 className="border-b border-border px-6 py-4 font-display text-lg font-bold text-content">
                Group comparison
              </h2>
              {groupBars.length === 0 ? (
                <p className="px-6 py-8 text-sm font-medium text-muted">No groups created yet.</p>
              ) : (
                <div className="space-y-4 px-6 py-5">
                  {groupBars.map((g, i) => (
                    <div key={g.group_id}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <Link to={`/admin/groups/${g.group_id}`} className="font-semibold text-content hover:text-primary hover:underline">
                          {g.name}
                        </Link>
                        <span className="text-xs font-bold text-muted">
                          {g.students} students · {g.pass_rate}% pass · avg {g.avg_labs_completed} labs
                        </span>
                      </div>
                      <ProgressBar
                        value={g.pass_rate}
                        label={`${g.name} pass rate`}
                        className={i === 0 ? '[&>div]:bg-warn' : i === 1 ? '[&>div]:bg-primary' : '[&>div]:bg-accent'}
                      />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </section>

          {/* recent submissions — paginated table + export */}
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-display text-lg font-bold text-content">Recent submissions</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">latest {data.recent.length}</span>
                <Button variant="secondary" size="sm" onClick={exportXlsx}>
                  <Download size={13} className="mr-1.5 inline" aria-hidden /> Export to XLSX
                </Button>
              </div>
            </div>
            {data.recent.length === 0 ? (
              <p className="px-6 py-8 text-sm font-medium text-muted">Nothing submitted yet.</p>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-2/50 text-left">
                      <th scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted">Student</th>
                      <th scope="col" className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-muted">Lab</th>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted">Score</th>
                      <th scope="col" className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider text-muted">Passed</th>
                      <th scope="col" className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pageRows.map((r, i) => (
                      <tr key={`${r.lab_id}-${r.student_name}-${r.submitted_at ?? i}`} className="transition-colors hover:bg-surface-2/40">
                        <td className="px-5 py-3 font-semibold text-content">{r.student_name}</td>
                        <td className="max-w-[260px] px-3 py-3">
                          <Link to={`/labs/${r.lab_id}/run`} className="block truncate text-content hover:text-primary hover:underline" title={r.lab_title}>
                            {r.lab_title}
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-right font-bold tabular-nums text-content">{r.score}</td>
                        <td className="px-3 py-3 text-center">
                          {r.passed ? <Badge variant="success" dot>✅</Badge> : <Badge variant="danger" dot>❌</Badge>}
                        </td>
                        <td className="px-5 py-3 text-right text-xs font-semibold text-muted" title={r.submitted_at ?? ''}>
                          {r.submitted_at ? relTime(r.submitted_at) : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {pageCount > 1 && (
                  <div className="flex items-center justify-between border-t border-border px-6 py-3">
                    <span className="text-xs font-semibold text-muted">Page {page + 1} of {pageCount}</span>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>← Prev</Button>
                      <Button variant="secondary" size="sm" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>Next →</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
