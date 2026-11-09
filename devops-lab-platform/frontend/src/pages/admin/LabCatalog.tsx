import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RefreshCw, ChevronDown } from 'lucide-react';
import { api } from '../../api/client';
import { Badge, Button, Card, EmptyState, Skeleton, useToast } from '../../components/ui';
import { BlurFade, cn } from '../../components/fx';

interface LabRow {
  id: string;
  title: string;
  module_number: number | null;
  module_title?: string | null;
  difficulty: string | null;
  points: number;
  estimated_minutes: number | null;
}

interface CourseGroup {
  key: string;
  label: string;
  blurb: string;
  icon: string;
  match: (lab: LabRow) => boolean;
  accent: string;
}

/** Course buckets — mirror the seeded courses (labs/linux modules 1–15, CKA 21–28). */
const COURSE_GROUPS: CourseGroup[] = [
  {
    key: 'cka',
    label: 'CKA — Certified Kubernetes Administrator',
    blurb: 'Modules 21–28 · the 8-week certification track',
    icon: '🎓',
    match: (l) => (l.module_number ?? 0) >= 21,
    accent: 'text-primary',
  },
  {
    key: 'linux',
    label: 'Linux Fundamentals',
    blurb: 'Modules 1–15 · hands-on system administration',
    icon: '🐧',
    match: (l) => { const m = l.module_number ?? 0; return m >= 1 && m < 21; },
    accent: 'text-success',
  },
  {
    key: 'other',
    label: 'Uncategorized',
    blurb: 'Labs not yet mapped to a course',
    icon: '🧩',
    match: () => true,
    accent: 'text-muted',
  },
];

const DIFF_VARIANT: Record<string, 'success' | 'warn' | 'accent'> = {
  beginner: 'success',
  intermediate: 'warn',
  advanced: 'accent',
};

/** Lab catalog grouped by the course each module belongs to. */
export default function LabCatalog() {
  const { toast } = useToast();
  const [labs, setLabs] = useState<LabRow[] | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const fetchLabs = async () => {
    try {
      const res = await api.get('/admin/labs');
      setLabs(res.data);
    } catch (e) {
      setLabs([]);
    }
  };

  useEffect(() => {
    fetchLabs();
  }, []);

  const groups = useMemo(() => {
    const all = labs ?? [];
    const used = new Set<string>();
    const out: { group: CourseGroup; labs: LabRow[] }[] = [];
    for (const group of COURSE_GROUPS) {
      const rows = all.filter((l) => !used.has(l.id) && group.match(l));
      rows.forEach((l) => used.add(l.id));
      out.push({ group, labs: rows });
    }
    return out;
  }, [labs]);

  const toggleGroup = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await api.post('/admin/labs/sync');
      toast(`Labs synced — ${res.data.added} added, ${res.data.updated} updated.`, 'success');
      fetchLabs();
    } catch (err) {
      toast('Sync failed — make sure labs-repo/ is populated and mounted.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-content">Lab Catalog</h1>
          <p className="mt-1 font-medium text-muted">
            {labs ? `${labs.length} labs across ${COURSE_GROUPS.length - 1} courses` : 'Loading…'} — grouped by the course each module belongs to.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={handleSync} disabled={syncing}>
          <RefreshCw size={14} className={cn('mr-1.5 inline', syncing && 'animate-spin')} aria-hidden />
          {syncing ? 'Syncing…' : 'Sync Labs from Filesystem'}
        </Button>
      </div>

      {!labs ? (
        <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}</div>
      ) : labs.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={<span className="text-2xl">📦</span>}
            title="No labs found"
            description="Run a filesystem sync to import the labs-repo/ modules."
            action={<Button variant="primary" onClick={handleSync}>Sync Labs</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {groups.map(({ group, labs: rows }) => (
            <BlurFade key={group.key}>
              <section aria-label={group.label} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
                {/* group header */}
                <button
                  onClick={() => toggleGroup(group.key)}
                  aria-expanded={!collapsed.has(group.key)}
                  className="flex w-full flex-wrap items-center gap-3 border-b border-border bg-surface-2/50 px-6 py-4 text-left"
                >
                  <span className="text-2xl" aria-hidden>{group.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate font-display text-lg font-bold', group.accent)}>{group.label}</span>
                    <span className="block text-xs font-semibold text-muted">{group.blurb}</span>
                  </span>
                  <Badge variant={rows.length > 0 ? 'primary' : 'default'}>{rows.length} labs</Badge>
                  <ChevronDown size={18} aria-hidden className={cn('text-muted transition-transform', !collapsed.has(group.key) && 'rotate-180')} />
                </button>

                {/* group body */}
                {!collapsed.has(group.key) && (rows.length === 0 ? (
                  <p className="px-6 py-6 text-sm font-medium text-muted">No labs in this course yet.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
                    {rows.map((l, i) => (
                      <motion.div
                        key={l.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: Math.min(0.3, i * 0.04) }}
                        className="group rounded-xl border border-border bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-glow-primary"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-muted">
                            {l.module_number != null ? `M${String(l.module_number).padStart(2, '0')}` : '—'}
                          </span>
                          {l.difficulty && <Badge variant={DIFF_VARIANT[l.difficulty] ?? 'default'}>{l.difficulty}</Badge>}
                        </div>
                        <h3 className="mt-2 line-clamp-2 text-sm font-bold leading-snug text-content" title={l.title}>{l.title}</h3>
                        <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5 text-xs font-bold text-muted">
                          <span className="tabular-nums">⭐ {l.points} pts</span>
                          <span className="tabular-nums">⏱ {l.estimated_minutes ?? '—'} min</span>
                          <Link to={`/labs/${l.id}/run`} className="text-primary opacity-0 transition-opacity group-hover:opacity-100 hover:underline">
                            open →
                          </Link>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ))}
              </section>
            </BlurFade>
          ))}
        </div>
      )}
    </div>
  );
}
