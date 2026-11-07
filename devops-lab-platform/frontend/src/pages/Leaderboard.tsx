import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import AppNav from '../components/layout/AppNav';
import { Card, Button, Tabs, Skeleton, EmptyState } from '../components/ui';

interface boardRow {
  rank: number;
  student_id: number | string;
  name: string;
  score: number;
}

type Scope = 'session' | 'all_time';

/** Podium styling per top-3 rank: medal emoji + token-tinted card. */
const PODIUM = [
  { medal: '🥇', ring: 'border-warn/60 bg-warn/10', chip: 'bg-warn text-white', label: 'text-warn' },
  { medal: '🥈', ring: 'border-muted/50 bg-muted/10', chip: 'bg-muted text-bg', label: 'text-muted' },
  { medal: '🥉', ring: 'border-accent/50 bg-accent/10', chip: 'bg-accent text-white', label: 'text-accent' },
] as const;

const rankChip = (rank: number) =>
  rank <= 3 ? PODIUM[rank - 1].chip : 'bg-surface-2 text-muted';

export default function Leaderboard() {
  const { user, token } = useAuthStore();
  const [board, setBoard] = useState<boardRow[]>([]);
  const [scope, setScope] = useState<Scope>('session');
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  const fetchBoard = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await api.get(`/gamification/leaderboard/${scope}`);
      setBoard(res.data);
    } catch (err) {
      console.error('Failed to load leaderboard', err);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    fetchBoard(true);
  }, [fetchBoard]);

  useEffect(() => {
    // Live updates: refetch whenever the backend broadcasts a leaderboard event.
    if (!token) return;

    let ws: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    // Same origin — nginx (compose) and the vite proxy both forward /api/ws/
    // to the backend with WebSocket upgrade headers.
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/api/ws/events?token=${token}`;

    const connect = () => {
      if (closed) return;
      try {
        ws = new WebSocket(wsUrl);
        ws.onopen = () => setLive(true);
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'leaderboard_update' || data.type === 'challenge_mode') {
              fetchBoard();
            }
          } catch { /* ignore malformed frames */ }
        };
        ws.onclose = () => {
          setLive(false);
          if (!closed) retryTimer = setTimeout(connect, 5000);
        };
        ws.onerror = () => ws?.close();
      } catch { /* WS unavailable — page still works without live updates */ }
    };
    connect();

    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      ws?.close();
    };
  }, [fetchBoard, token]);

  const top3 = useMemo(() => board.slice(0, 3), [board]);
  const rest = useMemo(() => board.slice(3), [board]);
  const leaderScore = board[0]?.score ?? 0;

  return (
    <div className="min-h-screen bg-bg" id="main">
      <AppNav />
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* page head */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link to="/dashboard" className="text-sm font-bold text-primary hover:underline">← Dashboard</Link>
            <h1 className="mt-2 flex items-center gap-3 font-display text-3xl font-bold tracking-tight text-content">
              Leaderboard
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${live ? 'border-success/40 bg-success/10 text-success' : 'border-border bg-surface-2 text-muted'}`}
                title={live ? 'Connected — rankings update live' : 'Reconnecting…'}
              >
                <span className={`h-2 w-2 rounded-full ${live ? 'animate-pulse-glow bg-success' : 'bg-muted'}`} aria-hidden />
                {live ? 'Live' : 'Offline'}
              </span>
            </h1>
            <p className="mt-1 font-medium text-muted">
              Rankings for your group · scores are the sum of best passing attempts.
            </p>
          </div>
          <Tabs
            ariaLabel="Leaderboard scope"
            active={scope}
            onChange={(id) => setScope(id as Scope)}
            items={[
              { id: 'session', label: 'Session' },
              { id: 'all_time', label: 'All-Time' },
            ]}
          />
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-36 w-full" />)}
            </div>
            <Skeleton className="h-72 w-full" />
          </div>
        ) : board.length === 0 ? (
          <EmptyState
            icon={<span className="text-2xl">🏆</span>}
            title="No scores yet"
            description={scope === 'session'
              ? 'Nobody in your group has passed a lab in the current session. Be the first — pass a lab and claim the top spot.'
              : 'The all-time board is empty. Complete labs to put your name on it.'}
            action={<Link to="/dashboard#tracks"><Button variant="primary">Browse learning tracks</Button></Link>}
          />
        ) : (
          <>
            {/* podium */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-label="Top three">
              {top3.map((row, i) => {
                const p = PODIUM[i];
                return (
                  <Card
                    key={row.student_id}
                    glow={i === 0}
                    className={`relative flex flex-col items-center border-2 p-6 text-center ${p.ring} ${i === 1 ? 'sm:mt-6' : ''} ${i === 2 ? 'sm:mt-10' : ''}`}
                  >
                    <span className={`absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${p.chip}`} aria-hidden>
                      {row.rank}
                    </span>
                    <span className="text-3xl" aria-hidden>{p.medal}</span>
                    <p className={`mt-2 max-w-full truncate font-display text-lg font-bold ${row.student_id === user?.id ? 'text-primary' : 'text-content'}`} title={row.name}>
                      {row.name}{row.student_id === user?.id && ' (you)'}
                    </p>
                    <p className={`font-display text-3xl font-black tabular-nums ${p.label}`}>{row.score}</p>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">points</p>
                  </Card>
                );
              })}
            </div>

            {/* full standings (podium already covers ranks 1-3) */}
            {rest.length > 0 && (
              <Card className="overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-2/50 text-left">
                    <th scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted">Rank</th>
                    <th scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted">Student</th>
                    <th scope="col" className="w-[38%] px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rest.map((row) => (
                    <tr
                      key={row.student_id}
                      className={row.student_id === user?.id ? 'bg-primary/10' : 'transition-colors hover:bg-surface-2/40'}
                    >
                      <td className="px-5 py-3">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${rankChip(row.rank)}`}>
                          {row.rank}
                        </span>
                      </td>
                      <td className={`max-w-[240px] truncate px-5 py-3 font-semibold ${row.student_id === user?.id ? 'text-primary' : 'text-content'}`}>
                        {row.name}{row.student_id === user?.id && ' (you)'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            role="meter"
                            aria-valuemin={0}
                            aria-valuemax={leaderScore}
                            aria-valuenow={row.score}
                            aria-label={`${row.name} score`}
                            className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2"
                          >
                            <div
                              className={`h-full rounded-full ${row.student_id === user?.id ? 'bg-primary' : 'bg-muted/60'}`}
                              style={{ width: `${leaderScore > 0 ? Math.max(2, (row.score / leaderScore) * 100) : 0}%` }}
                            />
                          </div>
                          <span className="w-14 text-right font-bold tabular-nums text-content">{row.score}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            )}
            <p className="text-xs font-semibold text-muted">
              Session scores reset each cohort sprint · top 50 shown · rankings update live as labs are graded
            </p>
          </>
        )}
      </div>
    </div>
  );
}
