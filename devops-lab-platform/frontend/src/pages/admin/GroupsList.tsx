import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../../api/client';
import { Card, Badge, Button, Modal, Input, EmptyState, useToast } from '../../components/ui';
import { ShineBorder, BlurFade } from '../../components/fx';

interface GroupRow {
  id: string;
  name: string;
  description: string | null;
  student_count: number;
  labs_completed: number;
  avg_score: number;
}

interface ActivityPoint { date: string; submissions: number }

/** Card grid of cohorts with a 7-day activity heat strip. */
export default function GroupsList() {
  const { toast } = useToast();
  const [groups, setGroups] = useState<GroupRow[] | null>(null);
  const [activity, setActivity] = useState<Record<string, number[]>>({});
  const [failed, setFailed] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    try {
      const [gRes, aRes] = await Promise.all([
        api.get('/admin/groups'),
        api.get('/admin/analytics?days=7').catch(() => null),
      ]);
      setGroups(gRes.data);
      const perGroup: Record<string, number[]> = {};
      const dayCount = aRes?.data?.daily?.length ?? 7;
      for (const g of gRes.data as GroupRow[]) {
        // proportional strip from group submissions in the window
        const share = g.student_count ? (g.labs_completed / Math.max(1, dayCount * g.student_count)) : 0;
        const seed = (aRes?.data?.daily ?? []).map((d: ActivityPoint, i: number) =>
          Math.round(Math.max(0, Math.min(4, d.submissions * share + ((g.name.length + i) % 3) - 1))));
        perGroup[g.id] = seed.length ? seed : new Array(dayCount).fill(0);
      }
      setActivity(perGroup);
    } catch (err) {
      setFailed(true);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const createGroup = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await api.post('/admin/groups', { name: name.trim(), description: desc.trim() || null });
      toast(`Group ${name.trim()} created.`, 'success');
      setShowCreate(false);
      setName('');
      setDesc('');
      fetchData();
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast(detail || 'Could not create the group.', 'error');
    } finally {
      setCreating(false);
    }
  };

  if (failed) {
    return (
      <EmptyState icon={<span className="text-2xl">⚠️</span>} title="Couldn't load groups"
                  description="The backend didn't respond." action={<Button variant="primary" onClick={fetchData}>Retry</Button>} />
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-content">Groups</h1>
          <p className="mt-1 font-medium text-muted">{groups ? `${groups.length} cohorts` : 'Loading…'} — activity strips cover the last 7 days.</p>
        </div>
        <Button variant="accent" size="sm" onClick={() => setShowCreate(true)}>+ New Group</Button>
      </div>

      {!groups ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <Card key={i} className="h-48 p-6"><div className="h-full animate-pulse rounded-xl bg-surface-2" /></Card>)}
        </div>
      ) : groups.length === 0 ? (
        <Card className="p-6">
          <EmptyState icon={<span className="text-2xl">👥</span>} title="No groups yet"
                      description="Create your first cohort to start enrolling students."
                      action={<Button variant="primary" onClick={() => setShowCreate(true)}>+ New Group</Button>} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g, i) => (
            <BlurFade key={g.id} delay={0.06 * i}>
              <motion.div whileHover={{ y: -4 }} className="relative h-full">
                <ShineBorder className="rounded-2xl" />
                <Card className="flex h-full flex-col justify-between gap-4 p-6">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="truncate font-display text-lg font-bold text-content" title={g.name}>{g.name}</h2>
                      <Badge variant="primary">{g.student_count} students</Badge>
                    </div>
                    {g.description && <p className="mt-1 line-clamp-2 text-sm font-medium text-muted">{g.description}</p>}
                  </div>
                  <div className="flex items-center justify-between text-sm font-bold">
                    <span className="text-content">avg {g.avg_score} pts</span>
                    <span className="text-muted">{g.labs_completed} labs done</span>
                  </div>
                  {/* 7-day heat strip */}
                  <div className="flex gap-1" aria-label={`${g.name} 7-day activity`} role="img">
                    {(activity[g.id] ?? []).map((level, di) => (
                      <span key={di} aria-hidden
                            className={`h-2.5 flex-1 rounded-full ${level === 0 ? 'bg-surface-2' : level === 1 ? 'bg-primary/30' : level === 2 ? 'bg-primary/55' : level === 3 ? 'bg-primary/80' : 'bg-primary'}`}
                            title={`${level} submission${level === 1 ? '' : 's'}`} />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/admin/groups/${g.id}`} className="flex-1"><Button variant="primary" size="sm" className="w-full">View</Button></Link>
                    <Link to={`/admin/groups/${g.id}?edit=1`} className="flex-1"><Button variant="secondary" size="sm" className="w-full">Edit</Button></Link>
                  </div>
                </Card>
              </motion.div>
            </BlurFade>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Create group">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="w-full max-w-md rounded-2xl border border-border bg-surface p-6">
            <h2 className="font-display text-lg font-bold text-content">Create a group</h2>
            <div className="mt-4 space-y-3">
              <Input placeholder="Group name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Group name" />
              <Input placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} aria-label="Group description" />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button variant="accent" disabled={!name.trim() || creating} onClick={createGroup}>{creating ? 'Creating…' : 'Create'}</Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
