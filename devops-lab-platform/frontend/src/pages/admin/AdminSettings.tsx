import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import { Card, Badge, Button, Tabs, Input, Skeleton, EmptyState, useToast } from '../../components/ui';
import { BlurFade, PulseBadge, cn } from '../../components/fx';
import { AlertTriangle, Save, ScrollText } from 'lucide-react';

interface SettingsMeta {
  updated_by: string | null;
  updated_at: string | null;
}

interface SettingsPayload {
  settings: Record<string, unknown>;
  meta: Record<string, SettingsMeta>;
}

interface AuditRow {
  id: string;
  actor_email: string;
  action: string;
  target: string | null;
  detail: Record<string, unknown> | null;
  created_at: string | null;
}

const ACTION_LABEL: Record<string, string> = {
  'settings.update': 'Settings change',
  'student.points': 'XP adjustment',
  'student.plan': 'Plan change',
  'student.reset_password': 'Password reset',
  'environment.kill': 'Environment force-stop',
};

/** Toggle switch bound to a boolean setting. */
const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }> = ({ checked, onChange, label, hint }) => (
  <div className="flex items-center justify-between gap-4 py-1">
    <div>
      <p className="text-sm font-bold text-content">{label}</p>
      {hint && <p className="text-xs font-medium text-muted">{hint}</p>}
    </div>
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
      style={{ background: checked ? 'rgb(var(--c-primary))' : 'rgb(var(--c-surface-2))' }}
    >
      <span
        className="h-5 w-5 rounded-full border border-border bg-surface shadow transition-all"
        style={{ marginLeft: checked ? 22 : 2 }}
      />
    </button>
  </div>
);

const Row: React.FC<{ label: string; hint?: string; meta?: SettingsMeta; children: React.ReactNode }> = ({ label, hint, meta, children }) => (
  <div className="grid grid-cols-1 gap-3 border-b border-border py-4 last:border-b-0 md:grid-cols-[1fr_320px] md:items-center">
    <div>
      <p className="text-sm font-bold text-content">{label}</p>
      {hint && <p className="mt-0.5 text-xs font-medium text-muted">{hint}</p>}
      {meta?.updated_at && (
        <p className="mt-1 text-[11px] font-semibold text-muted">
          Last changed by {meta.updated_by ?? '—'} · {new Date(meta.updated_at).toLocaleString()}
        </p>
      )}
    </div>
    <div className="md:justify-self-end md:w-full">{children}</div>
  </div>
);

/** Admin console settings: general, sessions, security + the audit trail. */
export default function AdminSettings() {
  const { toast } = useToast();
  const [data, setData] = useState<SettingsPayload | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [audit, setAudit] = useState<AuditRow[] | null>(null);

  const fetchData = async () => {
    try {
      const [res, auditRes] = await Promise.all([
        api.get('/admin/settings'),
        api.get('/admin/settings/audit?limit=50').catch(() => null),
      ]);
      setData(res.data);
      setDraft(res.data.settings);
      setAudit(auditRes?.data ?? []);
    } catch (err) {
      setFailed(true);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const dirty = useMemo(() => {
    if (!data) return {} as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(draft)) {
      if (data.settings[k] !== v) out[k] = v;
    }
    return out;
  }, [draft, data]);

  const save = async () => {
    if (Object.keys(dirty).length === 0) return;
    setSaving(true);
    try {
      const res = await api.put('/admin/settings', dirty);
      setData(res.data);
      setDraft(res.data.settings);
      toast(`Saved ${Object.keys(dirty).length} setting${Object.keys(dirty).length === 1 ? '' : 's'}.`, 'success');
      api.get('/admin/settings/audit?limit=50').then((r) => setAudit(r.data)).catch(() => {});
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast(detail || 'Save rejected — check the values.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const set = (key: string, value: unknown) => setDraft((d) => ({ ...d, [key]: value }));

  if (failed) {
    return (
      <EmptyState icon={<span className="text-2xl">⚠️</span>} title="Couldn't load settings"
                  description="The backend didn't respond."
                  action={<Button variant="primary" onClick={fetchData}>Retry</Button>} />
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  const s = draft;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-content">Settings</h1>
          <p className="mt-1 font-medium text-muted">
            Platform-wide configuration — changes take effect immediately and are recorded in the audit log.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {Object.keys(dirty).length > 0 && (
            <Badge variant="warn" dot>{Object.keys(dirty).length} unsaved</Badge>
          )}
          <Button variant="accent" size="sm" onClick={save} disabled={saving || Object.keys(dirty).length === 0}>
            <Save size={14} className="mr-1.5 inline" aria-hidden /> {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>

      {s.maintenance_mode === true && (
        <BlurFade className="flex items-start gap-3 rounded-2xl border border-warn/40 bg-warn/10 p-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warn" aria-hidden />
          <p className="text-sm font-semibold text-content">
            Maintenance mode is <strong>on</strong> — student logins are rejected with a 503 while admins keep full access.
          </p>
        </BlurFade>
      )}

      <Tabs
        ariaLabel="Settings sections"
        active={tab}
        onChange={(id) => setTab(id)}
        items={[
          { id: 'general', label: 'General' },
          { id: 'sessions', label: 'Sessions & Labs' },
          { id: 'security', label: 'Security' },
          { id: 'audit', label: 'Audit log' },
        ]}
      />

      {tab === 'general' && (
        <Card className="px-6 py-2">
          <Row label="Announcement banner" hint="Shown at the top of every student dashboard. Empty = hidden." meta={data.meta.announcement}>
            <Input value={String(s.announcement ?? '')} onChange={(e) => set('announcement', e.target.value)}
                   placeholder="e.g. Mock exam Saturday 10:00 sharp." aria-label="Announcement banner text" maxLength={280} />
          </Row>
          <Row label="Support email" hint="Displayed on the login page so students can ask for help." meta={data.meta.support_email}>
            <Input value={String(s.support_email ?? '')} onChange={(e) => set('support_email', e.target.value)}
                   placeholder="ops@yourdomain.dev" aria-label="Support email" type="email" />
          </Row>
          <Row label="Maintenance mode" hint="Blocks student logins with a friendly 503; admins are never locked out." meta={data.meta.maintenance_mode}>
            <Toggle checked={Boolean(s.maintenance_mode)} onChange={(v) => set('maintenance_mode', v)}
                    label="Enabled" hint="Non-admin logins show: “Platform is under maintenance”." />
          </Row>
        </Card>
      )}

      {tab === 'sessions' && (
        <Card className="px-6 py-2">
          <Row label="Session length — Free tier" hint="Minutes a lab container lives before auto-stop." meta={data.meta.default_session_minutes_free}>
            <Input type="number" min={15} max={480} value={Number(s.default_session_minutes_free ?? 90)}
                   onChange={(e) => set('default_session_minutes_free', Number(e.target.value))}
                   aria-label="Free session minutes" />
          </Row>
          <Row label="Session length — Pro tier" hint="Longer runtime for exam practice." meta={data.meta.default_session_minutes_pro}>
            <Input type="number" min={15} max={480} value={Number(s.default_session_minutes_pro ?? 150)}
                   onChange={(e) => set('default_session_minutes_pro', Number(e.target.value))}
                   aria-label="Pro session minutes" />
          </Row>
          <Row label="Session extension" hint="Minutes added when a student clicks “Extend Session”." meta={data.meta.session_extend_minutes}>
            <Input type="number" min={5} max={120} value={Number(s.session_extend_minutes ?? 30)}
                   onChange={(e) => set('session_extend_minutes', Number(e.target.value))}
                   aria-label="Extension minutes" />
          </Row>
          <Row label="Max concurrent sessions — Free" hint="Free tier is also gated to Module 01 content." meta={data.meta.max_running_sessions_free}>
            <Input type="number" min={1} max={10} value={Number(s.max_running_sessions_free ?? 1)}
                   onChange={(e) => set('max_running_sessions_free', Number(e.target.value))}
                   aria-label="Free concurrent sessions" />
          </Row>
          <Row label="Max concurrent sessions — Pro" hint="Applies to Pro and Enterprise." meta={data.meta.max_running_sessions_pro}>
            <Input type="number" min={1} max={10} value={Number(s.max_running_sessions_pro ?? 3)}
                   onChange={(e) => set('max_running_sessions_pro', Number(e.target.value))}
                   aria-label="Pro concurrent sessions" />
          </Row>
          <Row label="Spawn rate window" hint="Max lab launches per student per 10 minutes — protects the host from container churn." meta={data.meta.spawn_window_limit}>
            <Input type="number" min={1} max={100} value={Number(s.spawn_window_limit ?? 8)}
                   onChange={(e) => set('spawn_window_limit', Number(e.target.value))}
                   aria-label="Spawn window limit" />
          </Row>
        </Card>
      )}

      {tab === 'security' && (
        <Card className="px-6 py-2">
          <Row label="Hints in labs" hint="When off, the hint panel is read-only — reveal buttons are hidden for students." meta={data.meta.hints_allowed}>
            <Toggle checked={Boolean(s.hints_allowed)} onChange={(v) => set('hints_allowed', v)}
                    label="Students can reveal hints" hint="Each hint still costs points when revealed." />
          </Row>
          <div className="border-b border-border py-4 last:border-b-0">
            <p className="text-sm font-bold text-content">Hardened by default</p>
            <p className="mt-1 text-xs font-medium text-muted">
              Secrets are generated at first boot (no fallback keys), admin login is constant-time,
              refresh tokens are denylisted on logout, WebSocket tickets are single-use, and the
              backend never talks to the Docker socket directly — all lab operations go through the
              lab-manager service.
            </p>
          </div>
        </Card>
      )}

      {tab === 'audit' && (
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-content">
              <ScrollText size={16} aria-hidden /> Audit log
            </h2>
            <span className="text-xs font-bold uppercase tracking-wider text-muted">latest {audit?.length ?? 0}</span>
          </div>
          {!audit ? (
            <div className="p-6"><Skeleton className="h-40 w-full" /></div>
          ) : audit.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm font-medium text-muted">Nothing logged yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {audit.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3 px-6 py-3">
                  <Badge variant={a.action === 'environment.kill' ? 'danger' : a.action === 'settings.update' ? 'primary' : 'default'}>
                    {ACTION_LABEL[a.action] ?? a.action}
                  </Badge>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-content">
                    {a.target ?? ''}
                    {a.detail && Object.keys(a.detail).length > 0 && (
                      <span className="ml-2 text-xs font-medium text-muted">
                        {Object.entries(a.detail).map(([k, v]) => `${k}: ${String(v)}`).join(' · ')}
                      </span>
                    )}
                  </span>
                  <span className="text-xs font-semibold text-muted">{a.actor_email}</span>
                  <span className="w-36 text-right text-xs font-semibold text-muted">
                    {a.created_at ? new Date(a.created_at).toLocaleString() : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
