import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../../api/client';
import { Card, Badge, Button, Input, Skeleton, EmptyState, useToast } from '../../components/ui';
import { CountUp } from '../../components/fx';

interface StudentDetailData {
  id: string;
  full_name: string;
  email: string;
  group_id: string | null;
  group_name?: string | null;
  is_active: boolean;
  subscription_tier: string | null;
  xp: number;
  level: number;
  last_login: string | null;
  created_at?: string;
}

interface SubRow {
  lab_id: string;
  lab_title: string;
  score: number;
  passed: boolean;
  submitted_at: string | null;
}

const PLAN_BADGE = (tier: string | null) =>
  tier === 'pro' ? <Badge variant="accent">Pro</Badge>
    : tier === 'enterprise' ? <Badge variant="primary">Enterprise</Badge>
      : <Badge>Free</Badge>;

/** Cumulative-XP timeline from the student's submissions (SVG, no library). */
const XpTimeline: React.FC<{ subs: SubRow[] }> = ({ subs }) => {
  const ordered = useMemo(() => [...subs]
    .filter((s) => s.submitted_at)
    .sort((a, b) => new Date(a.submitted_at!).getTime() - new Date(b.submitted_at!).getTime()), [subs]);
  if (ordered.length < 2) {
    return <p className="px-6 py-4 text-sm text-muted">Not enough history for a timeline yet.</p>;
  }
  let acc = 0;
  const points = ordered.map((s) => { acc += s.score; return acc; });
  const max = Math.max(1, acc);
  const W = 560;
  const H = 120;
  const step = W / (points.length - 1);
  const path = points.map((v, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${H - (v / max) * (H - 12) - 4}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-28 w-full" role="img" aria-label="XP accumulated over time">
      <path d={`${path} L ${W} ${H} L 0 ${H} Z`} className="fill-primary/15" />
      <motion.path d={path} fill="none" className="stroke-primary" strokeWidth={2}
                   initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9 }} />
    </svg>
  );
};

/** Full student profile: stats + history on the right, actions + danger zone left. */
export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [student, setStudent] = useState<StudentDetailData | null>(null);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [failed, setFailed] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; body: string; action: () => Promise<void> } | null>(null);
  const [xpDelta, setXpDelta] = useState('');
  const [xpReason, setXpReason] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [moveGroupId, setMoveGroupId] = useState('');

  const fetchStudent = async () => {
    try {
      const [sRes, gRes, aRes] = await Promise.all([
        api.get(`/admin/students/${id}`),
        api.get('/admin/groups'),
        api.get('/admin/analytics?days=90').catch(() => null),
      ]);
      setStudent(sRes.data);
      setGroups(gRes.data);
      const mine: SubRow[] = (aRes?.data?.recent ?? [])
        .filter((r: { student_name: string }) => r.student_name === sRes.data.full_name)
        .slice(0, 20);
      setSubs(mine);
    } catch (err) {
      setFailed(true);
    }
  };

  useEffect(() => {
    fetchStudent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (failed || !student) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Link to="/admin/students" className="text-sm font-bold text-primary hover:underline">← Students</Link>
        {failed
          ? <EmptyState icon={<span className="text-2xl">⚠️</span>} title="Couldn't load student" description="The backend didn't respond." action={<Button variant="primary" onClick={fetchStudent}>Retry</Button>} />
          : <Skeleton className="h-96 w-full" />}
      </div>
    );
  }

  const avgScore = subs.length ? Math.round(subs.reduce((s, r) => s + r.score, 0) / subs.length) : 0;
  const labsCompleted = new Set(subs.filter((s) => s.passed).map((s) => s.lab_id)).size;

  const withConfirm = (title: string, body: string, action: () => Promise<void>) =>
    setConfirm({ title, body, action });

  const changePlan = (plan: string) => withConfirm(
    'Change plan',
    `Set ${student.full_name}'s subscription to ${plan}?`,
    async () => {
      await api.patch(`/admin/students/${student.id}/plan`, { plan });
      setStudent({ ...student, subscription_tier: plan });
      toast(`Plan updated to ${plan}.`, 'success');
    },
  );

  const resetPassword = () => withConfirm(
    'Reset password',
    `Generate a new password for ${student.full_name}? They will be forced to set a new one at next login.`,
    async () => {
      await api.post(`/admin/students/${student.id}/reset-password`, { password: newPassword || `Opslance-${Math.random().toString(36).slice(2, 10)}!` });
      setNewPassword('');
      toast('Password reset — the must-reset flow is armed.', 'success');
    },
  );

  const deactivate = () => withConfirm(
    'Deactivate account',
    `${student.full_name} will no longer be able to log in. This can be reversed.`,
    async () => {
      const res = await api.put(`/admin/students/${student.id}`, {
        full_name: student.full_name, email: student.email, is_active: !student.is_active,
      });
      setStudent({ ...student, ...res.data });
      toast(student.is_active ? 'Account deactivated.' : 'Account reactivated.', 'success');
    },
  );

  const adjustXp = () => withConfirm(
    'Adjust XP',
    `Apply ${Number(xpDelta) >= 0 ? '+' : ''}${xpDelta} XP to ${student.full_name}${xpReason ? ` (${xpReason})` : ''}?`,
    async () => {
      const res = await api.post(`/admin/students/${student.id}/points`, { xp: Number(xpDelta), reason: xpReason || null });
      setStudent({ ...student, xp: res.data.xp, level: res.data.level });
      setXpDelta('');
      setXpReason('');
      toast('XP adjusted.', 'success');
    },
  );

  const moveToGroup = () => withConfirm(
    'Move to group',
    `Move ${student.full_name} to ${groups.find((g) => g.id === moveGroupId)?.name ?? 'the selected group'}?`,
    async () => {
      await api.put(`/admin/students/${student.id}`, { full_name: student.full_name, email: student.email, group_id: moveGroupId || null });
      toast('Student moved.', 'success');
      fetchStudent();
    },
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Link to="/admin/students" className="text-sm font-bold text-primary hover:underline">← Students</Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
        {/* left: profile + actions */}
        <div className="space-y-5">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <span aria-hidden className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 font-display text-xl font-black text-primary">
                {student.full_name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <h1 className="truncate font-display text-xl font-bold text-content">{student.full_name}</h1>
                <p className="truncate text-sm font-medium text-muted">{student.email}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              {PLAN_BADGE(student.subscription_tier)}
              {student.is_active ? <Badge variant="success" dot>Active</Badge> : <Badge variant="danger" dot>Inactive</Badge>}
            </div>
            <dl className="mt-4 space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="font-semibold text-muted">Group</dt><dd className="font-bold text-content">{student.group_name ?? '—'}</dd></div>
              <div className="flex justify-between"><dt className="font-semibold text-muted">Last login</dt><dd className="font-bold text-content">{student.last_login ? new Date(student.last_login).toLocaleString() : 'never'}</dd></div>
            </dl>
          </Card>

          <Card className="space-y-3 p-6">
            <h2 className="font-display text-lg font-bold text-content">Subscription</h2>
            <div className="flex flex-wrap gap-2">
              {['free', 'pro', 'enterprise'].map((plan) => (
                <Button key={plan} size="sm"
                        variant={student.subscription_tier === plan ? 'primary' : 'secondary'}
                        onClick={() => student.subscription_tier !== plan && changePlan(plan)}>
                  {plan.charAt(0).toUpperCase() + plan.slice(1)}
                </Button>
              ))}
            </div>
            <h2 className="pt-2 font-display text-lg font-bold text-content">Adjust XP</h2>
            <div className="flex gap-2">
              <Input placeholder="+50 / -20" value={xpDelta} onChange={(e) => setXpDelta(e.target.value)} aria-label="XP delta" className="w-28" />
              <Input placeholder="Reason" value={xpReason} onChange={(e) => setXpReason(e.target.value)} aria-label="Reason" className="flex-1" />
            </div>
            <Button size="sm" variant="secondary" disabled={!xpDelta || isNaN(Number(xpDelta))} onClick={adjustXp}>Apply XP change</Button>

            <h2 className="pt-2 font-display text-lg font-bold text-content">Move group</h2>
            <div className="flex gap-2">
              <select value={moveGroupId} onChange={(e) => setMoveGroupId(e.target.value)} aria-label="Target group"
                      className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-content">
                <option value="">No group</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <Button size="sm" variant="secondary" onClick={moveToGroup}>Move</Button>
            </div>

            <h2 className="pt-2 font-display text-lg font-bold text-content">Reset password</h2>
            <div className="flex gap-2">
              <Input placeholder="New password (blank = generate)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} aria-label="New password" className="flex-1" type="text" />
              <Button size="sm" variant="secondary" onClick={resetPassword}>Reset</Button>
            </div>

            <h2 className="pt-2 font-display text-lg font-bold text-danger">Danger zone</h2>
            <Button variant="danger" size="sm" onClick={deactivate}>
              {student.is_active ? 'Deactivate account' : 'Reactivate account'}
            </Button>
          </Card>
        </div>

        {/* right: stats + history */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'XP', value: student.xp, accent: 'text-primary' },
              { label: 'Level', value: student.level, accent: 'text-accent' },
              { label: 'Labs Completed', value: labsCompleted, accent: 'text-content' },
              { label: 'Avg Score', value: avgScore, accent: 'text-success' },
            ].map((s) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          className="rounded-2xl border border-border bg-surface p-4 text-center shadow-card">
                <CountUp value={s.value} className={`block font-display text-2xl font-black tabular-nums ${s.accent}`} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">{s.label}</span>
              </motion.div>
            ))}
          </div>

          <Card className="p-6">
            <h2 className="font-display text-lg font-bold text-content">XP timeline</h2>
            <XpTimeline subs={subs} />
          </Card>

          <Card className="overflow-hidden p-0">
            <h2 className="border-b border-border px-6 py-4 font-display text-lg font-bold text-content">Submission history</h2>
            {subs.length === 0 ? (
              <p className="px-6 py-8 text-sm font-medium text-muted">No submissions in the last 90 days.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-2/50 text-left">
                    <th scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted">Lab</th>
                    <th scope="col" className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted">Score</th>
                    <th scope="col" className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider text-muted">Passed</th>
                    <th scope="col" className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {subs.map((r, i) => (
                    <tr key={`${r.lab_id}-${i}`} className="transition-colors hover:bg-surface-2/40">
                      <td className="max-w-[280px] truncate px-5 py-3 font-semibold text-content">{r.lab_title}</td>
                      <td className="px-3 py-3 text-right font-bold tabular-nums text-content">{r.score}</td>
                      <td className="px-3 py-3 text-center">{r.passed ? '✅' : '❌'}</td>
                      <td className="px-5 py-3 text-right text-xs font-semibold text-muted">
                        {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      </div>

      {/* confirmation modal */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={confirm.title}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="w-full max-w-md rounded-2xl border border-border bg-surface p-6">
            <h2 className="font-display text-lg font-bold text-content">{confirm.title}</h2>
            <p className="mt-2 text-sm font-medium text-muted">{confirm.body}</p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button>
              <Button variant="accent" onClick={async () => {
                try {
                  await confirm.action();
                } catch (err) {
                  toast('Action failed — check the backend logs.', 'error');
                }
                setConfirm(null);
              }}>Confirm</Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
