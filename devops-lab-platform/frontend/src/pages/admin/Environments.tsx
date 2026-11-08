import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../../api/client';
import { Badge, Button, Card, Modal, EmptyState, useToast } from '../../components/ui';
import { PulseBadge } from '../../components/fx';

interface EnvRow {
  session_id: string;
  student_name: string;
  lab_title: string;
  started_at: string | null;
  expires_at: string | null;
  container_name: string;
}

function fmtStarted(iso: string | null): string {
  if (!iso) return '—';
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} min ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

/** Live lab environments: 10s auto-refresh, status badges, force stop with confirm. */
export default function Environments() {
  const { toast } = useToast();
  const [envs, setEnvs] = useState<EnvRow[] | null>(null);
  const [killTarget, setKillTarget] = useState<EnvRow | null>(null);
  const [failed, setFailed] = useState(false);

  const fetchEnvs = async () => {
    try {
      const res = await api.get('/admin/environments');
      setEnvs(res.data);
      setFailed(false);
    } catch (e) {
      setFailed(true);
    }
  };

  useEffect(() => {
    fetchEnvs();
    const interval = setInterval(fetchEnvs, 10_000);
    return () => clearInterval(interval);
  }, []);

  const handleKill = async (env: EnvRow) => {
    try {
      await api.delete(`/admin/environments/${env.container_name}`);
      setEnvs((list) => (list ?? []).filter((e) => e.session_id !== env.session_id));
      setKillTarget(null);
      toast(`${env.student_name}'s environment was force-stopped.`, 'success');
    } catch (e) {
      toast('Force stop failed — the container may have already exited.', 'error');
      setKillTarget(null);
    }
  };

  const runningCount = envs?.length ?? 0;
  const oldestMin = (envs ?? []).reduce((max, e) =>
    e.started_at ? Math.max(max, (Date.now() - new Date(e.started_at).getTime()) / 60000) : max, 0);
  const oldestLabel = oldestMin >= 60 ? `${Math.floor(oldestMin / 60)}h ${Math.round(oldestMin % 60)}m` : `${Math.round(oldestMin)}m`;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 font-display text-3xl font-bold tracking-tight text-content">
            Live Environments
            <PulseBadge tone="success" className="translate-y-0.5">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse-glow" aria-hidden />
              Live
            </PulseBadge>
          </h1>
          <p className="mt-1 font-medium text-muted">Currently running lab containers — auto-refreshes every 10 seconds.</p>
        </div>
      </div>

      {/* resource summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5 text-center">
          <p className="font-display text-2xl font-black tabular-nums text-content">{runningCount}</p>
          <p className="text-xs font-bold uppercase tracking-wider text-muted">environments running</p>
        </Card>
        <Card className="p-5 text-center">
          <p className="font-display text-2xl font-black tabular-nums text-content">{new Set((envs ?? []).map((e) => e.student_name)).size}</p>
          <p className="text-xs font-bold uppercase tracking-wider text-muted">students active</p>
        </Card>
        <Card className="p-5 text-center">
          <p className="font-display text-2xl font-black tabular-nums text-content">{runningCount ? oldestLabel : '—'}</p>
          <p className="text-xs font-bold uppercase tracking-wider text-muted">oldest session</p>
        </Card>
      </div>

      {failed ? (
        <EmptyState icon={<span className="text-2xl">⚠️</span>} title="Couldn't load environments"
                    description="The backend didn't respond." action={<Button variant="primary" onClick={fetchEnvs}>Retry</Button>} />
      ) : !envs ? (
        <Card className="p-6"><div className="h-40 animate-pulse rounded-xl bg-surface-2" /></Card>
      ) : (
        <Card className="overflow-hidden p-0">
          {envs.length === 0 ? (
            <p className="px-6 py-14 text-center text-sm font-medium text-muted">No live environments right now — the lab queue is quiet.</p>
          ) : (
            <ul className="divide-y divide-border">
              <AnimatePresence initial={false}>
                {envs.map((e) => (
                  <motion.li
                    key={e.session_id}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 60 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                    className="flex flex-wrap items-center gap-4 px-6 py-4"
                  >
                    <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-black text-primary">
                      {e.student_name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-content">{e.student_name}</span>
                      <span className="block truncate text-xs font-semibold text-muted">{e.lab_title} · <span className="font-mono">{e.container_name}</span></span>
                    </span>
                    <span className="text-xs font-bold tabular-nums text-muted">{fmtStarted(e.started_at)}</span>
                    <Badge variant="success" dot>running</Badge>
                    <Button variant="danger" size="sm" onClick={() => setKillTarget(e)}>Force Stop</Button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </Card>
      )}

      <Modal open={killTarget !== null} onClose={() => setKillTarget(null)} title="Force stop environment" className="max-w-md">
        <p className="text-sm font-medium text-muted">
          Stop <strong className="text-content">{killTarget?.student_name}</strong>'s container
          (<span className="font-mono text-xs">{killTarget?.container_name}</span>)? Unsaved lab work is
          lost and the session is marked <em>killed</em> immediately.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setKillTarget(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => killTarget && handleKill(killTarget)}>Force stop</Button>
        </div>
      </Modal>
    </div>
  );
}
