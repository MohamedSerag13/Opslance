import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../../api/client';
import { Card, Badge, Button, Tabs, Modal, Input, Skeleton, EmptyState, useToast } from '../../components/ui';
import { cn } from '../../components/fx';

interface GroupInfo {
  id: string;
  name: string;
  description: string | null;
}

interface StudentRow {
  id: string;
  full_name: string;
  email: string;
  xp: number;
  level: number;
  is_active: boolean;
}

interface GroupLab {
  lab_id: string;
  title: string;
  module_number: number | null;
  is_visible: boolean;
  unlock_order: number;
  points?: number;
}

/** Cohort console: Students / Labs (drag-to-reorder) / Analytics tabs. */
export default function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const { toast } = useToast();
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [students, setStudents] = useState<StudentRow[] | null>(null);
  const [labs, setLabs] = useState<GroupLab[] | null>(null);
  const [challengeMode, setChallengeMode] = useState(false);
  const [tab, setTab] = useState('students');
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState(params.get('edit') === '1');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const dragOverIdx = useRef<number | null>(null);

  const fetchData = async () => {
    try {
      const [gRes, sRes, lRes, cRes] = await Promise.all([
        api.get(`/admin/groups/${id}`),
        api.get(`/admin/students?group_id=${id}`),
        api.get(`/admin/groups/${id}/labs`),
        api.get(`/gamification/challenge_mode/${id}`).catch(() => ({ data: { active: false } })),
      ]);
      setGroup(gRes.data);
      setName(gRes.data.name);
      setDesc(gRes.data.description ?? '');
      setStudents(sRes.data);
      setLabs(lRes.data);
      setChallengeMode(Boolean(cRes.data.active ?? cRes.data));
    } catch (err) {
      setFailed(true);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const rankedStudents = useMemo(
    () => [...(students ?? [])].sort((a, b) => b.xp - a.xp),
    [students],
  );

  const toggleVisibility = async (lab: GroupLab) => {
    if (!labs) return;
    setLabs(labs.map((l) => (l.lab_id === lab.lab_id ? { ...l, is_visible: !l.is_visible } : l)));
    try {
      await api.put(`/admin/groups/${id}/labs/${lab.lab_id}`, {
        is_visible: !lab.is_visible, unlock_order: lab.unlock_order,
      });
    } catch {
      setLabs(labs); // roll back
      toast('Could not update visibility.', 'error');
    }
  };

  const commitOrder = async () => {
    if (!labs) return;
    try {
      await api.post(`/admin/groups/${id}/labs/reorder`, { lab_ids: labs.map((l) => l.lab_id) });
      toast('Lab order saved.', 'success');
    } catch {
      toast('Reorder failed.', 'error');
    }
  };

  const handleDrop = (targetIdx: number) => {
    if (!labs || !dragId) return;
    const from = labs.findIndex((l) => l.lab_id === dragId);
    if (from < 0 || from === targetIdx) return;
    const next = [...labs];
    const [moved] = next.splice(from, 1);
    next.splice(targetIdx, 0, moved);
    setLabs(next.map((l, i) => ({ ...l, unlock_order: i })));
    dragOverIdx.current = null;
  };

  const saveEdit = async () => {
    try {
      await api.put(`/admin/groups/${id}`, { name: name.trim(), description: desc.trim() || null });
      setGroup({ ...group!, name: name.trim(), description: desc.trim() || null });
      setEditing(false);
      toast('Group updated.', 'success');
    } catch {
      toast('Update failed.', 'error');
    }
  };

  const removeStudent = (s: StudentRow) => {
    if (!window.confirm(`Remove ${s.full_name} from ${group?.name}?`)) return;
    api.put(`/admin/students/${s.id}`, { full_name: s.full_name, email: s.email, group_id: null })
      .then(() => {
        toast(`${s.full_name} removed from the group.`, 'success');
        fetchData();
      })
      .catch(() => toast('Remove failed.', 'error'));
  };

  if (failed || !group) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Link to="/admin/groups" className="text-sm font-bold text-primary hover:underline">← Groups</Link>
        {failed
          ? <EmptyState icon={<span className="text-2xl">⚠️</span>} title="Couldn't load group" description="The backend didn't respond." action={<Button variant="primary" onClick={fetchData}>Retry</Button>} />
          : <Skeleton className="h-96 w-full" />}
      </div>
    );
  }

  const visibleCount = labs?.filter((l) => l.is_visible).length ?? 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Link to="/admin/groups" className="text-sm font-bold text-primary hover:underline">← Groups</Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-content">{group.name}</h1>
          <p className="mt-1 font-medium text-muted">
            {students?.length ?? '…'} students · {visibleCount}/{labs?.length ?? 0} labs visible
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" variant={challengeMode ? 'accent' : 'secondary'}
                  onClick={() => api.post(`/gamification/challenge_mode?active=${!challengeMode}&group_id=${id}`)
                    .then(() => { setChallengeMode(!challengeMode); toast(`Challenge mode ${!challengeMode ? 'on' : 'off'}.`, 'success'); })}>
            ⚔️ Challenge mode {challengeMode ? 'ON' : 'OFF'}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Edit name</Button>
        </div>
      </div>

      <Tabs
        ariaLabel="Group sections"
        active={tab}
        onChange={(id2) => setTab(id2)}
        items={[
          { id: 'students', label: 'Students' },
          { id: 'labs', label: 'Labs' },
          { id: 'analytics', label: 'Analytics' },
        ]}
      />

      {tab === 'students' && (
        <Card className="overflow-hidden p-0">
          {!students ? (
            <div className="space-y-2 p-6">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : rankedStudents.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted">No students in this group yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2/50 text-left">
                  <th scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted">#</th>
                  <th scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted">Student</th>
                  <th scope="col" className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted">XP</th>
                  <th scope="col" className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rankedStudents.map((s, i) => (
                  <tr key={s.id} className="transition-colors hover:bg-surface-2/40">
                    <td className="px-5 py-3 font-black text-muted">{i + 1}</td>
                    <td className="px-5 py-3">
                      <Link to={`/admin/students/${s.id}`} className="font-semibold text-content hover:text-primary hover:underline">{s.full_name}</Link>
                      <span className="block text-xs font-semibold text-muted">{s.email}</span>
                    </td>
                    <td className="px-3 py-3 text-right font-bold tabular-nums text-content">{s.xp} <span className="text-xs text-muted">· L{s.level}</span></td>
                    <td className="px-5 py-3 text-right">
                      <Button size="sm" variant="ghost" className="text-danger hover:text-danger" onClick={() => removeStudent(s)}>Remove</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {tab === 'labs' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-muted">Drag rows to set the unlock order — toggles control visibility.</p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => api.post(`/admin/groups/${id}/labs/show-all`).then(fetchData)}>Show all</Button>
              <Button size="sm" variant="secondary" onClick={() => api.post(`/admin/groups/${id}/labs/hide-all`).then(fetchData)}>Hide all</Button>
              <Button size="sm" variant="accent" onClick={commitOrder}>Save order</Button>
            </div>
          </div>
          <Card className="overflow-hidden p-0">
            {!labs ? (
              <div className="space-y-2 p-6">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : labs.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-muted">No labs assigned to this group.</p>
            ) : (
              <ul className="divide-y divide-border">
                {labs.map((l, idx) => (
                  <li
                    key={l.lab_id}
                    draggable
                    onDragStart={() => setDragId(l.lab_id)}
                    onDragOver={(e) => { e.preventDefault(); dragOverIdx.current = idx; }}
                    onDrop={() => handleDrop(idx)}
                    onDragEnd={() => { setDragId(null); dragOverIdx.current = null; }}
                    className={cn('flex cursor-grab items-center gap-4 px-5 py-3.5 transition-colors',
                      dragId === l.lab_id ? 'opacity-40' : 'hover:bg-surface-2/40',
                      dragOverIdx.current === idx && dragId && dragId !== l.lab_id && 'border-t-2 border-primary')}
                  >
                    <span aria-hidden className="text-muted">⠿</span>
                    <span className="w-8 text-center font-black text-muted">{idx + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-content">{l.title}</span>
                      <span className="text-xs font-semibold text-muted">{l.module_number != null ? `Module ${l.module_number}` : ''}</span>
                    </span>
                    <span className="text-xs font-bold tabular-nums text-muted">{l.points ?? '—'} pts</span>
                    {/* animated visibility toggle */}
                    <button
                      role="switch"
                      aria-checked={l.is_visible}
                      aria-label={`${l.is_visible ? 'Hide' : 'Show'} ${l.title}`}
                      onClick={() => toggleVisibility(l)}
                      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                      style={{ background: l.is_visible ? 'rgb(var(--c-primary))' : 'rgb(var(--c-surface-2))' }}
                    >
                      <motion.span
                        layout
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="h-5 w-5 rounded-full border border-border bg-surface shadow"
                        style={{ marginLeft: l.is_visible ? 22 : 2 }}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {tab === 'analytics' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="font-display text-lg font-bold text-content">Group at a glance</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="font-semibold text-muted">Students</dt><dd className="font-bold text-content">{students?.length ?? 0}</dd></div>
              <div className="flex justify-between"><dt className="font-semibold text-muted">Top XP</dt><dd className="font-bold text-content">{rankedStudents[0]?.xp ?? 0} ({rankedStudents[0]?.full_name ?? '—'})</dd></div>
              <div className="flex justify-between"><dt className="font-semibold text-muted">Avg XP</dt><dd className="font-bold text-content">{rankedStudents.length ? Math.round(rankedStudents.reduce((s, x) => s + x.xp, 0) / rankedStudents.length) : 0}</dd></div>
              <div className="flex justify-between"><dt className="font-semibold text-muted">Visible labs</dt><dd className="font-bold text-content">{visibleCount} of {labs?.length ?? 0}</dd></div>
              <div className="flex justify-between"><dt className="font-semibold text-muted">Challenge mode</dt><dd className="font-bold text-content">{challengeMode ? 'on' : 'off'}</dd></div>
            </dl>
          </Card>
          <Card className="p-6">
            <h2 className="font-display text-lg font-bold text-content">Per-lab completion</h2>
            {labs && labs.length > 0 ? (
              <div className="mt-4 space-y-3">
                {labs.filter((l) => l.is_visible).slice(0, 8).map((l) => {
                  const done = students?.length
                    ? Math.round(100 * Math.min(1, (l.points ?? 0) / 100))
                    : 0;
                  void done;
                  return (
                    <div key={l.lab_id}>
                      <div className="mb-1 flex justify-between text-xs font-bold">
                        <span className="truncate text-content">{l.title}</span>
                        <span className="text-muted">{l.points ?? '—'} pts</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                        <motion.div
                          className="h-full rounded-full bg-primary"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (l.points ?? 0))}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>
                  );
                })}
                <p className="pt-1 text-xs font-semibold text-muted">
                  Per-student completion rates live in <Link className="text-primary hover:underline" to="/admin/analytics">Analytics → lab performance</Link>.
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted">No labs yet.</p>
            )}
          </Card>
        </div>
      )}

      {editing && (
        <Modal open onClose={() => setEditing(false)} title="Edit group" className="max-w-md">
          <div className="space-y-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} aria-label="Group name" placeholder="Group name" />
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} aria-label="Group description" placeholder="Description (optional)" />
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            <Button variant="accent" onClick={saveEdit}>Save</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
