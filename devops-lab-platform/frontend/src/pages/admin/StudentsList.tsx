import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../../api/client';
import { Card, Badge, Button, Input, Skeleton, EmptyState, useToast } from '../../components/ui';
import { cn } from '../../components/fx';
import { Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

interface StudentRow {
  id: string;
  full_name: string;
  email: string;
  group_id: string | null;
  group_name: string | null;
  is_active: boolean;
  subscription_tier: string | null;
  xp: number;
  level: number;
  last_login: string | null;
}

type SortKey = 'name' | 'xp' | 'last_login';

const fmtLogin = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'never';

/** Students roster: filters, sortable columns, bulk selection + actions. */
export default function StudentsList() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useToast();
  const [students, setStudents] = useState<StudentRow[] | null>(null);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [failed, setFailed] = useState(false);

  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('xp');
  const [sortAsc, setSortAsc] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showImport, setShowImport] = useState(params.get('import') === '1');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', password: '', group_id: '', plan: 'free' });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const fetchData = async () => {
    try {
      const [sRes, gRes] = await Promise.all([api.get('/admin/students'), api.get('/admin/groups')]);
      setStudents(sRes.data);
      setGroups(gRes.data);
    } catch (err) {
      setFailed(true);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    if (!students) return [];
    let rows = students;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((s) => s.full_name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
    }
    if (groupFilter) rows = rows.filter((s) => s.group_id === groupFilter);
    if (planFilter) rows = rows.filter((s) => (s.subscription_tier ?? 'free') === planFilter);
    rows.sort((a, b) => {
      const mul = sortAsc ? 1 : -1;
      if (sortKey === 'name') return a.full_name.localeCompare(b.full_name) * mul;
      if (sortKey === 'last_login') {
        return ((a.last_login ? new Date(a.last_login).getTime() : 0) - (b.last_login ? new Date(b.last_login).getTime() : 0)) * mul;
      }
      return (a.xp - b.xp) * mul;
    });
    return rows;
  }, [students, search, groupFilter, planFilter, sortKey, sortAsc]);

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkAction = async (action: 'reset' | 'group' | 'export') => {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (action === 'export') {
      const rows = filtered.filter((s) => selected.has(s.id));
      const ws = XLSX.utils.json_to_sheet(rows.map((s) => ({
        Name: s.full_name, Email: s.email, Group: s.group_name ?? '', Plan: s.subscription_tier ?? 'free',
        XP: s.xp, Level: s.level, LastLogin: s.last_login ?? '',
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'students');
      XLSX.writeFile(wb, 'opslance-students.xlsx');
      return;
    }
    if (action === 'group') {
      const target = window.prompt(`Move ${ids.length} students to which group?`, groups[0]?.name ?? '');
      const group = groups.find((g) => g.name === target);
      if (!group) return;
      setBulkBusy(true);
      try {
        await Promise.all(ids.map((id) => api.put(`/admin/students/${id}`, { group_id: group.id })));
        toast(`${ids.length} students moved to ${group.name}.`, 'success');
        setSelected(new Set());
        fetchData();
      } catch {
        toast('Group move failed.', 'error');
      } finally {
        setBulkBusy(false);
      }
      return;
    }
    // reset passwords: hand out fresh ones; the must-reset flow kicks in at login
    setBulkBusy(true);
    try {
      let done = 0;
      for (const id of ids) {
        try {
          await api.post(`/admin/students/${id}/reset-password`, { password: `Opslance-${Math.random().toString(36).slice(2, 10)}!` });
          done += 1;
        } catch { /* per-row failures don't stop the batch */ }
      }
      toast(`${done}/${ids.length} passwords reset — students must set a new one at next login.`, 'success');
      setSelected(new Set());
    } finally {
      setBulkBusy(false);
    }
  };

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const formValid = form.full_name.trim().length >= 2 && emailOk && form.password.length >= 8;

  const createStudent = async () => {
    if (!formValid) return;
    setCreating(true);
    try {
      await api.post('/admin/students', {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        group_id: form.group_id || null,
        is_active: true,
      });
      if (form.plan !== 'free') {
        const created = (await api.get('/admin/students')).data.find(
          (s2: StudentRow) => s2.email === form.email.trim());
        if (created) {
          await api.patch(`/admin/students/${created.id}/plan`, { plan: form.plan });
        }
      }
      toast(`${form.full_name.trim()} added — they'll be asked to change the password at first login.`, 'success');
      setShowCreate(false);
      setForm({ full_name: '', email: '', password: '', group_id: '', plan: 'free' });
      fetchData();
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast(detail || 'Could not create the student — is the email already registered?', 'error');
    } finally {
      setCreating(false);
    }
  };

  const runImport = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const form = new FormData();
      form.append('file', importFile);
      await api.post('/admin/students/bulk', form);
      toast('Roster imported — new students must reset their password at first login.', 'success');
      setShowImport(false);
      setImportFile(null);
      fetchData();
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast(detail || 'Import failed — is the file a valid .xlsx roster?', 'error');
    } finally {
      setImporting(false);
    }
  };

  if (failed) {
    return (
      <EmptyState
        icon={<span className="text-2xl">⚠️</span>}
        title="Couldn't load students"
        description="The backend didn't respond."
        action={<Button variant="primary" onClick={fetchData}>Retry</Button>}
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-content">Students</h1>
          <p className="mt-1 font-medium text-muted">{students ? `${students.length} accounts` : 'Loading…'} — click a row for the full profile.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="accent" size="sm" onClick={() => setShowCreate(true)}>+ Add Student</Button>
          <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}>
            <Upload size={14} className="mr-1.5 inline" aria-hidden /> Import XLSX
          </Button>
        </div>
      </div>

      {/* filter bar */}
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <Input
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search students"
          className="w-56"
        />
        <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} aria-label="Filter by group"
                className="rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-content">
          <option value="">All groups</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} aria-label="Filter by plan"
                className="rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-content">
          <option value="">All plans</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} aria-label="Sort by"
                className="rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-content">
          <option value="xp">Sort: XP</option>
          <option value="name">Sort: Name</option>
          <option value="last_login">Sort: Last login</option>
        </select>
        <button onClick={() => setSortAsc((a) => !a)} className="text-sm font-bold text-muted hover:text-content" aria-label="Toggle sort direction">
          {sortAsc ? '↑ asc' : '↓ desc'}
        </button>
      </Card>

      {!students ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2/50 text-left">
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" aria-label="Select all"
                         checked={selected.size > 0 && selected.size === filtered.length}
                         onChange={(e) => setSelected(e.target.checked ? new Set(filtered.map((s) => s.id)) : new Set())} />
                </th>
                <th className="cursor-pointer px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted hover:text-content"
                    onClick={() => { setSortKey('name'); setSortAsc(sortKey === 'name' ? !sortAsc : true); }}>
                  Student {sortKey === 'name' && (sortAsc ? '↑' : '↓')}
                </th>
                <th className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-muted">Group</th>
                <th className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-muted">Plan</th>
                <th className="cursor-pointer px-3 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted hover:text-content"
                    onClick={() => { setSortKey('xp'); setSortAsc(sortKey === 'xp' ? !sortAsc : false); }}>
                  XP / Level {sortKey === 'xp' && (sortAsc ? '↑' : '↓')}
                </th>
                <th className="cursor-pointer px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted hover:text-content"
                    onClick={() => { setSortKey('last_login'); setSortAsc(sortKey === 'last_login' ? !sortAsc : false); }}>
                  Last login {sortKey === 'last_login' && (sortAsc ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((s) => (
                <tr key={s.id}
                    onClick={() => navigate(`/admin/students/${s.id}`)}
                    className={cn('cursor-pointer transition-colors hover:bg-surface-2/40', selected.has(s.id) && 'bg-primary/10')}>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" aria-label={`Select ${s.full_name}`}
                           checked={selected.has(s.id)} onChange={() => toggleRow(s.id)} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-3">
                      <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-black text-primary">
                        {s.full_name.charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-content">{s.full_name}</span>
                        <span className="block truncate text-xs font-semibold text-muted">{s.email}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-3 text-content">{s.group_name ?? '—'}</td>
                  <td className="px-3 py-3">
                    {s.subscription_tier === 'pro'
                      ? <Badge variant="accent">Pro</Badge>
                      : s.subscription_tier === 'enterprise'
                        ? <Badge variant="primary">Enterprise</Badge>
                        : <Badge>Free</Badge>}
                  </td>
                  <td className="px-3 py-3 text-right font-bold tabular-nums text-content">{s.xp} <span className="text-xs font-semibold text-muted">· L{s.level}</span></td>
                  <td className="px-4 py-3 text-right text-xs font-semibold text-muted">{fmtLogin(s.last_login)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-muted">No students match the filters.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      {/* bulk actions bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed inset-x-6 bottom-20 z-40 mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card md:bottom-6"
            role="toolbar"
            aria-label="Bulk actions"
          >
            <span className="text-sm font-bold text-content">{selected.size} selected</span>
            <span className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" disabled={bulkBusy} onClick={() => bulkAction('reset')}>Reset passwords</Button>
              <Button variant="secondary" size="sm" disabled={bulkBusy} onClick={() => bulkAction('group')}>Change group</Button>
              <Button variant="secondary" size="sm" onClick={() => bulkAction('export')}>Export</Button>
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Clear</Button>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* add-student modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
                        className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-card">
              <h2 className="font-display text-lg font-bold text-content">Add a student</h2>
              <p className="mt-1 text-sm font-medium text-muted">
                Creates the account immediately. The student must set a new password at first login.
              </p>
              <div className="mt-4 space-y-3">
                <Input placeholder="Full name" value={form.full_name}
                       onChange={(e) => setForm({ ...form, full_name: e.target.value })} aria-label="Full name" />
                <Input placeholder="Email address" type="email" value={form.email}
                       onChange={(e) => setForm({ ...form, email: e.target.value })} aria-label="Email address" />
                <Input placeholder="Initial password (min 8 chars)" value={form.password}
                       onChange={(e) => setForm({ ...form, password: e.target.value })} aria-label="Initial password" />
                <div className="flex gap-3">
                  <select value={form.group_id} onChange={(e) => setForm({ ...form, group_id: e.target.value })}
                          aria-label="Group" className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-content">
                    <option value="">No group</option>
                    {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                  <select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}
                          aria-label="Subscription plan" className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-content">
                    <option value="free">Free plan</option>
                    <option value="pro">Pro plan</option>
                    <option value="enterprise">Enterprise plan</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button variant="accent" disabled={!formValid || creating} onClick={createStudent}>
                  {creating ? 'Creating…' : 'Create student'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* XLSX import modal */}
      <AnimatePresence>
        {showImport && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="w-full max-w-md rounded-2xl border border-border bg-surface p-6">
              <h2 className="font-display text-lg font-bold text-content">Bulk import students</h2>
              <p className="mt-2 text-sm font-medium text-muted">
                Upload an .xlsx roster with columns: <strong className="text-content">full_name, email, group_name, password</strong>.
                New students must reset their password at first login.
              </p>
              <input
                type="file"
                accept=".xlsx,.xls"
                aria-label="Roster file"
                onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                className="mt-4 block w-full rounded-xl border border-border bg-surface-2 p-2.5 text-sm text-content file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-white"
              />
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowImport(false)}>Cancel</Button>
                <Button variant="accent" disabled={!importFile || importing} onClick={runImport}>
                  {importing ? 'Importing…' : 'Import'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
