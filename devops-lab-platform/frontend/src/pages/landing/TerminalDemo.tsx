import React, { useEffect, useMemo, useRef, useState } from 'react';

interface Line { text: string; cls?: string; pause?: number }

const SCRIPT: Line[] = [
  { text: '$ kubectl config use-context k3s-server', cls: 'text-accent-soft' },
  { text: 'Switched to context "k3s-server".', cls: 'text-muted' },
  { text: '$ k get pods -n stage', cls: 'text-accent-soft' },
  { text: 'NAME        READY   STATUS    AGE', cls: 'text-muted' },
  { text: 'web-pod     1/1     Running   12s', cls: 'text-success' },
  { text: 'env-demo    1/1     Running   8s', cls: 'text-success' },
  { text: '$ k run res-demo --image=nginx:1.27 --dry-run=client -o yaml', cls: 'text-accent-soft' },
  { text: 'pod/res-demo created (dry run) ✓', cls: 'text-success' },
  { text: '$ /check', cls: 'text-accent-soft' },
  { text: '✅ PASS [10%]: Pod res-demo requests cpu=100m memory=128Mi', cls: 'text-success', pause: 500 },
  { text: '✅ PASS [10%]: Deployment web-dep scaled to 5 replicas', cls: 'text-success', pause: 500 },
  { text: 'SCORE: 100/100 — 🎉 Lab passed!', cls: 'text-success font-bold', pause: 2600 },
];

/** Looping, typewriter-driven terminal demo for the hero. Pauses for
 *  prefers-reduced-motion users (renders the finished transcript). */
const TerminalDemo: React.FC<{ className?: string }> = ({ className = '' }) => {
  const reduced = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (reduced) return;
    const line = SCRIPT[lineIdx];
    const done = charIdx >= line.text.length;
    const delay = done ? (line.pause ?? 260) : 16 + Math.random() * 26;

    timer.current = window.setTimeout(() => {
      if (done) {
        if (lineIdx === SCRIPT.length - 1) {
          setLineIdx(0);
          setCharIdx(0);
        } else {
          setLineIdx((i) => i + 1);
          setCharIdx(0);
        }
      } else {
        setCharIdx((c) => c + 1);
      }
    }, delay);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [lineIdx, charIdx, reduced]);

  const visible = reduced ? SCRIPT : SCRIPT.slice(0, lineIdx + 1);
  const currentTyped = reduced ? SCRIPT[SCRIPT.length - 1].text : SCRIPT[lineIdx].text.slice(0, charIdx);

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-border bg-[#0B1120] shadow-glow-primary ${className}`}
      role="img"
      aria-label="Demo terminal showing a Kubernetes lab being solved and graded live"
    >
      {/* title bar */}
      <div className="flex items-center gap-2 border-b border-border/70 bg-surface/[0.03] px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-[#FF5F57]" aria-hidden="true" />
        <span className="h-3 w-3 rounded-full bg-[#FEBC2E]" aria-hidden="true" />
        <span className="h-3 w-3 rounded-full bg-[#28C840]" aria-hidden="true" />
        <span className="ml-3 font-mono text-xs text-muted">cka-w1-lab-01 — lab@ops lance</span>
        <span className="ml-auto flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-success">
          <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-success" aria-hidden="true" />
          cluster ready
        </span>
      </div>
      {/* body */}
      <div className="h-[320px] overflow-hidden p-5 font-mono text-[13px] leading-relaxed">
        {visible.map((l, i) => {
          const isCurrent = i === visible.length - 1 && !reduced;
          const text = isCurrent ? currentTyped : l.text;
          return (
            <p key={i} className={`whitespace-pre-wrap ${l.cls ?? 'text-slate-200'}`}>
              {text}
              {isCurrent && <span className="ml-0.5 inline-block h-4 w-2 animate-blink bg-surface-2 align-middle" aria-hidden="true" />}
            </p>
          );
        })}
      </div>
    </div>
  );
};

export default TerminalDemo;
