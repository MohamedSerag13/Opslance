import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Badge, Button } from '../../components/ui';
import { cn, useReducedMotion } from '../../components/fx';

/* Interactive preview of the lab runner: a live countdown, per-task panels,
 * a clickable navigator, and a check runner that streams PASS/FAIL lines into
 * the terminal. Purely front-end — no network calls. */

interface Check { text: string; pass: boolean; pct: number }
interface DemoTask {
  title: string;
  context: string;
  weight: number;
  domain: string;
  command: string;
  ack: string;
  checks: Check[];
  hint: string;
}

const TASKS: DemoTask[] = [
  {
    title: 'Create a namespace',
    context: 'k3s-server · ns: default',
    weight: 10,
    domain: 'workloads',
    command: 'kubectl create namespace stage',
    ack: 'namespace/stage created',
    checks: [{ text: 'namespace stage exists', pass: true, pct: 100 }],
    hint: 'Namespaces are top-level resources — kubectl create namespace <name> is all it takes.',
  },
  {
    title: 'Scale a deployment',
    context: 'k3s-server · ns: stage',
    weight: 10,
    domain: 'workloads',
    command: 'kubectl -n stage scale deploy web-dep --replicas=5',
    ack: 'deployment.apps/web-dep scaled',
    checks: [
      { text: 'deployment web-dep exists in stage', pass: true, pct: 35 },
      { text: 'all 5 replicas ready', pass: true, pct: 65 },
    ],
    hint: 'kubectl scale edits .spec.replicas — or patch the deployment directly.',
  },
  {
    title: 'Schedule a pod on the control plane',
    context: 'k3s-server · ns: stage',
    weight: 15,
    domain: 'scheduling',
    command: 'kubectl run cp-pod --image=nginx -n stage --overrides…',
    ack: 'pod/cp-pod created',
    checks: [
      { text: 'toleration for control-plane taint present', pass: true, pct: 50 },
      { text: 'pod Running on node k3s-server', pass: false, pct: 50 },
    ],
    hint: 'The control-plane node is tainted; pods need the matching toleration AND a nodeSelector.',
  },
  {
    title: 'Back up etcd',
    context: 'k3s-server · ns: stage',
    weight: 20,
    domain: 'storage',
    command: 'ETCDCTL_API=3 etcdctl snapshot save /backup/etcd-snap.db',
    ack: 'Snapshot saved at /backup/etcd-snap.db',
    checks: [
      { text: 'snapshot file exists at /backup/etcd-snap.db', pass: true, pct: 60 },
      { text: 'snapshot status reports a valid revision', pass: true, pct: 40 },
    ],
    hint: 'etcdctl needs all three TLS flags — ca.crt, server.crt and server.key — to talk to the endpoint.',
  },
  {
    title: 'Drain a node for maintenance',
    context: 'k3s-agent-1 · ns: stage',
    weight: 15,
    domain: 'troubleshooting',
    command: 'kubectl drain k3s-agent-1 --ignore-daemonsets --delete-emptydir-data',
    ack: 'node/k3s-agent-1 cordoned and drained',
    checks: [
      { text: 'node k3s-agent-1 cordoned (SchedulingDisabled)', pass: true, pct: 50 },
      { text: 'no non-daemonset pods remain on the node', pass: true, pct: 50 },
    ],
    hint: 'A plain drain refuses to touch daemonset pods — that is what --ignore-daemonsets is for.',
  },
];

const fmt = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

const START_SECONDS = 6138; // 01:42:18 — mid-exam feel

/** Task 7 / 40 in the marketing copy ↔ an interactive 5-task demo. */
export const ExamDemo: React.FC = () => {
  const reduce = useReducedMotion();
  const [seconds, setSeconds] = useState(START_SECONDS);
  const [current, setCurrent] = useState(2);
  const [checked, setChecked] = useState<Set<number>>(() => new Set([0, 1]));
  const [flags, setFlags] = useState<Set<number>>(() => new Set([3]));
  const [hints, setHints] = useState<Set<number>>(() => new Set());
  const [lines, setLines] = useState<{ kind: 'cmd' | 'ack' | 'check' | 'score' | 'hint'; text: string; pass?: boolean }[]>([]);
  const [typed, setTyped] = useState('');
  const [running, setRunning] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const task = TASKS[current];
  const total = TASKS.length;

  // countdown — a timer is information, not decoration, so it runs even with
  // reduced motion; the terminal typing below is what gets skipped.
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => clearTimers, []);

  // (re)type the command of the current task into the terminal
  useEffect(() => {
    clearTimers();
    setRunning(false);
    setLines([{ kind: 'ack', text: task.ack }]);
    if (reduce) { setTyped(task.command); return; }
    setTyped('');
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setTyped(task.command.slice(0, i));
      if (i >= task.command.length) clearInterval(id);
    }, 26);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, reduce]);

  const go = (idx: number) => setCurrent(((idx % total) + total) % total);
  const toggle = (set: Set<number>, i: number) => {
    const next = new Set(set);
    if (next.has(i)) next.delete(i); else next.add(i);
    return next;
  };

  const runCheck = () => {
    if (running) return;
    clearTimers();
    setRunning(true);
    const seq: { kind: 'cmd' | 'check' | 'score'; text: string; pass?: boolean }[] = [
      { kind: 'cmd', text: 'verify --task' },
    ];
    task.checks.forEach((c) => seq.push({ kind: 'check', text: `${c.pass ? '✓ PASS' : '✗ FAIL'} [${c.pct}%]: ${c.text}`, pass: c.pass }));
    const pct = Math.round(task.checks.reduce((s, c) => s + (c.pass ? c.pct : 0), 0));
    seq.push({ kind: 'score', text: `SCORE: ${pct}% — ${pct >= 66 ? 'task passed' : 'not yet at the 66% mark'}` });

    setLines([{ kind: 'ack', text: task.ack }]);
    seq.forEach((l, i) => {
      timers.current.push(setTimeout(() => {
        setLines((prev) => [...prev, l]);
        if (i === seq.length - 1) {
          setRunning(false);
          setChecked((prev) => new Set(prev).add(current));
        }
      }, reduce ? 0 : 130 + i * 420));
    });
  };

  const useHint = () => setHints((prev) => new Set(prev).add(current));
  const toggleFlag = () => setFlags((prev) => toggle(prev, current));

  const checkedCount = checked.size;
  const runningScore = useMemo(() => {
    let got = 0, max = 0;
    TASKS.forEach((t, i) => {
      if (checked.has(i)) {
        got += t.checks.reduce((s, c) => s + (c.pass ? c.pct : 0), 0) / 100 * t.weight;
      }
      max += t.weight;
    });
    return { got: Math.round(got), max };
  }, [checked]);

  const navigatorState = (i: number) =>
    i === current ? 'current' : flags.has(i) ? 'flagged' : checked.has(i) ? 'done' : 'todo';

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-glow-primary">
      {/* exam top bar */}
      <div className="flex flex-wrap items-center gap-2.5 border-b border-border bg-surface-2/60 px-5 py-3">
        <Badge variant="danger" dot>
          <span className="tabular-nums" aria-live="off">{fmt(seconds)}</span>
        </Badge>
        <span className="font-mono text-xs text-muted">Task {current + 1} / {total}</span>
        <Badge>weight {task.weight}%</Badge>
        <Badge variant="primary">domain: {task.domain}</Badge>
        <span className="ml-auto hidden items-center gap-2 text-xs font-semibold text-muted sm:flex">
          <span className="tabular-nums text-success">✓ {checkedCount}/{total} checked</span>
          <span className="tabular-nums">· score {runningScore.got}%</span>
        </span>
      </div>

      <div className="grid md:grid-cols-2">
        {/* question panel */}
        <div className="flex flex-col border-b border-border p-6 md:border-b-0 md:border-r">
          <p className="font-mono text-xs text-accent-soft">context: {task.context}</p>
          <h3 className="mt-3 font-display text-base font-bold text-content">
            Task {current + 1} — {task.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {task.hint ? '' : ''}Complete the task against your own k3s cluster. The grader inspects the
            live state — no screenshots, no multiple choice.
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <Button size="sm" onClick={runCheck} disabled={running} aria-label={`Check task ${current + 1}`}>
              {running ? 'Checking…' : '✓ Check my work'}
            </Button>
            <Button size="sm" variant="secondary" onClick={useHint} disabled={hints.has(current)}>
              Hint (−10%)
            </Button>
            <Button
              size="sm" variant="ghost" onClick={toggleFlag}
              aria-pressed={flags.has(current)}
              className={cn(flags.has(current) && 'text-warn')}
            >
              {flags.has(current) ? '⚑ Flagged' : 'Flag ⚑'}
            </Button>
          </div>

          {hints.has(current) && (
            <motion.p
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-xl border border-warn/30 bg-warn/10 p-3 text-xs font-semibold leading-relaxed text-warn"
              role="status"
            >
              💡 {task.hint}
            </motion.p>
          )}

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
            <Button size="sm" variant="ghost" onClick={() => go(current - 1)} aria-label="Previous task">← Prev</Button>
            <span className="font-mono text-[11px] font-semibold text-muted">{current + 1} / {total}</span>
            <Button size="sm" variant="ghost" onClick={() => go(current + 1)} aria-label="Next task">Next →</Button>
          </div>
        </div>

        {/* terminal + navigator */}
        <div className="bg-[#0B1120] p-6">
          <p className="min-h-5 font-mono text-xs text-muted" aria-hidden="true">
            <span className="text-slate-200">student@cka-lab:~$</span> {typed}
            <span className="ml-1 inline-block h-3.5 w-1.5 animate-blink bg-surface-2 align-middle" />
          </p>
          <div className="mt-2 min-h-24 font-mono text-xs leading-5" role="status" aria-live="polite">
            {lines.map((l, i) => (
              l.kind === 'cmd' ? (
                <p key={i} className="text-slate-200">$ {l.text}</p>
              ) : l.kind === 'ack' ? (
                <p key={i} className="text-success">{l.text}</p>
              ) : l.kind === 'check' ? (
                <p key={i} className={l.pass ? 'text-success' : 'text-danger'}>{l.text}</p>
              ) : l.kind === 'hint' ? (
                <p key={i} className="text-warn"># {l.text}</p>
              ) : (
                <p key={i} className="mt-1 font-bold text-slate-200">{l.text}</p>
              )
            ))}
            {lines.length === 1 && !reduce && typed.length < task.command.length && (
              <p className="text-muted">…</p>
            )}
          </div>

          {/* navigator */}
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Navigator</p>
              <p className="text-[11px] font-semibold text-muted">click to jump</p>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {TASKS.map((_, i) => {
                const st = navigatorState(i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => go(i)}
                    aria-label={`Go to task ${i + 1}`}
                    aria-current={i === current ? 'true' : undefined}
                    className={cn(
                      'flex h-7 items-center justify-center rounded text-[11px] font-bold transition-all',
                      st === 'current' && 'bg-primary text-white ring-2 ring-primary/40',
                      st === 'flagged' && 'bg-warn/25 text-warn hover:bg-warn/40',
                      st === 'done' && 'bg-success/25 text-success hover:bg-success/40',
                      st === 'todo' && 'border border-border bg-surface/40 text-muted hover:border-primary/50 hover:text-content',
                    )}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
              <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-success/60" aria-hidden="true" />checked</span>
              <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-warn/70" aria-hidden="true" />flagged</span>
              <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-primary" aria-hidden="true" />current</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamDemo;
