import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Users, Building2, MonitorSmartphone, Trophy, RefreshCw, Upload, ArrowRight, Square } from 'lucide-react';
import { Card, Button, Modal, useToast } from '../../components/ui';
import { BlurFade } from '../../components/fx';
import StatCard from '../../components/admin/StatCard';
import ActivityChart from '../../components/admin/ActivityChart';
import SubmissionFeed, { type FeedRow } from '../../components/admin/SubmissionFeed';
import LabPerfTable from '../../components/admin/LabPerfTable';

interface EnvRow {
  session_id: string;
  student_name: string;
  lab_title: string;
  started_at: string | null;
  container_name: string;
}

/** Admin console home: KPIs, live activity, environment health, quick actions. */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState({ students: 0, groups: 0, running: 0 });
  const [studentTrend, setStudentTrend] = useState<number[]>([]);
  const [activity, setActivity] = useState<{ label: string; value: number }[]>([]);
  const [labPerf, setLabPerf] = useState<Parameters<typeof LabPerfTable>[0]['rows']>([]);
  const [recent, setRecent] = useState<FeedRow[]>([]);
  const [envs, setEnvs] = useState<EnvRow[]>([]);
  const [topScorer, setTopScorer] = useState({ name: '—', score: 0 });
  const [syncing, setSyncing] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [killTarget, setKillTarget] = useState<EnvRow | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [groupsRes, studentsRes, envsRes, leaderboardRes, analyticsRes] = await Promise.all([
          api.get('/admin/groups'),
          api.get('/admin/students'),
          api.get('/admin/environments'),
          api.get('/gamification/admin/leaderboard').catch(() => ({ data: [] })),
          api.get('/admin/analytics?days=7').catch(() => null),
        ]);
        setStats({
          students: studentsRes.data.length,
          groups: groupsRes.data.length,
          running: envsRes.data.length,
        });
        setEnvs(envsRes.data);
        if (leaderboardRes.data && leaderboardRes.data.length > 0) {
          setTopScorer({
            name: leaderboardRes.data[0].name || '—',
            score: leaderboardRes.data[0].total_score || 0,
          });
        }
        if (analyticsRes) {
          setStudentTrend((analyticsRes.data.daily ?? []).map((d: { signups: number }) => d.signups));
          setActivity((analyticsRes.data.daily ?? []).map((d: { date: string; submissions: number }) => ({ label: d.date, value: d.submissions })));
          const perf = [...(analyticsRes.data.top_labs ?? [])].sort((a: { pass_rate: number }, b: { pass_rate: number }) => b.pass_rate - a.pass_rate);
          setLabPerf(perf);
          setRecent(analyticsRes.data.recent ?? []);
        }
      } catch (err) { /* keep placeholders */ }
    };
    load();
    const feedTimer = setInterval(() => {
      api.get('/admin/analytics?days=7').then((r) => setRecent(r.data.recent ?? [])).catch(() => {});
    }, 30_000);
    return () => clearInterval(feedTimer);
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await api.post('/admin/labs/sync');
      toast(`Labs synced — ${res.data.added} added, ${res.data.updated} updated.`, 'success');
    } catch (err) {
      toast('Sync failed — the backend rejected the request.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleKill = async (env: EnvRow) => {
    try {
      await api.delete(`/admin/environments/${env.container_name}`);
      setEnvs((list) => list.filter((e) => e.session_id !== env.session_id));
      setKillTarget(null);
      toast(`${env.student_name}'s container was force-stopped.`, 'success');
    } catch {
      toast('Force stop failed — the container may have already exited.', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-content">Admin Dashboard</h1>
        <p className="mt-1 font-medium text-muted">Live view of the cohort — students, environments and submissions.</p>
      </div>

      {/* stat cards */}
      <BlurFade className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Users size={18} aria-hidden />} label="Total Students" value={stats.students}
                  sub="enrolled in the platform" sparkValues={studentTrend} />
        <StatCard icon={<Building2 size={18} aria-hidden />} label="Active Groups" value={stats.groups} sub="cohorts" />
        <StatCard icon={<MonitorSmartphone size={18} aria-hidden />} label="Live Lab Environments" value={stats.running}
                  sub="docker containers running now" liveBadge={stats.running > 0 ? 'success' : null} />
        <StatCard icon={<Trophy size={18} aria-hidden />} label="Top Scorer" value={topScorer.name}
                  sub={`${topScorer.score} points`}
                  accent="text-warn" />
      </BlurFade>

      {/* quick actions */}
      <div className="flex flex-wrap gap-3 rounded-2xl border border-border bg-surface-2/50 p-4">
        <Button variant="primary" size="sm" onClick={handleSync} disabled={syncing}>
          <RefreshCw size={14} className="mr-1.5 inline" aria-hidden /> {syncing ? 'Syncing…' : 'Sync Labs'}
        </Button>
        <Button variant="primary" size="sm" onClick={() => setShowImport(true)}>
          <Upload size={14} className="mr-1.5 inline" aria-hidden /> Bulk Import Students
        </Button>
        <Button variant="secondary" size="sm" onClick={() => navigate('/admin/leaderboard')}>
          <Trophy size={14} className="mr-1.5 inline" aria-hidden /> View Leaderboard
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* left column: activity chart + lab performance */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-content">Activity — last 7 days</h2>
              <Link to="/admin/analytics" className="text-xs font-black text-primary hover:underline">Full analytics →</Link>
            </div>
            <ActivityChart data={activity} kind="bars" ariaLabel="Submissions per day, last 7 days" />
          </Card>

          <Card className="overflow-hidden p-0">
            <h2 className="border-b border-border px-6 py-4 font-display text-lg font-bold text-content">
              Lab performance — top by pass rate
            </h2>
            {labPerf.length === 0 ? (
              <p className="px-6 py-8 text-sm font-medium text-muted">No submissions yet.</p>
            ) : (
              <LabPerfTable rows={labPerf} limit={5} linkTo="/labs/:id" />
            )}
          </Card>
        </div>

        {/* right column: submissions feed + env health */}
        <div className="space-y-6">
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-display text-lg font-bold text-content">Recent submissions</h2>
              <span className="text-xs font-bold uppercase tracking-wider text-muted">auto-refresh 30s</span>
            </div>
            {recent.length === 0 ? (
              <p className="px-6 py-8 text-sm font-medium text-muted">Nothing submitted yet.</p>
            ) : (
              <SubmissionFeed rows={recent} limit={10} />
            )}
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-display text-lg font-bold text-content">Environment health</h2>
              <Link to="/admin/environments" className="text-xs font-black text-primary hover:underline">Manage all →</Link>
            </div>
            {envs.length === 0 ? (
              <p className="px-6 py-8 text-sm font-medium text-muted">No containers running.</p>
            ) : (
              <ul className="divide-y divide-border">
                <AnimatePresence initial={false}>
                  {envs.map((e) => (
                    <motion.li
                      key={e.session_id}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 40 }}
                      className="flex flex-wrap items-center gap-3 px-6 py-3.5"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-content">{e.student_name}</span>
                        <span className="block truncate text-xs font-semibold text-muted">{e.lab_title}</span>
                      </span>
                      <span className="text-xs font-semibold tabular-nums text-muted">
                        {e.started_at ? `started ${Math.max(0, Math.round((Date.now() - new Date(e.started_at).getTime()) / 60000))} min ago` : ''}
                      </span>
                      <Button variant="ghost" size="sm" className="text-danger hover:text-danger" onClick={() => setKillTarget(e)}>
                        <Square size={12} className="mr-1 inline" aria-hidden /> Force Stop
                      </Button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </Card>
        </div>
      </div>

      {/* bulk import modal → the full XLSX flow lives on the students page */}
      <Modal open={showImport} onClose={() => setShowImport(false)} title="Bulk import students" className="max-w-md">
        <p className="text-sm font-medium text-muted">
          Upload an XLSX roster (name, email, group, password). The importer creates
          accounts, assigns groups and flags passwords for a forced reset on first login.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setShowImport(false)}>Cancel</Button>
          <Button variant="accent" onClick={() => {
            setShowImport(false);
            navigate('/admin/students?import=1');
          }}>
            Open the importer <ArrowRight size={14} className="ml-1 inline" aria-hidden />
          </Button>
        </div>
      </Modal>

      {/* force stop confirmation */}
      <Modal open={killTarget !== null} onClose={() => setKillTarget(null)} title="Force stop environment" className="max-w-md">
        <p className="text-sm font-medium text-muted">
          Stop <strong className="text-content">{killTarget?.student_name}</strong>'s container
          (<span className="font-mono text-xs">{killTarget?.container_name}</span>)? Unsaved work in the
          lab is lost. The session is marked <em>killed</em> immediately.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setKillTarget(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => killTarget && handleKill(killTarget)}>Force stop</Button>
        </div>
      </Modal>
    </div>
  );
}
